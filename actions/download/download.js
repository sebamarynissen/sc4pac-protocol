import github from '@actions/github';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import path from 'node:path';
import fs from 'node:fs';

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

// Download the .zip.
const dist = path.join(cwd, 'dist');
await fs.promises.mkdir(dist, { recursive: true });
let ws = fs.createWriteStream(path.join(dist, 'webapp.zip'));

let dl = await fetch(webapp.browser_download_url);
await finished(Readable.fromWeb(dl.body).pipe(ws));
