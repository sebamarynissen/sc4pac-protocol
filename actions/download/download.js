import github from '@actions/github';

// Setup our git client & octokit.
const cwd = process.env.GITHUB_WORKSPACE ?? process.env.cwd();
const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

const res = await octokit.request('GET /repos/{owner}/{repo}/releases', {
	owner: 'memo33',
	repo: 'sc4pac-gui',
	tag: '0.2.1',
	headers: {
		'X-GitHub-Api-Version': '2022-11-28'
	},
});

// Find the webapp asset.
let [latest] = res.data;
let webapp = latest.assets.find(asset => asset.name.includes('webapp'));
console.log(webapp);
