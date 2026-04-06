const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('netlinkPublisher', {
  getInitialState: () => ipcRenderer.invoke('publisher:get-initial-state'),
  chooseProjectFolder: () => ipcRenderer.invoke('publisher:choose-project-folder'),
  saveSettings: (payload) => ipcRenderer.invoke('publisher:save-settings', payload),
  refreshProject: (payload) => ipcRenderer.invoke('publisher:refresh-project', payload),
  loadVersion: (payload) => ipcRenderer.invoke('publisher:load-version', payload),
  saveVersionDraft: (payload) => ipcRenderer.invoke('publisher:save-version-draft', payload),
  publishRelease: (payload) => ipcRenderer.invoke('publisher:publish-release', payload),
});
