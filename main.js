import { app, dialog, BrowserWindow } from 'electron/main';
import cp from 'node:child_process';
import path from 'node:path';

// IMPORTANT! The root directory of the application - which is where the 
// "webapp" and "cli" directories can be found - is not simply process.cwd()! 
// Apparently when launching sc4p:// urls from a browser, windows sets 
// C:\Windows\System32 as cwd.
let root = process.defaultApp ? import.meta.dirname : path.dirname(process.execPath);

// Register the application as default handler for the sc4pac protocol, but only 
// when packaged.
if (!process.defaultApp) {
	app.setAsDefaultProtocolClient('sc4pac');
}

// Ensure only a single app instance can be running.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	console.log('App already running, quitting');
	app.quit();
} else {
	app.on('second-instance', (event, commandLine, cwd) => {
		let url = commandLine.pop();
		openUrl(url);
	});
}

// Launch the sc4pac server.
let server;
async function sc4pac() {
	let cmd = process.platform === 'win32' ? 'cli\\sc4pac.bat' : './cli/sc4pac';
	server = cp.spawn(cmd, [
		'server',
		'--port 51515',
		'--web-app-dir webapp',
		'--profiles-dir profiles',
		'--auto-shutdown=true',
	], {
		shell: true,
		cwd: root,
	});
	let { promise, resolve, reject } = Promise.withResolvers();
	let resolved = false;
	server.stdout.on('data', async chunk => {
		if (String(chunk).match(/listening on port/)) {

			// For some reason flutter_bootstrap.js isn't loaded the first time, 
			// so we'll "warm it up" here.
			try {
				await fetch(
					'http://localhost:51515/webapp/flutter_bootstrap.js',
				);
			} finally {
				resolved = true;
				resolve(server);
			}
		}
	});

	// If something goes wrong during startup of the sc4pac server, then we have 
	// to quit the application.
	server.stderr.on('data', chunk => {
		console.log(chunk+'');
		if (!resolved) {
			dialog.showErrorBox('ERROR', String(chunk));
			reject();
		}
	});
	return promise;
}

// All windows closed? Then close the application as well.
app.on('window-all-closed', () => {
	app.quit();
});

// Perform the actual app startup logic now.
Promise.all([
	app.whenReady(),
	sc4pac(),
]).then(async () => {
	await createWindow();
	let args = process.argv.slice(1);
	if (process.defaultApp) {
		args = args.slice(1);
	}
	if (args.length > 0) {
		await new Promise(cb => setTimeout(cb, 1000));
		await openUrl(args[0]);
	}
}).catch(() => {

	// If something went wrong during startup, we have to make sure to quit, 
	// because another application instance is not allowed to be started due to 
	// the `requestSingleInstanceLock()` call!
	app.quit();

});

let mainWindow;
async function createWindow() {
	mainWindow = new BrowserWindow({
		autoHideMenuBar: true,
		width: 800,
		height: 600,
	});
	mainWindow.loadURL('http://localhost:51515/webapp');
	let { promise, resolve } = Promise.withResolvers();

	mainWindow.webContents.on('did-finish-load', () => resolve());
	return promise;
}

async function openUrl(raw) {
	if (mainWindow.isMinimized()) mainWindow.restore();
	mainWindow.focus();
	let url = new URL(raw);
	let channelUrl = `https://${url.host}${url.pathname}`.replace(/\/$/, '')+'/';
	let payload = [
		{
			package: url.searchParams.get('pkg'),
			channelUrl,
		},
	];
	let body = JSON.stringify(payload);
	await fetch('http://localhost:51515/packages.open', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': body.length,
		},
		body,
	});
}
