import github from '@actions/github';

// Setup our git client & octokit.
const cwd = process.env.GITHUB_WORKSPACE ?? process.env.cwd();
const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

const response = await octokit.rest.repos.getLatestRelease({
	owner: 'memo33',
	repo: 'sc4pac-gui',
});
console.log(response);
