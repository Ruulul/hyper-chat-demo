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
    return win
}

app.whenReady().then(() => {
    var win = createWindow()

    ipcMain.handle('join-topic', join_topic)
    ipcMain.handle('send-message', send_message)
    ipcMain.on('exit', exit)
    swarm.on('connection', conn => {
        win.webContents.send('connect', { connections: swarm.connections.size })
        conn.on('data', message => win.webContents.send('new-message', JSON.parse(message)))
        conn.on('close', () => win.webContents.send('disconnect'))
        conn.on('error', console.error)
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) win = createWindow()
    })
})

app.on('window-all-closed', async () => {
    if (process.platform !== 'darwin') {
        await exit()
        app.quit()
    }
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

async function exit() {
    if (swarm.destroyed) return app.quit()
    await Promise.all([...swarm.connections].map(conn => conn.end()))
    if (topic) await swarm.leave(topic)
    await swarm.destroy()
    console.log("Everything cleaned up!")
}