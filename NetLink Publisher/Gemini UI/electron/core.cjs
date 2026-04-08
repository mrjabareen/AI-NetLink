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
    selectedProjectId: '',
    savedProjects: [],
  };
}

function normalizeSavedProject(profile = {}) {
  const projectPath = String(profile.projectPath || '').trim();
  const repoUrl = String(profile.repoUrl || '').trim();
  const githubUser = String(profile.githubUser || '').trim();
  const githubToken = String(profile.githubToken || '').trim();
  const name = String(
    profile.name
    || path.basename(projectPath)
    || repoUrl.replace(/^https?:\/\//i, '').replace(/\.git$/i, '')
    || 'Saved Project',
  ).trim();

  return {
    id: String(profile.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    name,
    projectPath,
    repoUrl,
    githubUser,
    githubToken,
  };
}

function normalizeConfig(config = {}) {
  const defaults = getDefaultConfig();
  const savedProjects = Array.isArray(config.savedProjects)
    ? config.savedProjects.map((item) => normalizeSavedProject(item))
    : [];

  return {
    projectPath: String(config.projectPath || defaults.projectPath),
    repoUrl: String(config.repoUrl || defaults.repoUrl),
    githubUser: String(config.githubUser || defaults.githubUser),
    githubToken: String(config.githubToken || defaults.githubToken),
    selectedProjectId: String(config.selectedProjectId || defaults.selectedProjectId),
    savedProjects,
  };
}

function getSettingsFromProfile(profile) {
  return {
    projectPath: String(profile?.projectPath || ''),
    repoUrl: String(profile?.repoUrl || ''),
    githubUser: String(profile?.githubUser || ''),
    githubToken: String(profile?.githubToken || ''),
  };
}

function loadConfig(userDataDir) {
  const configPath = getConfigPath(userDataDir);
  const defaults = getDefaultConfig();
  if (!fs.existsSync(configPath)) return defaults;

  try {
    return normalizeConfig(readJsonFile(configPath));
  } catch {
    return defaults;
  }
}

function saveConfig(userDataDir, config) {
  const configPath = getConfigPath(userDataDir);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  writeUtf8NoBomFile(configPath, JSON.stringify(normalizeConfig(config), null, 2));
}

function getConfigResponse(config) {
  return {
    settings: {
      projectPath: config.projectPath,
      repoUrl: config.repoUrl,
      githubUser: config.githubUser,
      githubToken: config.githubToken,
    },
    savedProjects: config.savedProjects || [],
    selectedProjectId: config.selectedProjectId || '',
  };
}

function saveCurrentProject(userDataDir, payload) {
  const config = loadConfig(userDataDir);
  const normalized = normalizeSavedProject({
    ...payload,
    id: payload.projectId || payload.selectedProjectId || '',
  });
  const existingIndex = config.savedProjects.findIndex((item) => item.id === normalized.id);
  if (existingIndex >= 0) {
    config.savedProjects[existingIndex] = normalized;
  } else {
    config.savedProjects.unshift(normalized);
  }

  Object.assign(config, getSettingsFromProfile(normalized), {
    selectedProjectId: normalized.id,
  });
  saveConfig(userDataDir, config);
  return getConfigResponse(config);
}

function selectSavedProject(userDataDir, projectId) {
  const config = loadConfig(userDataDir);
  const selected = (config.savedProjects || []).find((item) => item.id === projectId);
  if (!selected) {
    throw new Error('Saved project was not found.');
  }

  Object.assign(config, getSettingsFromProfile(selected), {
    selectedProjectId: selected.id,
  });
  saveConfig(userDataDir, config);
  return getConfigResponse(config);
}

function deleteSavedProject(userDataDir, projectId) {
  const config = loadConfig(userDataDir);
  const remaining = (config.savedProjects || []).filter((item) => item.id !== projectId);
  config.savedProjects = remaining;

  if (config.selectedProjectId === projectId) {
    const next = remaining[0] || null;
    config.selectedProjectId = next?.id || '';
    Object.assign(config, next ? getSettingsFromProfile(next) : getDefaultConfig());
    config.savedProjects = remaining;
  }

  saveConfig(userDataDir, config);
  return getConfigResponse(config);
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

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeSecrets(text, secrets = []) {
  let output = String(text || '');
  for (const secret of secrets) {
    const value = String(secret || '').trim();
    if (!value) continue;
    output = output.replace(new RegExp(escapeRegex(value), 'g'), '***');
  }
  return output;
}

function chunkArray(items, chunkSize = 80) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

const GENERATED_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  'release',
  'release-portable',
  'win-unpacked',
  '.next',
  '.nuxt',
  'coverage',
  'tmp',
  'temp',
  'logs',
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.asar',
  '.bin',
  '.pak',
  '.msi',
  '.iso',
  '.dmg',
  '.zip',
  '.7z',
  '.rar',
  '.gz',
  '.tar',
  '.db',
  '.sqlite',
  '.sqlite3',
  '.mdb',
  '.accdb',
  '.log',
]);

function toGitRelativePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '').trim();
}

function shouldIgnoreProjectPath(filePath) {
  const relativePath = toGitRelativePath(filePath);
  if (!relativePath) return true;

  if (
    relativePath === '.trae'
    || relativePath.startsWith('.trae/')
    || relativePath === 'DB_CLEAN_DEPLOY'
    || relativePath.startsWith('DB_CLEAN_DEPLOY/')
    || relativePath === 'NetLink Enterprise DB'
    || relativePath.startsWith('NetLink Enterprise DB/')
    || relativePath === 'AI NetLink Interface/ai-net-link/.wwebjs_cache'
    || relativePath.startsWith('AI NetLink Interface/ai-net-link/.wwebjs_cache/')
    || relativePath === 'AI NetLink Interface/ai-net-link/git_config.json'
  ) {
    return true;
  }

  const segments = relativePath.split('/');
  if (segments.some((segment) => GENERATED_DIR_NAMES.has(segment))) {
    return true;
  }

  const extension = path.extname(relativePath).toLowerCase();
  return BLOCKED_EXTENSIONS.has(extension);
}

async function getTrackedFiles(repoRoot) {
  const { stdout } = await runGit(['ls-files', '-z'], repoRoot);
  return stdout ? stdout.split('\u0000').map((item) => item.trim()).filter(Boolean) : [];
}

async function getUntrackedFiles(repoRoot) {
  const { stdout } = await runGit(['ls-files', '--others', '--exclude-standard', '-z'], repoRoot);
  return stdout ? stdout.split('\u0000').map((item) => item.trim()).filter(Boolean) : [];
}

async function stagePublishableChanges(repoRoot) {
  const trackedFiles = await getTrackedFiles(repoRoot);
  const trackedIgnored = trackedFiles.filter((filePath) => shouldIgnoreProjectPath(filePath));

  for (const chunk of chunkArray(trackedIgnored)) {
    if (chunk.length > 0) {
      await runGit(['rm', '-r', '--cached', '--ignore-unmatch', '--', ...chunk], repoRoot);
    }
  }

  await runGit(['add', '-u', '--', '.'], repoRoot);

  const untrackedFiles = await getUntrackedFiles(repoRoot);
  const allowedUntracked = untrackedFiles.filter((filePath) => !shouldIgnoreProjectPath(filePath));
  for (const chunk of chunkArray(allowedUntracked)) {
    if (chunk.length > 0) {
      await runGit(['add', '--', ...chunk], repoRoot);
    }
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

const REMOTE_VERSION_PATH = 'AI NetLink Interface/ai-net-link/public/version.json';

function getGitHubHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'NetLinkPublisher',
  };
  if (token && String(token).trim()) {
    headers.Authorization = `token ${String(token).trim()}`;
  }
  return headers;
}

async function getGitHubContentMeta(repoUrl, token, remotePath, ref = 'main') {
  const repo = getGitHubRepoInfo(repoUrl);
  const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${encodeURIComponent(remotePath)}?ref=${encodeURIComponent(ref)}`;
  const response = await fetch(apiUrl, { headers: getGitHubHeaders(token) });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`GitHub content fetch failed (${response.status}) ${errorBody}`.trim());
  }
  return response.json();
}

async function updateGitHubFile(repoUrl, token, remotePath, contentUtf8, message, branch = 'main') {
  const repo = getGitHubRepoInfo(repoUrl);
  const meta = await getGitHubContentMeta(repoUrl, token, remotePath, branch);
  const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${encodeURIComponent(remotePath)}`;
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      ...getGitHubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(String(contentUtf8 || ''), 'utf8').toString('base64'),
      sha: meta.sha,
      branch,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`GitHub update failed (${response.status}) ${errorBody}`.trim());
  }

  return response.json();
}

async function getRemoteVersionData(repoUrl, token) {
  if (!repoUrl || !String(repoUrl).trim()) {
    return null;
  }

  const meta = await getGitHubContentMeta(repoUrl, token, REMOTE_VERSION_PATH, 'main');
  if (!meta.content) {
    throw new Error('Could not read the current GitHub version.');
  }

  const content = Buffer.from(String(meta.content).replace(/\n/g, ''), 'base64').toString('utf8');
  return JSON.parse(stripBom(content));
}

async function diagnoseGitHub(input) {
  const repoUrl = String(input?.repoUrl || '').trim();
  const token = String(input?.githubToken || '').trim();
  if (!repoUrl) {
    throw new Error('Enter the GitHub repository URL first.');
  }

  const repo = getGitHubRepoInfo(repoUrl);
  const repoApiUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}`;
  const headers = getGitHubHeaders(token);

  const result = {
    repo: `${repo.owner}/${repo.name}`,
    remotePath: REMOTE_VERSION_PATH,
    reachable: false,
    tokenProvided: Boolean(token),
    authValid: false,
    tokenUser: null,
    repoAccess: false,
    versionFileReadable: false,
    scopes: [],
    githubVersion: null,
    branch: 'main',
    checks: [],
  };

  try {
    if (token) {
      const authResponse = await fetch('https://api.github.com/user', { headers });
      if (authResponse.ok) {
        const authMeta = await authResponse.json();
        result.authValid = true;
        result.tokenUser = authMeta?.login || null;
        result.checks.push({
          label: 'Token Authentication',
          ok: true,
          detail: result.tokenUser ? `Authenticated as ${result.tokenUser}` : 'Authenticated token',
        });
      } else {
        const authError = await authResponse.text().catch(() => '');
        result.checks.push({
          label: 'Token Authentication',
          ok: false,
          detail: `GitHub rejected the token (${authResponse.status}) ${authError}`.trim(),
        });
      }
    } else {
      result.checks.push({
        label: 'Token Authentication',
        ok: false,
        detail: 'No GitHub token was provided.',
      });
    }

    const repoResponse = await fetch(repoApiUrl, { headers });
    const scopeHeader = repoResponse.headers.get('x-oauth-scopes') || '';
    result.scopes = scopeHeader.split(',').map((item) => item.trim()).filter(Boolean);

    if (!repoResponse.ok) {
      const errorBody = await repoResponse.text().catch(() => '');
      throw new Error(`GitHub repository access failed (${repoResponse.status}) ${errorBody}`.trim());
    }

    const repoMeta = await repoResponse.json();
    result.reachable = true;
    result.repoAccess = true;
    if (repoMeta?.default_branch) {
      result.branch = String(repoMeta.default_branch);
    }
    result.checks.push({ label: 'Repository Reachability', ok: true, detail: `${repo.owner}/${repo.name}` });

    const versionMeta = await getGitHubContentMeta(repoUrl, token, REMOTE_VERSION_PATH, result.branch);
    result.versionFileReadable = Boolean(versionMeta?.content);
    result.checks.push({ label: 'version.json Access', ok: result.versionFileReadable, detail: REMOTE_VERSION_PATH });

    if (versionMeta?.content) {
      const content = Buffer.from(String(versionMeta.content).replace(/\n/g, ''), 'base64').toString('utf8');
      const parsed = JSON.parse(stripBom(content));
      result.githubVersion = parsed?.version || null;
    }

    if (token) {
      result.checks.push({
        label: 'Token Scope',
        ok: result.scopes.length > 0,
        detail: result.scopes.length ? result.scopes.join(', ') : 'No scopes returned by GitHub',
      });
    }

    return result;
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/ENOTFOUND|Could not resolve host|fetch failed|Failed to fetch/i.test(message)) {
      throw new Error('GitHub is unreachable right now. Check your internet connection or DNS settings.');
    }
    throw new Error(message);
  }
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
  const githubUser = String(input.githubUser || '').trim();
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

  saveVersionData(context.versionPath, version, buildDate, changelog);

  try {
    // Ensure git identity exists for automated release commits.
    const commitUser = githubUser || 'netlink-publisher';
    await runGit(['config', 'user.name', commitUser], context.repoRoot);
    await runGit(['config', 'user.email', `${commitUser}@users.noreply.github.com`], context.repoRoot);

    // Stage only publishable files (excludes DB, binaries, caches...).
    await stagePublishableChanges(context.repoRoot);

    const stagedResult = await runGit(['diff', '--cached', '--name-only'], context.repoRoot);
    if (!stagedResult.stdout) {
      throw new Error('No publishable changes were found. Make sure you saved your code changes before publishing.');
    }

    await runGit(['commit', '-m', `release: v${version}`], context.repoRoot);

    const authenticatedUrl = buildAuthenticatedUrl(repoUrl, token);
    await runGit(['remote', 'set-url', 'origin', authenticatedUrl], context.repoRoot);
    await runGit(['fetch', 'origin', 'main'], context.repoRoot);
    await runGit(['pull', '--rebase', 'origin', 'main'], context.repoRoot);
    await runGit(['push', 'origin', 'HEAD:main'], context.repoRoot);
    return getProjectState(input);
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/could not apply|CONFLICT/i.test(message)) {
      throw new Error('Git rebase conflict detected. Please run a manual pull/rebase once, resolve conflicts if any, then publish again.');
    }
    if (/ENOTFOUND|Could not resolve host|Failed to fetch|fetch failed/i.test(message)) {
      throw new Error('Could not reach GitHub. Check your internet connection or DNS settings, then try again.');
    }
    throw new Error(sanitizeSecrets(message, [token]));
  }
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
  return { ...getConfigResponse(settings), project };
}

module.exports = {
  loadConfig,
  saveConfig,
  saveCurrentProject,
  selectSavedProject,
  deleteSavedProject,
  getInitialState,
  getProjectState,
  diagnoseGitHub,
  saveVersionDraft,
  publishRelease,
};
