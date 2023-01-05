const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const Hyperswarm = require('hyperswarm')
const swarm = new Hyperswarm()
var topic = undefined

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
        }
    })
    win.loadFile(path.join(__dirname, 'index.html'))

    swarm.on('connection', conn => {
        conn.on('data', message => win.webContents.send('new-message', JSON.parse(message)))
        conn.on('error', console.log)
    })
}

app.whenReady().then(() => {
    createWindow()

    ipcMain.handle('join-topic', join_topic)
    ipcMain.handle('send-message', send_message)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

async function join_topic(_, new_topic) {
    if (topic) {
        await Promise.all([...swarm.connections].map(conn => conn.end()))
        await swarm.leave(topic)
    }
    topic = new_topic
    await swarm.join(topic).flushed()
}

async function send_message(_, message) {
    for (const [thinghy, conn] of swarm.connections.entries())
        conn.write(JSON.stringify(message))
}