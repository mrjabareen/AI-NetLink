const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('netlinkPublisher', {
  getInitialState: () => ipcRenderer.invoke('publisher:get-initial-state'),
  chooseProjectFolder: () => ipcRenderer.invoke('publisher:choose-project-folder'),
  saveSettings: (payload) => ipcRenderer.invoke('publisher:save-settings', payload),
  saveCurrentProject: (payload) => ipcRenderer.invoke('publisher:save-current-project', payload),
  selectSavedProject: (projectId) => ipcRenderer.invoke('publisher:select-saved-project', projectId),
  deleteSavedProject: (projectId) => ipcRenderer.invoke('publisher:delete-saved-project', projectId),
  refreshProject: (payload) => ipcRenderer.invoke('publisher:refresh-project', payload),
  loadVersion: (payload) => ipcRenderer.invoke('publisher:load-version', payload),
  saveVersionDraft: (payload) => ipcRenderer.invoke('publisher:save-version-draft', payload),
  publishRelease: (payload) => ipcRenderer.invoke('publisher:publish-release', payload),
});
