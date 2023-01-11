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
            if (type in handles) handles[type]()
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
                int.write(`\r${data} entered the chat!\n${prefix()}`)
                nicks[from] = data
            }
            function update() {
                int.write(`\n${nicks[from] || from.toString('hex')} is now ${data}\n${prefix()}`)
                nicks[from] = data
            }
            function message() {
                int.write(`\r${nicks[from] || "anom"}: ${data}${
                    ' '.repeat(process.stdout.getWindowSize()[0] - data.length - (nicks[from] || "anom").length - 2)
                }\n${prefix()}`)
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