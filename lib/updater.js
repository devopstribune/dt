// DevOps Tribune CLI Updater
// Automatically checks and updates dt on first run of the day, or via manual `dt update`
// Zero third-party dependencies.

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const os = require('node:os');
const { execSync, spawnSync } = require('node:child_process');
const fmt = require('./formatter');
const pkg = require('../package.json');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'devopstribune');
const STATE_FILE = path.join(CONFIG_DIR, 'state.json');
const NPM_REGISTRY_URL = 'https://registry.npmjs.org/@devopstribune/cli/latest';

function ensureConfigDir() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  } catch (_) {}
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {
    autoUpdate: true,
    lastCheckDate: null,
    lastCheckTimestamp: null,
    lastKnownVersion: pkg.version
  };
}

function saveState(state) {
  try {
    ensureConfigDir();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (_) {}
}

function parseSemver(v) {
  return String(v || '0.0.0')
    .replace(/^v/, '')
    .trim()
    .split('.')
    .map(n => parseInt(n, 10) || 0);
}

function isNewerVersion(remote, local) {
  const [rMaj = 0, rMin = 0, rPat = 0] = parseSemver(remote);
  const [lMaj = 0, lMin = 0, lPat = 0] = parseSemver(local);

  if (rMaj > lMaj) return true;
  if (rMaj < lMaj) return false;
  if (rMin > lMin) return true;
  if (rMin < lMin) return false;
  return rPat > lPat;
}

function findGitRoot(startDir) {
  let curr = path.resolve(startDir);
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, '.git'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return null;
}

function detectInstallType(cliDir) {
  const gitRoot = findGitRoot(cliDir || __dirname);
  if (gitRoot) {
    try {
      const remotes = execSync('git remote -v', { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 1500 });
      if (remotes && remotes.includes('devopstribune')) {
        return { type: 'git', path: gitRoot };
      }
      if (remotes && remotes.trim().length > 0) {
        return { type: 'git', path: gitRoot };
      }
    } catch (_) {}
  }

  const execPath = process.execPath || '';
  const dirPath = __dirname || '';

  if (execPath.includes('Cellar/dt') || dirPath.includes('Cellar/dt') || dirPath.includes('/opt/homebrew') || dirPath.includes('/usr/local/Cellar')) {
    return { type: 'homebrew' };
  }

  if (dirPath.includes('node_modules')) {
    return { type: 'npm' };
  }

  return { type: 'local', path: path.resolve(__dirname, '..') };
}

function fetchLatestNpmVersion(timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = https.get(NPM_REGISTRY_URL, { timeout: timeoutMs, headers: { 'User-Agent': `dt-cli/${pkg.version}` } }, (res) => {
      if (res.statusCode !== 200) {
        return resolve({ error: `HTTP ${res.statusCode}`, version: null });
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ version: parsed.version || null, error: null });
        } catch (e) {
          resolve({ error: e.message, version: null });
        }
      });
    });

    req.on('error', (err) => resolve({ error: err.message, version: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Connection timed out', version: null });
    });
  });
}

function checkGitRemoteUpdates(gitRoot, timeoutMs = 10000) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 }).trim() || 'main';
    
    // Fetch quietly with adequate network timeout
    execSync(`git fetch -q origin ${branch}`, { cwd: gitRoot, stdio: ['pipe', 'pipe', 'ignore'], timeout: timeoutMs });
    
    // Count commits behind origin
    const behindCountStr = execSync(`git rev-list HEAD..origin/${branch} --count`, { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 }).trim();
    const behindCount = parseInt(behindCountStr, 10) || 0;

    // Check dirty status
    const status = execSync('git status --porcelain', { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 }).trim();
    const isDirty = status.length > 0;

    return {
      branch,
      behindCount,
      isDirty,
      updateAvailable: behindCount > 0
    };
  } catch (err) {
    const isTimeout = err.code === 'ETIMEDOUT' || (err.message && err.message.includes('ETIMEDOUT'));
    return {
      branch: 'main',
      behindCount: 0,
      isDirty: false,
      updateAvailable: false,
      error: isTimeout ? 'Network timeout while connecting to remote Git repository' : err.message
    };
  }
}

function applyGitUpdate(gitRoot, branch) {
  try {
    execSync(`git pull --ff-only origin ${branch}`, { cwd: gitRoot, stdio: ['inherit', 'inherit', 'inherit'], timeout: 15000 });
    return true;
  } catch (err) {
    console.error(fmt.red(`Failed to pull git updates: ${err.message}`));
    return false;
  }
}

function applyNpmUpdate() {
  try {
    console.log(fmt.dim('Running npm install -g @devopstribune/cli@latest...'));
    const result = spawnSync('npm', ['install', '-g', '@devopstribune/cli@latest'], { stdio: 'inherit', timeout: 30000 });
    return result.status === 0;
  } catch (err) {
    console.error(fmt.red(`Failed to update via npm: ${err.message}`));
    return false;
  }
}

function applyHomebrewUpdate() {
  try {
    console.log(fmt.dim('Running brew upgrade devopstribune/tap/dt...'));
    const result = spawnSync('brew', ['upgrade', 'devopstribune/tap/dt'], { stdio: 'inherit', timeout: 45000 });
    return result.status === 0;
  } catch (err) {
    console.error(fmt.red(`Failed to upgrade via brew: ${err.message}`));
    return false;
  }
}

async function maybeAutoUpdate(args = {}) {
  // Prevent recursive loops
  if (process.env.DT_ALREADY_UPDATED === '1') {
    return false;
  }

  // Skip if disabled by environment or arguments (or in CI test runners)
  if (process.env.DT_NO_UPDATE === '1' || process.env.DT_AUTO_UPDATE === '0' || process.env.DT_AUTO_UPDATE === 'false' || process.env.CI) {
    return false;
  }

  if (args.noUpdate || args.json) {
    return false;
  }

  const state = loadState();
  if (state.autoUpdate === false && !args.update) {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (!args.update && state.lastCheckDate === today) {
    // Already checked on first run today
    return false;
  }

  // Mark checked today so we don't repeat on subsequent calls
  state.lastCheckDate = today;
  state.lastCheckTimestamp = Date.now();
  saveState(state);

  const installInfo = detectInstallType(__dirname);

  if (installInfo.type === 'git') {
    const gitStatus = checkGitRemoteUpdates(installInfo.path);
    if (gitStatus.updateAvailable) {
      if (gitStatus.isDirty) {
        console.log(fmt.yellow(`[dt] Update available (${gitStatus.behindCount} new commit(s)), but repository has local uncommitted changes. Skipping auto-pull.`));
        return false;
      }

      console.log(fmt.brightCyan(`[dt] New updates detected in repository (${gitStatus.behindCount} new commit(s)). Pulling latest changes...`));
      const success = applyGitUpdate(installInfo.path, gitStatus.branch);
      if (success) {
        console.log(fmt.brightGreen(`✓ Updated dt repository successfully.`));
        console.log();
        // Re-exec with updated files
        reExecCommand();
        return true;
      }
    }
  } else if (installInfo.type === 'homebrew') {
    const remote = await fetchLatestNpmVersion(2000);
    if (remote.version && isNewerVersion(remote.version, pkg.version)) {
      console.log(fmt.brightCyan(`[dt] New release available: v${remote.version} (current: v${pkg.version}). Updating via Homebrew...`));
      const success = applyHomebrewUpdate();
      if (success) {
        console.log(fmt.brightGreen(`✓ Upgraded dt to v${remote.version}.`));
        console.log();
        reExecCommand();
        return true;
      }
    }
  } else {
    // NPM or local package
    const remote = await fetchLatestNpmVersion(2000);
    if (remote.version && isNewerVersion(remote.version, pkg.version)) {
      console.log(fmt.brightCyan(`[dt] New release available: v${remote.version} (current: v${pkg.version}). Updating...`));
      const success = applyNpmUpdate();
      if (success) {
        console.log(fmt.brightGreen(`✓ Updated dt to v${remote.version}.`));
        console.log();
        reExecCommand();
        return true;
      }
    }
  }

  return false;
}

function reExecCommand() {
  const child = spawnSync(process.argv[0], process.argv.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      DT_ALREADY_UPDATED: '1'
    }
  });
  process.exit(child.status !== null ? child.status : 0);
}

async function handleUpdateCommand(subCommand = '', args = {}) {
  const state = loadState();

  // Subcommands: --enable, --disable, --status, --check
  if (subCommand === '--enable' || args.enable) {
    state.autoUpdate = true;
    saveState(state);
    console.log(fmt.brightGreen('✓ Automatic daily update check enabled on first run.'));
    return;
  }

  if (subCommand === '--disable' || args.disable) {
    state.autoUpdate = false;
    saveState(state);
    console.log(fmt.yellow('✓ Automatic daily update check disabled. You can still run "dt update" manually.'));
    return;
  }

  const installInfo = detectInstallType(__dirname);

  if (subCommand === '--status' || args.status) {
    console.log(fmt.banner());
    console.log(fmt.rule('CLI UPDATE CONFIGURATION & STATUS'));
    console.log();
    console.log(` ${fmt.bold('Current Version:')}     ${pkg.version}`);
    console.log(` ${fmt.bold('Install Method:')}      ${installInfo.type.toUpperCase()}${installInfo.path ? ` (${installInfo.path})` : ''}`);
    console.log(` ${fmt.bold('Auto-Update:')}         ${state.autoUpdate !== false ? fmt.brightGreen('ENABLED (checks once daily on first run)') : fmt.red('DISABLED')}`);
    console.log(` ${fmt.bold('Last Check Date:')}     ${state.lastCheckDate ? fmt.dim(state.lastCheckDate) : fmt.dim('Never')}`);
    console.log();
    console.log(fmt.dim(' Run "dt update --enable" or "dt update --disable" to toggle daily check.'));
    console.log();
    return;
  }

  console.log(fmt.brightCyan(`[dt] Checking for updates (current: v${pkg.version}, method: ${installInfo.type})...`));

  if (installInfo.type === 'git') {
    const gitStatus = checkGitRemoteUpdates(installInfo.path, 15000);
    if (gitStatus.error) {
      console.log(fmt.red(`Failed to check remote repository: ${gitStatus.error}`));
      return;
    }

    if (!gitStatus.updateAvailable) {
      console.log(fmt.brightGreen(`✓ dt is already up-to-date with remote ${gitStatus.branch} branch.`));
      return;
    }

    console.log(fmt.brightCyan(`Found ${gitStatus.behindCount} new commit(s) on origin/${gitStatus.branch}.`));

    if (subCommand === '--check' || args.check) {
      console.log(fmt.yellow(`Update available: run "dt update" to pull latest changes.`));
      return;
    }

    if (gitStatus.isDirty) {
      console.log(fmt.yellow(`Cannot automatically pull: local uncommitted changes exist in ${installInfo.path}. Commit or stash changes first.`));
      return;
    }

    const ok = applyGitUpdate(installInfo.path, gitStatus.branch);
    if (ok) {
      console.log(fmt.brightGreen(`✓ Updated dt repository to latest version.`));
    }
  } else if (installInfo.type === 'homebrew') {
    const remote = await fetchLatestNpmVersion(4000);
    if (remote.error) {
      console.log(fmt.red(`Failed to check latest version: ${remote.error}`));
      return;
    }

    if (!isNewerVersion(remote.version, pkg.version)) {
      console.log(fmt.brightGreen(`✓ dt v${pkg.version} is up-to-date (latest: v${remote.version}).`));
      return;
    }

    console.log(fmt.brightCyan(`New version available: v${remote.version} (current: v${pkg.version}).`));

    if (subCommand === '--check' || args.check) {
      console.log(fmt.yellow(`Update available: run "dt update" or "brew upgrade dt" to install.`));
      return;
    }

    const ok = applyHomebrewUpdate();
    if (ok) {
      console.log(fmt.brightGreen(`✓ Upgraded dt via Homebrew successfully.`));
    }
  } else {
    // NPM or local
    const remote = await fetchLatestNpmVersion(4000);
    if (remote.error) {
      console.log(fmt.red(`Failed to check npm registry: ${remote.error}`));
      return;
    }

    if (!isNewerVersion(remote.version, pkg.version)) {
      console.log(fmt.brightGreen(`✓ dt v${pkg.version} is up-to-date (latest: v${remote.version}).`));
      return;
    }

    console.log(fmt.brightCyan(`New version available: v${remote.version} (current: v${pkg.version}).`));

    if (subCommand === '--check' || args.check) {
      console.log(fmt.yellow(`Update available: run "dt update" or "npm install -g @devopstribune/cli@latest" to install.`));
      return;
    }

    const ok = applyNpmUpdate();
    if (ok) {
      console.log(fmt.brightGreen(`✓ Updated dt to v${remote.version} successfully.`));
    }
  }

  state.lastCheckDate = new Date().toISOString().slice(0, 10);
  state.lastCheckTimestamp = Date.now();
  saveState(state);
}

module.exports = {
  detectInstallType,
  isNewerVersion,
  checkGitRemoteUpdates,
  fetchLatestNpmVersion,
  maybeAutoUpdate,
  handleUpdateCommand,
  loadState,
  saveState
};
