const path = require('path');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const core = require('./core.cjs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 820,
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(distPath);
}

app.whenReady().then(() => {
  ipcMain.handle('publisher:get-initial-state', async () => {
    return core.getInitialState(app.getPath('userData'));
  });

  ipcMain.handle('publisher:choose-project-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose Project Folder',
      properties: ['openDirectory'],
    });

    if (result.canceled || !result.filePaths.length) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('publisher:save-settings', async (_event, payload) => {
    core.saveConfig(app.getPath('userData'), payload);
    return { ok: true };
  });

  ipcMain.handle('publisher:save-current-project', async (_event, payload) => {
    return core.saveCurrentProject(app.getPath('userData'), payload);
  });

  ipcMain.handle('publisher:select-saved-project', async (_event, projectId) => {
    return core.selectSavedProject(app.getPath('userData'), projectId);
  });

  ipcMain.handle('publisher:delete-saved-project', async (_event, projectId) => {
    return core.deleteSavedProject(app.getPath('userData'), projectId);
  });

  ipcMain.handle('publisher:refresh-project', async (_event, payload) => {
    return core.getProjectState(payload);
  });

  ipcMain.handle('publisher:load-version', async (_event, payload) => {
    return core.getProjectState(payload);
  });

  ipcMain.handle('publisher:save-version-draft', async (_event, payload) => {
    return core.saveVersionDraft(payload);
  });

  ipcMain.handle('publisher:publish-release', async (_event, payload) => {
    return core.publishRelease(payload);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
