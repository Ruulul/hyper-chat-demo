#!/usr/bin/env node

const readline = require('readline')
const chat = require('..')
let buffer = ''
const fill_buffer = key => buffer += key

cli()

async function cli() {
    const int = process.stdout
    let user = await question("Whats your user?\n:")
    const prefix = () => user + ': ' + buffer
    const room_name = await question("In which room will you enter?\n:")
    const room = 'v142857-chat-demo-' + room_name;
    const nicks = {}
    const chat_instance = await chat({ room, info: user }, _ => {
        return ({ head: [from] = [], type, data }) => {
            const handles = {
                connections, disconnect,
                message, info, update,
            }
            if (type in handles) {
                clear_line()
                handles[type]()
                int.write(prefix())
            }
            function connections() {
                int.write(`${data} connections\n`)
                int.write(`known nicks:\n`)
                for (const key in nicks) {
                    int.write(`\t${nicks[key]} ( ${Buffer.from(key).toString('hex')} ),\n`)
                }
            }
            function disconnect() {
                int.write(`${nicks[from] || from.toString('hex')} disconnected!\n`)
                delete nicks[from]
            }
            function info() {
                int.write(`${data} entered the chat!\n`)
                nicks[from] = data
            }
            function update() {
                int.write(`${nicks[from] || from.toString('hex')} is now ${data}\n`)
                nicks[from] = data
            }
            function message() {
                int.write(`${nicks[from] || "anom"}: ${data}\n`)
            }
        }
    })
    int.write("\nEntered successfully!\n")
    const commands = {
        help: display_this_help,
        '?': display_this_help,
        connections: require_connections,
        nicks: require_connections,
        nick: change_nick,
        room: change_room,
        exit,
        q: exit,
        quit: exit,
    }
    while (true) {
        const input = await question(prefix())
        const space_index = input.indexOf(' ')
        const after_space = space_index > 0 ? input.slice(space_index + 1) : undefined
        const command = input.slice(1, space_index > 0 ? space_index : undefined)
        if (input[0] === '/') {
            if (command in commands) await commands[command](after_space)
            else int.write(`\nCommand not recognized! (type /? or /help to see the commands)\n${prefix()}`)
        } else chat_instance({ type: 'message', data: input })

        if (['exit', 'q', 'quit'].includes(command)) break
    }
    function display_this_help() {
        help()
    }
    function help() {
        for (const key in commands) {
            int.write(`${key}: ${commands[key].name.replace(/_/g, ' ')}\n`)
        }
        int.write('\n')
    }
    function require_connections() {
        return chat_instance({ type: 'connections' })
    }
    function change_nick(data) {
        user = data
        return chat_instance({ type: 'update', data })
    }
    function change_room(data) {
        return chat_instance({ type: 'change-topic', data })
    }
    function exit() {
        return chat_instance({ type: 'exit' })
    }
}

function clear_line() {
    const white_line = ' '.repeat(process.stdout.getWindowSize()[0])
    process.stdout.write('\r' + white_line + '\r')
}

function question(query = '') {
    if (!process.stdin.listeners('data').includes(fill_buffer)) process.stdin.on('data', fill_buffer)
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        rl.question(query, function (answer) {
            rl.close()
            resolve(answer)
            buffer = ''
        })
    })
}