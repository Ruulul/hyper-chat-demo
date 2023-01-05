const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
    ping: () => ipcRenderer.invoke('ping'),
})