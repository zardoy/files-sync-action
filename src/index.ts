import path from "path";

import * as git from "./git";
import { removeDir } from "./utils";

import getLogger from "./log";
const showLogs = getLogger().print;
import utils from "./utils";
import { inputs } from "actions-inputs";

import core from "@actions/core";

import { getRepoInfo, Repo } from "./repo";

import fs from "fs";
import { getListFromInput } from "./util";

// note: username/repo is a slug

const setInputDefaults = () => {
	inputs.GIT_EMAIL = inputs.GIT_EMAIL || `${process.env.GITHUB_ACTOR}@users.noreply.github.com`;
	inputs.GIT_USERNAME = inputs.GIT_USERNAME || process.env.GITHUB_ACTOR;
	inputs.TMPDIR = inputs.TMPDIR || `tmp-${Date.now()}`;
	inputs.SRC_REPO = inputs.SRC_REPO || process.env.GITHUB_REPOSITORY;
};

const checkSrcFiles = () => {
	const srcFiles = getListFromInput("FILE_LIST");

	// check that all files are in repository
	srcFiles.forEach(filePath => {
		filePath = path.(filePath)
		if (!fs.existsSync(filePath)) throw new TypeError(`Check FILE_LIST input. Path ${filePath} doesn't exist`);
		if (fs.lstatSync(filePath).isDirectory()) throw new TypeError(`Check FILE_LIST input. ${filePath} is a directory, but file expected.`);
	});
}

const main = async () => {
	try {
		// todo-high check targets on start. HERE
		// todo add parallel option

		setInputDefaults();

		if (inputs.DRY_RUN) core.warning(`Running with DRY_RUN=true. No changes will be made.`);

		core.startGroup("Preparing source");

		const repoInfo = getRepoInfo(inputs.SRC_REPO!);
		if (!repoInfo.valid) {
			throw new TypeError(`Source remote path invalid. Either fallback to default value or fix this: ${inputs.SRC_REPO}`);
		}

		const srcRepo = new Repo(repoInfo);
		await srcRepo.clone();
		const srcBasePath = path.join(srcRepo.clonedPath, inputs.SRC_ROOT!);

		checkSrcFiles();
		
		core.endGroup();

		await new Promise((resolve) => setTimeout(resolve, 5000));
		
		const targetRepos = getListFromInput("TARGET_REPOS");

		for (const targetRepoFull of targetRepos) {
			core.startGroup(`Syncing ${targetRepoFull}`);

			const targetInfo = getRepoInfo(targetRepoFull);
			if (!targetInfo.valid) {
				continue;
			}
			const targetRepo = new Repo(targetInfo);
			await targetRepo.clone();
			targetRepo.removeFiles()



			core.endGroup();
		}
		const removedFiles = targetFiles.filter(
			(file) =>
				!relativeSrcFiles.includes(utilsRepo.getRepoRelativeFilePath(file))
		);

		// UPDATE FILES
		await Promise.all([
			utilsRepo.removeFiles(removedFiles),
			srcFiles.map(async (srcFile) =>
				utilsRepo.copyFile(
					srcFile,
					path.join(
						utilsRepo.getRepoFilePath(),
						utilsSrc.getRepoRelativeFilePath(srcFile)
					)
				)
			),
		]);

		// COMMIT UPDATES
		await gitRepo.commitAll();

		showLogs(repo);
	})
		);
	} catch (err) {
	// IMHO it's less readable with Action failed with error
	core.setFailed(err.msg);
} finally {
	if (!inputs.SKIP_CLEANUP) {
		await removeDir(inputs.TMPDIR);
	}
}
};

module.exports = main;
