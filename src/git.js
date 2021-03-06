const { exec } = require("child_process");
const { parse: porcelainParse } = require("@putout/git-status-porcelain");

const {
	GITHUB_TOKEN,
	SRC_REPO,
	COMMIT_MESSAGE,
	GIT_USERNAME,
	GIT_EMAIL,
	DRY_RUN,
} = require("./context");

const utils = require("./utils");
const getLogger = require("./log");

const interpolateCommitMessage = (message, data) => {
	let newMessage = message;
	Object.keys(data).forEach((key) => {
		if (key === "COMMIT_MESSAGE") {
			return;
		}
		newMessage = newMessage.replace(new RegExp(`%${key}%`, "g"), data[key]);
	});
	return newMessage;
};

module.exports = {
	init: (repoSlugAndBranch) => {
		const { getRepoPath, getRepoSlug, getRepoBranch } = utils.init(
			repoSlugAndBranch
		);

		const logger = getLogger(repoSlugAndBranch);

		function execCmd(command, workingDir) {
			logger.info(`EXEC: "${command}" IN "${workingDir || "./"}"`);
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

		const hasChanges = async () => {
			const statusOutput = await execCmd(
				`git status --porcelain`,
				getRepoPath()
			);
			return porcelainParse(statusOutput).length !== 0;
		};

		const commitAll = async () => {
			if (!(await hasChanges())) {
				logger.info("NO CHANGES DETECTED");
				return;
			}
			logger.info("CHANGES DETECTED");
			logger.info("COMMIT CHANGES...");
			const commitMessage = interpolateCommitMessage(COMMIT_MESSAGE, {
				SRC_REPO: SRC_REPO,
				TARGET_REPO: repoSlugAndBranch,
			});
			if (!DRY_RUN) {
				const output = await execCmd(
					[
						`git config --local user.name "${GIT_USERNAME}"`,
						`git config --local user.email "${GIT_EMAIL}"`,
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
	},
};
