import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const OWNER = 'genbraham';
const REPO = 'intrinsic';
const REF = 'main'; // or a tag like 'v1.0.9'

function run(cmd, args, cwd) {
	return new Promise((resolve, reject) => {
		const exe = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd;
		const child = spawn(exe, args, {
			cwd,
			stdio: 'inherit',
			shell: process.platform === 'win32',
		});
		child.on('error', reject);
		child.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))
		);
	});
}

export async function updateVersion() {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `${REPO}-update-`));
	const repoDir = path.join(tmpDir, REPO);
	const repoURL = `https://github.com/${OWNER}/${REPO}.git`;

	console.log('[update] Temp dir:', tmpDir);
	console.log('[update] Cloning repo...');
	await run('git', [
		'clone',
		'--depth',
		'1',
		'--branch',
		REF,
		repoURL,
		repoDir,
	]);

	console.log('[update] Installing dependencies...');
	await run('npm', ['install'], repoDir);

	console.log('[update] Building...');
	await run('npm', ['run', 'build'], repoDir);

	console.log('[update] Cleaning up...');
	try {
		// Best-effort cleanup; ignore weird rimraf edge cases
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch (e) {
		console.warn('[update] cleanup skipped:', e?.message || e);
		// Try again shortly, then give up (OS temp cleaners will handle it later)
		setTimeout(() => {
			try {
				fs.rmSync(tmpDir, { recursive: true, force: true });
			} catch {}
		}, 60_000);
	}

	console.log('[update] Done.');
}
