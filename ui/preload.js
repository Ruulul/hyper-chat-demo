const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    b4a: require('b4a'),
    join_topic: topic => ipcRenderer.invoke('join-topic', topic),
    send_message: message => ipcRenderer.invoke('send-message', message),
    onmessage: callback => ipcRenderer.on('new-message', callback),
    onconnect: callback => ipcRenderer.on('connect', callback),
    ondisconnect: callback => ipcRenderer.on('disconnect', callback),
})