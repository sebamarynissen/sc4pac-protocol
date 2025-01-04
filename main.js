import { app, dialog, BrowserWindow } from 'electron/main';
import cp from 'node:child_process';
import path from 'node:path';

if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient('sc4pac', process.execPath, [path.resolve(process.argv[1])]);
		// app.removeAsDefaultProtocolClient('sc4pac', process.execPath, [path.resolve(process.argv[1])]);
	}
} else {
	app.setAsDefaultProtocolClient('sc4pac');
}

// Ensure only a single app instance can be running.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	app.quit();
} else {
	app.on('second-instance', (event, commandLine, cwd) => {
		let url = commandLine.pop();
		openUrl(url);
	});
}

// Launches the sc4pac server.
async function sc4pac() {
	let child = cp.spawn('cli\\sc4pac.bat', [
			'server',
			'--port 51515',
			'--web-app-dir webapp',
		], {
		shell: true,
	});
}

Promise.all([
	app.whenReady(),
	sc4pac(),
]).then(async () => {
	await createWindow();
	let args = process.argv.slice(1);
	if (process.defaultApp) {
		args = args.slice(1);
	}
	await new Promise(cb => setTimeout(cb, 1000));
	await openUrl(args[0]);
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
