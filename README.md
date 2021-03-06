# Files Sync Action

[![Build](https://github.com/adrianjost/files-sync-action/workflows/Build/badge.svg)](https://github.com/adrianjost/files-sync-action/actions?query=workflow%3ABuild) [![Release](https://github.com/adrianjost/files-sync-action/workflows/Release/badge.svg)](https://github.com/adrianjost/files-sync-action/actions?query=workflow%3ARelease) [![Dependency Status](https://david-dm.org/adrianjost/files-sync-action.svg)](https://david-dm.org/adrianjost/files-sync-action) [![Dependency Status](https://david-dm.org/adrianjost/files-sync-action/dev-status.svg)](https://david-dm.org/adrianjost/files-sync-action?type=dev) ![GitHub contributors](https://img.shields.io/github/contributors/adrianjost/files-sync-action?color=bright-green)

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A Github Action that can sync files from one repository to many others. This action allows a maintainer to define community health files in a single repository and have them synced to all other repositories in the Github organization or beyond. You could sync common GitHub Action Workflows, your LICENSE or any other file you can imagine. Regex is used to select the files. Exclude is currently not supported and it is recommended to use a bot user if possible.

## Inputs

For inputs see [action.yml](action.yml).

## Example Usage

<!-- See  -->

## Use it in your action

1. Install as a dependency `yarn add https://github.com/zardoy/files-sync-action`
<!-- 2. Import it -->

## Planned Features

- [ ] allow RegExp for repo selection just like in [google/secrets-sync-action](https://github.com/google/secrets-sync-action) allows it.

## Local Testing

create `./test.js` with the following content to execute the code locally.

```
process.env.INPUT_SRC_REPO = "adrianjost/files-sync-action";
process.env.INPUT_TARGET_REPOS = "adrianjost/files-sync-target";
process.env.INPUT_GITHUB_TOKEN = "YOUR_GITHUB_TOKEN";
process.env.INPUT_FILE_PATTERNS = "^README.md$";
process.env.INPUT_SKIP_CLEANUP = "false";
process.env.GITHUB_ACTOR = "adrianjost";
process.env.INPUT_DRY_RUN = "true";

require("./index");
```
