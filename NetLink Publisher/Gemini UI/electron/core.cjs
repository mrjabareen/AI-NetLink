const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function stripBom(text = '') {
  return String(text).replace(/^\uFEFF/, '');
}

function readJsonFile(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, 'utf-8')));
}

function writeUtf8NoBomFile(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

function getConfigPath(userDataDir) {
  return path.join(userDataDir, 'publisher-config.json');
}

function getDefaultConfig() {
  return {
    projectPath: '',
    repoUrl: '',
    githubUser: '',
    githubToken: '',
  };
}

function loadConfig(userDataDir) {
  const configPath = getConfigPath(userDataDir);
  const defaults = getDefaultConfig();
  if (!fs.existsSync(configPath)) return defaults;

  try {
    const parsed = readJsonFile(configPath);
    return {
      projectPath: String(parsed.projectPath || defaults.projectPath),
      repoUrl: String(parsed.repoUrl || defaults.repoUrl),
      githubUser: String(parsed.githubUser || defaults.githubUser),
      githubToken: String(parsed.githubToken || defaults.githubToken),
    };
  } catch {
    return defaults;
  }
}

function saveConfig(userDataDir, config) {
  const configPath = getConfigPath(userDataDir);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  writeUtf8NoBomFile(configPath, JSON.stringify({
    projectPath: config.projectPath || '',
    repoUrl: config.repoUrl || '',
    githubUser: config.githubUser || '',
    githubToken: config.githubToken || '',
  }, null, 2));
}

async function runGit(args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 10,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const details = [error.stdout, error.stderr, error.message].filter(Boolean).join('\n').trim();
    throw new Error(details || `git ${args.join(' ')} failed`);
  }
}

async function resolveProjectContext(selectedPath) {
  if (!selectedPath || !String(selectedPath).trim()) {
    throw new Error('Select the project folder first.');
  }

  const candidate = path.resolve(String(selectedPath).trim());
  if (!fs.existsSync(candidate)) {
    throw new Error('The selected folder does not exist.');
  }

  let repoRoot = candidate;
  try {
    const result = await runGit(['rev-parse', '--show-toplevel'], candidate);
    if (result.stdout) {
      repoRoot = result.stdout.split(/\r?\n/)[0].trim();
    }
  } catch {
    repoRoot = candidate;
  }

  let appRoot = path.join(repoRoot, 'AI NetLink Interface', 'ai-net-link');
  const rootVersionPath = path.join(appRoot, 'public', 'version.json');

  if (!fs.existsSync(rootVersionPath)) {
    const directVersionPath = path.join(candidate, 'public', 'version.json');
    const directPackagePath = path.join(candidate, 'package.json');
    if (fs.existsSync(directVersionPath) && fs.existsSync(directPackagePath)) {
      appRoot = candidate;
    } else {
      throw new Error('Could not find ai-net-link inside the selected path.');
    }
  }

  const versionPath = path.join(appRoot, 'public', 'version.json');
  const packagePath = path.join(appRoot, 'package.json');
  const fallbackProjectName = path.basename(repoRoot) || 'AI NetLink';

  let projectName = fallbackProjectName;
  try {
    const packageJson = readJsonFile(packagePath);
    const packageName = String(packageJson.name || '').trim();
    if (packageName && !/^(react-example|app|vite-project)$/i.test(packageName)) {
      projectName = packageName;
    }
  } catch {
    projectName = fallbackProjectName;
  }

  return {
    repoRoot,
    appRoot,
    versionPath,
    packagePath,
    projectName,
  };
}

function loadVersionData(versionPath) {
  if (!fs.existsSync(versionPath)) {
    throw new Error('version.json was not found.');
  }

  const data = readJsonFile(versionPath);
  return {
    version: String(data.version || ''),
    buildDate: String(data.buildDate || ''),
    changelog: Array.isArray(data.changelog) ? data.changelog.map((item) => String(item || '')) : [],
  };
}

function saveVersionData(versionPath, version, buildDate, changelog) {
  const payload = {
    version: String(version || '').trim(),
    buildDate: String(buildDate || '').trim(),
    changelog: Array.isArray(changelog) ? changelog.map((item) => String(item || '').trim()).filter(Boolean) : [],
  };

  writeUtf8NoBomFile(versionPath, JSON.stringify(payload, null, 2));
  return payload;
}

function getGitHubRepoInfo(repoUrl) {
  const cleanRepo = String(repoUrl || '').trim().replace(/\/$/, '').replace(/\.git$/, '');
  if (!/^https:\/\//i.test(cleanRepo)) {
    throw new Error('GitHub repository URL must start with https://');
  }

  const parts = cleanRepo.split('/');
  if (parts.length < 2) {
    throw new Error('GitHub repository URL is invalid.');
  }

  return {
    owner: parts[parts.length - 2],
    name: parts[parts.length - 1],
  };
}

function buildAuthenticatedUrl(repoUrl, token) {
  if (!token || !String(token).trim()) {
    throw new Error('Enter the real GitHub token.');
  }
  return String(repoUrl).trim().replace(/^https:\/\//i, `https://${String(token).trim()}@`);
}

async function getRemoteVersionData(repoUrl, token) {
  if (!repoUrl || !String(repoUrl).trim()) {
    return null;
  }

  const repo = getGitHubRepoInfo(repoUrl);
  const remotePath = 'AI NetLink Interface/ai-net-link/public/version.json';
  const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${encodeURIComponent(remotePath)}?ref=main`;

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'NetLinkPublisher',
  };
  if (token && String(token).trim()) {
    headers.Authorization = `token ${String(token).trim()}`;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`GitHub version fetch failed (${response.status})`);
  }

  const meta = await response.json();
  if (!meta.content) {
    throw new Error('Could not read the current GitHub version.');
  }

  const content = Buffer.from(String(meta.content).replace(/\n/g, ''), 'base64').toString('utf8');
  return JSON.parse(stripBom(content));
}

async function getProjectState({ projectPath, repoUrl, githubToken }) {
  const context = await resolveProjectContext(projectPath);
  const localVersion = loadVersionData(context.versionPath);
  let remoteVersion = null;

  try {
    remoteVersion = await getRemoteVersionData(repoUrl, githubToken);
  } catch {
    remoteVersion = null;
  }

  return {
    projectName: context.projectName,
    repoRoot: context.repoRoot,
    frontendFolder: context.appRoot,
    loadedVersion: localVersion.version,
    buildDate: localVersion.buildDate,
    changelog: localVersion.changelog,
    githubVersion: remoteVersion?.version || null,
  };
}

async function saveVersionDraft(input) {
  const context = await resolveProjectContext(input.projectPath);
  const changelog = Array.isArray(input.changelog)
    ? input.changelog
    : String(input.changelog || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  saveVersionData(context.versionPath, input.version, input.buildDate, changelog);
  return getProjectState(input);
}

async function publishRelease(input) {
  const context = await resolveProjectContext(input.projectPath);
  const repoUrl = String(input.repoUrl || '').trim();
  const token = String(input.githubToken || '').trim();
  const version = String(input.version || '').trim();
  const buildDate = String(input.buildDate || '').trim();
  const changelog = Array.isArray(input.changelog)
    ? input.changelog
    : String(input.changelog || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (!version) throw new Error('Enter the version number.');
  if (!buildDate) throw new Error('Enter the build date.');
  if (changelog.length === 0) throw new Error('Enter the changelog.');

  const remoteVersion = await getRemoteVersionData(repoUrl, token);
  if (remoteVersion?.version === version) {
    throw new Error('The version number is still the same as GitHub. Change the version before publishing.');
  }

  const authenticatedUrl = buildAuthenticatedUrl(repoUrl, token);

  await runGit(['pull', '--rebase', '--autostash', authenticatedUrl, 'main'], context.repoRoot);
  saveVersionData(context.versionPath, version, buildDate, changelog);

  await runGit(['config', 'user.email', 'admin@aljabareen.com'], context.repoRoot);
  await runGit(['config', 'user.name', 'NetLink Windows Publisher'], context.repoRoot);
  await runGit(['config', 'core.longpaths', 'true'], context.repoRoot);
  await runGit(['add', '-A', '.'], context.repoRoot);

  try {
    await runGit(['reset', '-q', '--', 'NetLink Enterprise DB', 'AI NetLink Interface/ai-net-link/git_config.json', 'AI NetLink Interface/ai-net-link/.wwebjs_cache'], context.repoRoot);
  } catch {
    // Ignore optional reset failures.
  }

  try {
    await runGit(['commit', '-m', `release: v${version}`], context.repoRoot);
  } catch (error) {
    const message = String(error.message || '');
    if (!/nothing to commit|no changes added/i.test(message)) {
      throw error;
    }
  }

  await runGit(['push', authenticatedUrl, 'HEAD:main'], context.repoRoot);
  return getProjectState(input);
}

async function getInitialState(userDataDir) {
  const settings = loadConfig(userDataDir);
  let project = null;
  if (settings.projectPath) {
    try {
      project = await getProjectState(settings);
    } catch {
      project = null;
    }
  }
  return { settings, project };
}

module.exports = {
  loadConfig,
  saveConfig,
  getInitialState,
  getProjectState,
  saveVersionDraft,
  publishRelease,
};
