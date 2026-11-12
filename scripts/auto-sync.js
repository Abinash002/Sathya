#!/usr/bin/env node
/**
 * Sathya Birthday Website — Automatic GitHub Sync Watcher
 *
 * Watches project files for saved edits, waits 60 seconds after the last edit
 * to avoid committing incomplete saves, checks safety rules (no force-push,
 * no secrets, file size < 95 MB, checks remote before pushing, aborts & alerts
 * on merge conflicts), commits meaningfully, and pushes to origin/main.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = __dirname;
const PID_FILE = path.join(SCRIPTS_DIR, '.sync.pid');
const STATUS_FILE = path.join(SCRIPTS_DIR, '.sync-status.json');
const LOG_FILE = path.join(SCRIPTS_DIR, 'sync.log');

const REMOTE = 'origin';
const TARGET_BRANCH = 'main';
const MAX_FILE_BYTES = 95 * 1024 * 1024; // 95 MB safety cap (GitHub limit is 100 MB)

// Parse optional CLI flags (e.g. --debounce=5000 for testing)
const debounceArg = process.argv.find((a) => a.startsWith('--debounce='));
const DEBOUNCE_MS = debounceArg ? Math.max(1000, parseInt(debounceArg.split('=')[1], 10) || 60000) : 60000;

let debounceTimer = null;
let isSyncing = false;
let conflictHalted = false;
let pendingFiles = new Set();
let watcher = null;

const statusData = {
  state: 'starting',
  pid: process.pid,
  repoRoot: REPO_ROOT,
  branch: TARGET_BRANCH,
  debounceSeconds: Math.round(DEBOUNCE_MS / 1000),
  startedAt: new Date().toISOString(),
  lastEventAt: null,
  nextSyncAt: null,
  lastSyncAt: null,
  lastCommit: null,
  lastError: null,
  pendingFiles: []
};

function timestamp() {
  return new Date().toLocaleString('en-IN', { hour12: true });
}

function log(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (err) {
    // Ignore log write failure
  }
}

function writeStatus(patch = {}) {
  Object.assign(statusData, patch);
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
  } catch (err) {
    // Ignore status write failure
  }
}

function isProcessAlive(pid) {
  if (!pid || isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: options.timeout || 30000,
    env: {
      ...process.env,
      GCM_INTERACTIVE: 'never',
      GIT_TERMINAL_PROMPT: '0'
    }
  }).replace(/\r?\n$/, '');
}

function isIgnoredRelativePath(relPath) {
  if (!relPath) return true;
  const norm = relPath.replace(/\\/g, '/');

  // Ignore git internals and runtime sync files
  if (norm === '.git' || norm.startsWith('.git/')) return true;
  if (norm === 'node_modules' || norm.startsWith('node_modules/')) return true;
  if (norm.startsWith('scripts/.sync') || norm === 'scripts/sync.log') return true;

  // Ignore temporary / editor swap files
  const base = path.basename(norm);
  if (
    base.startsWith('~$') ||
    base.endsWith('.tmp') ||
    base.endsWith('.swp') ||
    base.endsWith('.swo') ||
    base.endsWith('.bak') ||
    base.endsWith('.crdownload') ||
    base.endsWith('.part') ||
    base.endsWith('~') ||
    base === 'Thumbs.db' ||
    base === '.DS_Store' ||
    base === 'desktop.ini' ||
    base === 'Desktop.ini'
  ) {
    return true;
  }

  return false;
}

function isPotentialSecretFile(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  const base = path.basename(norm).toLowerCase();
  if (base === '.env' || base.startsWith('.env.')) return true;
  if (/\.(pem|key|p12|pfx|secret)$/i.test(base)) return true;
  if (base === 'credentials.json' || base === 'secrets.json' || base.startsWith('id_rsa')) return true;
  if (base === '.npmrc' || base === '.netrc') return true;
  return false;
}

function scanContentForSecrets(filePath) {
  // Only scan reasonably sized text files
  const ext = path.extname(filePath).toLowerCase();
  const textExts = new Set(['.html', '.htm', '.css', '.js', '.json', '.md', '.txt', '.ps1', '.bat', '.sh', '.svg', '.yml', '.yaml']);
  if (!textExts.has(ext) && ext !== '') return null;

  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 2 * 1024 * 1024) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const patterns = [
      { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
      { name: 'GitHub PAT', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
      { name: 'GitHub Fine-Grained PAT', regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
      { name: 'AWS Access Key', regex: /\bAKIA[0-9A-Z]{16}\b/ }
    ];
    for (const p of patterns) {
      if (p.regex.test(content)) return p.name;
    }
  } catch (err) {
    return null;
  }
  return null;
}

function parsePorcelainStatus(porcelainOutput) {
  if (!porcelainOutput) return [];
  return porcelainOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([ MARCUD?!]{2}) (.+)$/);
      const code = m ? m[1] : line.slice(0, 2);
      let file = (m ? m[2] : line.slice(3)).trim();
      if (file.startsWith('"') && file.endsWith('"')) {
        file = file.slice(1, -1).replace(/\\"/g, '"');
      }
      if (file.includes(' -> ')) {
        file = file.split(' -> ').pop();
      }
      return { code, file };
    });
}

function buildCommitMessage(changes) {
  if (changes.length === 1) {
    const { code, file } = changes[0];
    if (code.includes('?') || code.includes('A')) return `Auto-sync: add ${file}`;
    if (code.includes('D')) return `Auto-sync: remove ${file}`;
    return `Auto-sync: update ${file}`;
  }
  const names = changes.slice(0, 3).map((c) => c.file);
  const extra = changes.length > 3 ? ` +${changes.length - 3} more` : '';
  return `Auto-sync: update ${changes.length} files (${names.join(', ')}${extra})`;
}

async function performSync() {
  if (isSyncing || conflictHalted) return;
  isSyncing = true;
  writeStatus({ state: 'syncing', nextSyncAt: null });

  try {
    // 1. Check git index lock (skip cleanly and retry if git is busy)
    if (fs.existsSync(path.join(REPO_ROOT, '.git', 'index.lock'))) {
      log('WARN', 'Git index.lock detected. Waiting 10s before retrying sync...');
      isSyncing = false;
      scheduleSync(10000);
      return;
    }

    // 2. Verify active branch matches TARGET_BRANCH
    const currentBranch = runGit(['branch', '--show-current']);
    if (currentBranch !== TARGET_BRANCH) {
      throw new Error(`Active branch is "${currentBranch}", expected "${TARGET_BRANCH}". Skipping auto-sync for safety.`);
    }

    // 3. Check git status
    const rawStatus = runGit(['status', '--porcelain']);
    const changes = parsePorcelainStatus(rawStatus);

    if (changes.length === 0) {
      pendingFiles.clear();
      writeStatus({ state: 'watching', pendingFiles: [], lastError: null });
      return;
    }

    log('INFO', `Detected ${changes.length} changed file(s): ${changes.map((c) => c.file).join(', ')}`);

    // 4. Safety check: oversized files, forbidden secret files, or inline tokens
    for (const item of changes) {
      if (item.code.includes('D')) continue; // Skip deleted files
      const fullPath = path.join(REPO_ROOT, item.file);
      if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) continue;

      if (isPotentialSecretFile(item.file)) {
        throw new Error(`Safety block: sensitive file "${item.file}" detected. Please add it to .gitignore before syncing.`);
      }

      const size = fs.statSync(fullPath).size;
      if (size > MAX_FILE_BYTES) {
        const mb = (size / (1024 * 1024)).toFixed(2);
        throw new Error(`Safety block: "${item.file}" is ${mb} MB (near GitHub's 100 MB limit). Sync paused until resolved.`);
      }

      const secretFound = scanContentForSecrets(fullPath);
      if (secretFound) {
        throw new Error(`Safety block: potential ${secretFound} detected inside "${item.file}". Commit aborted.`);
      }
    }

    // 5. Stage changes
    runGit(['add', '-A']);

    const stagedStatus = runGit(['diff', '--cached', '--name-status']);
    if (!stagedStatus) {
      pendingFiles.clear();
      writeStatus({ state: 'watching', pendingFiles: [], lastError: null });
      return;
    }

    // 6. Commit locally
    const commitMsg = buildCommitMessage(changes);
    runGit(['commit', '-m', commitMsg]);
    const commitHash = runGit(['rev-parse', '--short', 'HEAD']);
    log('INFO', `Committed [${commitHash}]: "${commitMsg}"`);

    // 7. Fetch remote first so we never overwrite remote work blindly
    log('INFO', `Checking remote ${REMOTE}/${TARGET_BRANCH} before pushing...`);
    runGit(['fetch', REMOTE, TARGET_BRANCH], { timeout: 45000 });

    const behindCountStr = runGit(['rev-list', `HEAD..${REMOTE}/${TARGET_BRANCH}`, '--count']);
    const behindCount = parseInt(behindCountStr, 10) || 0;

    if (behindCount > 0) {
      log('INFO', `Remote is ahead by ${behindCount} commit(s). Rebasing safely...`);
      try {
        runGit(['rebase', `${REMOTE}/${TARGET_BRANCH}`], { timeout: 45000 });
      } catch (rebaseErr) {
        // Abort conflicted rebase immediately to keep working tree clean
        try {
          runGit(['rebase', '--abort']);
        } catch (abortErr) {
          // Ignored
        }
        conflictHalted = true;
        const msg = `Merge conflict detected against ${REMOTE}/${TARGET_BRANCH}! Auto-sync has stopped safely without overwriting remote changes. Please resolve conflicts manually and restart sync.`;
        log('ERROR', msg);
        writeStatus({
          state: 'conflict',
          lastError: msg,
          pendingFiles: []
        });
        return;
      }
    }

    // 8. Push safely (never --force)
    runGit(['push', REMOTE, TARGET_BRANCH], { timeout: 60000 });

    pendingFiles.clear();
    const nowIso = new Date().toISOString();
    log('SUCCESS', `Synced cleanly to GitHub (${REMOTE}/${TARGET_BRANCH}) at commit ${commitHash}.`);
    writeStatus({
      state: 'watching',
      lastSyncAt: nowIso,
      lastCommit: `${commitHash} - ${commitMsg}`,
      lastError: null,
      pendingFiles: []
    });
  } catch (err) {
    const rawMsg = (err && (err.stderr || err.message)) ? String(err.stderr || err.message).trim() : String(err);
    let friendlyMsg = rawMsg;

    if (/403|Permission to .* denied|Authentication failed|could not read Username|terminal prompts disabled/i.test(rawMsg)) {
      friendlyMsg = `GitHub authentication/permission error while pushing to ${REMOTE}/${TARGET_BRANCH}: ${rawMsg}`;
    }

    log('ERROR', friendlyMsg);
    writeStatus({
      state: 'error',
      lastError: friendlyMsg
    });
  } finally {
    isSyncing = false;
  }
}

function scheduleSync(delayMs = DEBOUNCE_MS) {
  if (conflictHalted) return;
  if (debounceTimer) clearTimeout(debounceTimer);

  const nextAt = new Date(Date.now() + delayMs).toISOString();
  writeStatus({
    state: 'waiting',
    lastEventAt: new Date().toISOString(),
    nextSyncAt: nextAt,
    pendingFiles: Array.from(pendingFiles).slice(0, 20)
  });

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    performSync();
  }, delayMs);
}

function startWatcher() {
  // Check existing PID
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (isProcessAlive(oldPid) && oldPid !== process.pid) {
      console.error(`Auto-sync is already running (PID: ${oldPid}). Stop it first with scripts/stop-sync.ps1.`);
      process.exit(1);
    }
  }

  fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
  log('INFO', `Automatic GitHub sync started (PID: ${process.pid}).`);
  log('INFO', `Watching: ${REPO_ROOT}`);
  log('INFO', `Target: ${REMOTE}/${TARGET_BRANCH} | Debounce wait: ${Math.round(DEBOUNCE_MS / 1000)}s`);

  writeStatus({ state: 'watching', pid: process.pid, lastError: null });

  watcher = fs.watch(REPO_ROOT, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    if (isIgnoredRelativePath(filename)) return;

    const norm = filename.replace(/\\/g, '/');
    const isNewEdit = !pendingFiles.has(norm);
    pendingFiles.add(norm);

    if (isNewEdit) {
      log('CHANGE', `Edit detected: ${norm} — waiting ${Math.round(DEBOUNCE_MS / 1000)}s after edits settle...`);
    }
    scheduleSync(DEBOUNCE_MS);
  });

  watcher.on('error', (err) => {
    log('ERROR', `File watcher error: ${err.message}`);
    writeStatus({ state: 'error', lastError: err.message });
  });

  // Check if there are already uncommitted edits at startup
  try {
    const initialChanges = parsePorcelainStatus(runGit(['status', '--porcelain']));
    if (initialChanges.length > 0) {
      initialChanges.forEach((c) => pendingFiles.add(c.file));
      log('INFO', `Found ${initialChanges.length} existing local change(s). Scheduling sync in ${Math.round(DEBOUNCE_MS / 1000)}s...`);
      scheduleSync(DEBOUNCE_MS);
    }
  } catch (err) {
    log('WARN', `Startup status check failed: ${err.message}`);
  }
}

function shutdown(signal) {
  log('INFO', `Stopping automatic GitHub sync (${signal})...`);
  if (debounceTimer) clearTimeout(debounceTimer);
  if (watcher) {
    try {
      watcher.close();
    } catch (e) {}
  }
  try {
    if (fs.existsSync(PID_FILE)) {
      const storedPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      if (storedPid === process.pid) {
        fs.unlinkSync(PID_FILE);
      }
    }
  } catch (e) {}
  writeStatus({ state: 'stopped', nextSyncAt: null, pendingFiles: [] });
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

startWatcher();
