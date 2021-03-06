import { inputs } from "actions-inputs";
import execa from "execa";
import fs from "fs";
import path from "path";
import scanDir from "scan-dir-recursive/promise/relative";

import core from "@actions/core";
import { parse as porcelainParse } from "@putout/git-status-porcelain";

import { getListFromInput } from "./util";

interface RepoInfo {
    valid: true;
    /**
     * username/repo
     */
    slug: string;
    /**
     * path in repo
     */
    path: string;
    branch: string;
}

/**
 * Already logs errors
 */
export const getRepoInfo = (repoFullPath: string): RepoInfo | { valid: false; } => {
    try {
        // todo fix regex https://regex101.com/r/wa2CvK/3. implement path
        const match = repoFullPath.match(/^(?<slug>.+\/[^#]+)(#(?<branch>.+))?$/,) || (() => {
            throw new Error("Invalid path, check here: https://regex101.com/r/wa2CvK/2/");
        })();
        const { slug, branch } = match.groups!;

        const repoInfo: RepoInfo = {
            valid: true,
            slug: slug,
            path: "/",
            branch: branch || "main"
        };
        return repoInfo;
    } catch (err) {
        core.error(`Skipped ${repoFullPath}. Reason: ${err.message}`);
        return {
            valid: false
        };
    }
};

export class Repo {
    static dirsToIgnore = [".git"];

    public clonedPath = "";

    constructor(
        public info: RepoInfo
    ) {
    }

    async clone() {
        const { slug, branch } = this.info;

        const baseDir = inputs.TMPDIR;
        const pathToClone = path.join(baseDir, `${slug}${branch ? `-${branch}` : ""}`);

        const args = [
            "GIT_LFS_SKIP_SMUDGE=1",
            "git clone",
            "--depth 1",
            branch && `-b ${branch}`,
            `https://${inputs.GITHUB_TOKEN}@github.com/${slug}.git`,
            pathToClone
        ];

        core.info("Cloning repo...");

        await execa("git", args.filter(Boolean), {
            // stdout: "inherit"
        });

        if (core.isDebug()) {
            const filePaths = await scanDir(pathToClone, Repo.dirsToIgnore);

            core.debug(`Fetched files: ${JSON.stringify(filePaths, undefined, 2)}`);
        }
    }

    // // todo rename method
    // getFilesList(isSourceRepo: boolean): string[] {
    //     // const filePaths = await scanDir(this.clonedPath, Repo.dirsToIgnore);

    //     const filesList = inputs.FILE_LIST
    //         .split("\n")
    //         .map(filePath => filePath.trim())
    //         .filter(Boolean);
    //     // .map(filePath => {
    //     //     let resolvedPath = path.join(isSourceRepo ? inputs.SRC_ROOT! : inputs.TARGET_ROOT!, filePath);
    //     //     // if (resolvedPath.startsWith("/")) resolvedPath = resolvedPath.slice(1);
    //     //     return resolvedPath;
    //     // });

    //     return filesList;
    // }

    async hasChanges(): Promise<boolean> {
        const statusOutput = await execa(
            "git", ["status", "--porcelain"],
            { cwd: this.clonedPath }
        );
        return porcelainParse(statusOutput).length !== 0;
    }

    async removeFiles(srcBasePath: string) {
        const filesList = getListFromInput("FILE_LIST");

        filesList
            .map(filePath => {
                const pathInSource = path.join(srcBasePath, filePath);
                const pathInTarget = path.join(inputs.TARGET_ROOT!, this.clonedPath, filePath);
                if (fs.existsSync(pathInTarget)) {}
            })
            .filter(Boolean);

        if (inputs.SKIP_DELETE) {
            core.warning(`Running with SKIP_DELETE=true. No actual files will be removed.`);
            return;
        }

        if (inputs.DRY_RUN) return;

        await Promise.all(filesToRemove.map(filePath => {
            const targetRepoPath = inputs.TARGET_ROOT;
            return fs.promises.unlink();
        }));
    };

    async commitAll() {
        if (!await this.hasChanges()) {
            core.info("No changes detected");
            return;
        }
        await execa(
            "git", ["status", "--short"],
            { cwd: this.clonedPath, stdout: "inherit" }
        );

        // todo add skip ci if needed
        const commitMessage = "[files-sync]: update files";
        core.info(`Committing with message: ${commitMessage}`);

        if (inputs.DRY_RUN) {
            core.warning(`Running with DRY_RUN=true, no changes will be commited`);
        } else {
            const output = await execa(
                [
                    `git config --local user.name "${inputs.GIT_USERNAME}"`,
                    `git config --local user.email "${inputs.GIT_EMAIL}"`,
                    `git add -A`,
                    `git status`,
                    // TODO [#17]: improve commit message to contain more details about the changes
                    `git commit --message "${commitMessage}"`,
                    `git push`,
                ].join(" && "),
                [],
                {
                    cwd: this.clonedPath
                }
            );
            if (!output.stdout.includes("Update file(s) from")) {
                throw new Error("Failed to commit changes");
            }
            core.info(`Changes commited`);
        }
    }
}