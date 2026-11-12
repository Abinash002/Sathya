#!/usr/bin/env node
/**
 * Sathya Birthday Website — Sync Controller CLI
 * Usage:
 *   node scripts/sync-cli.js start
 *   node scripts/sync-cli.js stop
 *   node scripts/sync-cli.js status
 */

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const SCRIPTS_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPTS_DIR, '..');
const PID_FILE = path.join(SCRIPTS_DIR, '.sync.pid');
const STATUS_FILE = path.join(SCRIPTS_DIR, '.sync-status.json');
const LOG_FILE = path.join(SCRIPTS_DIR, 'sync.log');
const WATCHER_SCRIPT = path.join(SCRIPTS_DIR, 'auto-sync.js');

const command = (process.argv[2] || 'status').toLowerCase();
const extraArgs = process.argv.slice(3);

function isAlive(pid) {
  if (!pid || isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function readPid() {
  if (!fs.existsSync(PID_FILE)) return null;
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  return isNaN(pid) ? null : pid;
}

function readStatus() {
  if (!fs.existsSync(STATUS_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch (err) {
    return null;
  }
}

function runGitSafe(args) {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (err) {
    return '(unavailable)';
  }
}

function startSync() {
  const existingPid = readPid();
  if (existingPid && isAlive(existingPid)) {
    console.log(`Automatic GitHub sync is ALREADY ACTIVE (PID: ${existingPid}).`);
    showStatus();
    return;
  }

  // Clean stale PID file
  if (fs.existsSync(PID_FILE)) {
    try { fs.unlinkSync(PID_FILE); } catch (e) {}
  }

  const child = spawn(process.execPath, [WATCHER_SCRIPT, ...extraArgs], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });

  child.unref();

  // Wait briefly for child to write PID file
  setTimeout(() => {
    const newPid = readPid() || child.pid;
    if (isAlive(newPid)) {
      console.log(`Automatic GitHub sync STARTED successfully (PID: ${newPid}).`);
      console.log(`Watching: ${REPO_ROOT}`);
      console.log(`Logs: ${LOG_FILE}`);
      console.log('To stop syncing: run scripts/stop-sync.ps1 (or scripts/stop-sync.bat)');
    } else {
      console.error('Failed to start automatic GitHub sync. Check scripts/sync.log for details.');
      process.exit(1);
    }
  }, 600);
}

function stopSync() {
  const pid = readPid();
  if (!pid || !isAlive(pid)) {
    if (fs.existsSync(PID_FILE)) {
      try { fs.unlinkSync(PID_FILE); } catch (e) {}
    }
    const status = readStatus() || {};
    status.state = 'stopped';
    status.nextSyncAt = null;
    try {
      fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
    } catch (e) {}
    console.log('Automatic GitHub sync is NOT running (already stopped).');
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch (err) {
    console.error(`Could not terminate PID ${pid}: ${err.message}`);
    process.exit(1);
  }

  // Verify exit
  setTimeout(() => {
    if (isAlive(pid)) {
      try { process.kill(pid, 'SIGKILL'); } catch (e) {}
    }
    if (fs.existsSync(PID_FILE)) {
      try { fs.unlinkSync(PID_FILE); } catch (e) {}
    }
    const status = readStatus() || {};
    status.state = 'stopped';
    status.nextSyncAt = null;
    status.pendingFiles = [];
    try {
      fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
    } catch (e) {}
    console.log(`Automatic GitHub sync STOPPED cleanly (PID: ${pid}).`);
  }, 500);
}

function showStatus() {
  const pid = readPid();
  const active = Boolean(pid && isAlive(pid));
  const status = readStatus();

  console.log('==========================================================');
  console.log(' Sathya Birthday Website — GitHub Auto-Sync Status');
  console.log('==========================================================');
  console.log(`Sync Service : ${active ? `ACTIVE (PID: ${pid})` : 'STOPPED'}`);
  if (status) {
    console.log(`Watcher State: ${active ? status.state : 'stopped'}`);
    console.log(`Debounce Wait: ${status.debounceSeconds || 60} seconds after last edit`);
    if (status.lastSyncAt) console.log(`Last Synced  : ${new Date(status.lastSyncAt).toLocaleString()}`);
    if (status.lastCommit) console.log(`Last Commit  : ${status.lastCommit}`);
    if (active && status.nextSyncAt) console.log(`Next Sync At : ${new Date(status.nextSyncAt).toLocaleString()}`);
    if (active && status.pendingFiles && status.pendingFiles.length) {
      console.log(`Pending Files: ${status.pendingFiles.join(', ')}`);
    }
    if (status.lastError) console.log(`Last Error   : ${status.lastError}`);
  }
  console.log('----------------------------------------------------------');
  console.log(`Remote URL   : ${runGitSafe(['remote', 'get-url', 'origin'])}`);
  console.log(`Branch       : ${runGitSafe(['branch', '--show-current'])}`);
  console.log(`Latest Commit: ${runGitSafe(['log', '-n', '1', '--oneline'])}`);
  const pendingGit = runGitSafe(['status', '--short']);
  console.log(`Local Changes: ${pendingGit ? '\n' + pendingGit : 'Clean (working tree matches last commit)'}`);
  console.log('==========================================================');
}

if (command === 'start') {
  startSync();
} else if (command === 'stop') {
  stopSync();
} else if (command === 'status') {
  showStatus();
} else {
  console.log('Usage: node scripts/sync-cli.js [start|stop|status]');
  process.exit(1);
}
