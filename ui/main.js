const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const Chat = require('../peer.js')
var chat = undefined

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

app.whenReady().then(async () => {
    var win = createWindow()

    await Chat(undefined, notify => {
        chat = notify
        return message => {
            const { head: [from], type, data } = message
            const handle = {
                message: handle_message, nick, 
                connection, disconnect, connections, 
            }
            handle[type]()
            function handle_message() {
                console.log("got message")
                win.webContents.send('new-message', message)
            }
            function nick() {
                console.log("got nick")
                win.webContents.send('nick', message)
            }
            function connection() {
                console.log("got connection")
                win.webContents.send('connection', message)
            }
            function connections() {
                console.log("connections requested")
                win.webContents.send('connections', data)
            }
            function disconnect() {
                console.log("someone leave")
                win.webContents.send('disconnect', message)
            }
        }
    })
    ipcMain.handle('join-topic', join_topic)
    ipcMain.handle('send-message', send_message)
    ipcMain.on('exit', exit)
    ipcMain.on('change-nick', (_, data) => chat({type: 'change-nick', data}))

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
    await chat({type: 'change-topic', data: new_topic})
}

async function send_message(_, message) {
    await chat({type: 'message', data: message})
}

async function exit() {
    await chat({type: 'exit'})
    console.log("Everything cleaned up!")
}