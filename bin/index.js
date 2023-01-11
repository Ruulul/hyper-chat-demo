#!/usr/bin/env node 

const readline = require('readline')
const chat = require('..')
const int = process.stdout

cli()

async function cli() {
    var user = await question("Whats your user?\n:")
    const prefix = () => user + ': '
    const room_name = await question("In which room will you enter?\n:")
    const room = 'v142857-chat-demo-' + room_name;
    const nicks = {}
    const chat_instance = await chat({ room, info: user }, notify => {
        chat_instance = notify
        return ({ head: [from] = [], type, data }) => {
            const handle = {
                connection, connections, disconnect,
                message, info, update: info,
            }
            handle[type]()
            function connection() {
                int.write(`\r${from.toString('hex')} connected!\n${prefix()}`)
                notify({ type: 'connections' })
            }
            function connections() {
                int.write(`\r${data} connections\n`)
                int.write(`known nicks:\n`)
                for (const key in nicks) {
                    int.write(`\t${nicks[key]} ( ${Buffer.from(key).toString('hex')} ),\n`)
                }
                int.write(`${prefix()}`)
            }
            function disconnect() {
                int.write(`\r${nicks[from] || from.toString('hex')} disconnected!\n${prefix()}`)
                delete nicks[from]
            }
            function info() {
                int.write(`\rpeer ${nicks[from] || from.toString('hex')} now is named ${data}\n${prefix()}`)
                nicks[from] = data
            }
            function message() {
                int.write(`\r${nicks[from] || "anom"}: ${data}\n${prefix()}`)
            }
        }
    })
    int.write("\nEntered successfully!\n")
    while (true) {
        const input = await question(prefix())
        if (input === '/connections' || input === '/nicks') chat_instance({ type: 'connections' })
        else if (input.startsWith('/nick')) {
            user = input.slice(input.indexOf(' ') + 1)
            chat_instance({ type: 'info', data: user })
        }
        else if (input.startsWith('/room')) chat_instance({ type: 'change-topic', data: input.slice(input.indexOf(' ') + 1) })
        else if (input in ['/exit', '/q', '/quit']) {
            await chat_instance({ type: 'exit' })
            break
        }
        else chat_instance({ type: 'message', data: input })
    }
}

function question(query = '') {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        rl.question(query, function (answer) {
            rl.close()
            resolve(answer)
        })
    })
}