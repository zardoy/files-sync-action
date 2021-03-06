import { inputs } from "actions-inputs";

import { debug } from "@actions/core";

import utils from "./utils";

const interpolateCommitMessage = (message: string, data) => {
	Object.keys(data).forEach((key) => {
		if (key === "COMMIT_MESSAGE") {
			return;
		}
		message = message.replace(new RegExp(`%${key}%`, "g"), data[key]);
	});
	return message;
};

export const init = (repoSlugAndBranch: string) => {
	const { getRepoPath, getRepoSlug, getRepoBranch } = utils.init(
		repoSlugAndBranch
	);

	const execCmd = (command: string, workingDir: string) => {
		debug(`EXEC: "${command}" IN "${workingDir || "./"}"`);
		return new Promise((resolve, reject) => {
			exec(
				command,
				{
					cwd: workingDir,
				},
				function (error, stdout) {
					logger.info(`OUTPUT: "${error}${stdout}"`);
					error ? reject(error) : resolve(stdout.trim());
				}
			);
		});
	}

	const clone = async () => {
		const command = [
			"git clone",
			"--depth 1",
			getRepoBranch() === undefined ? false : ` -b ${getRepoBranch()}`,
			`https://${GITHUB_TOKEN}@github.com/${getRepoSlug()}.git`,
			getRepoPath(),
		];

		return execCmd(command.filter(Boolean).join(" "));
	};

	const commitAll = async () => {
		if (!(await hasChanges())) {
			logger.info("NO CHANGES DETECTED");
			return;
		}
		logger.info("CHANGES DETECTED");
		logger.info("COMMIT CHANGES...");
		const commitMessage = interpolateCommitMessage(inputs.COMMIT_MESSAGE, {
			SRC_REPO: inputs.SRC_REPO,
			TARGET_REPO: repoSlugAndBranch,
		});

		if (!inputs.DRY_RUN) {
			const output = await execCmd(
				[
					`git config --local user.name "${inputs.GIT_USERNAME}"`,
					`git config --local user.email "${inputs.GIT_EMAIL}"`,
					`git add -A`,
					`git status`,
					// TODO [#17]: improve commit message to contain more details about the changes
					`git commit --message "${commitMessage}"`,
					`git push`,
				].join(" && "),
				getRepoPath()
			);
			if (!output.includes("Update file(s) from")) {
				throw new Error("failed to commit changes");
			}
		}
		logger.info("CHANGES COMMITED");
	};

	return {
		clone,
		commitAll,
	};
};
