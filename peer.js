const Hyperswarm = require('hyperswarm')
const readline = require('readline')
const goodbye = require('graceful-goodbye')
const b4a = require('b4a')

module.exports = chat
if (require.main === module) run_cli()

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
async function run_cli() {
  const int = process.stdout
  var user = await question("Whats your user?\n:")
  const prefix = ()=>user + ': '
  const room_name = await question("In which room will you enter?\n:")
  const room = 'v142857-chat-demo-' + room_name;
  var chat_instance = undefined;
  const nicks = {}
  await chat({ room, nick: user }, notify => {
    chat_instance = notify
    return ({ head: [from] = [], type, data }) => {
      const handle = {
        connection, connections, disconnect,
        message,
      }
      handle[type]()
      function connection() {
        int.write(`\n${b4a.toString(from, 'hex')} connected!\n${prefix()}`)
        notify({ type: 'connections' })
      }
      function connections() {
        int.write(`\n${data} connections\n`)
        int.write(`\nknown nicks: `)
        for (const [key, nick] of Object.entries(nicks))
          int.write(`${nick}(${b4a.toString(key, 'hex')}), `)
        int.write(`\n${prefix()}`)
      }
      function disconnect() {
        int.write(`\n${nicks[from] || b4a.toString(from, 'hex')} disconnected!\n${prefix()}`)
        delete nicks[from]
      }
      function message() {
        const message_handles = { nick: handle_nick, message: handle_message }
        for (const key of Object.keys(data)) message_handles[key]() 
      }
      function handle_nick() {
        console.log(from)
        console.log(from instanceof Buffer)
        int.write(`\npeer ${nicks[from] || b4a.toString(from, 'hex')} now is named ${data.nick}\n${prefix()}`)
        nicks[from] = data.nick
      }
      function handle_message() {
        int.write(`\n${nicks[from] || "anom"}: ${data.message}\n${prefix()}`)
      }
    }
  })
  int.write("Entered successfully!")
  while (true) {
    const input = await question(prefix())
    if (input === '/connections') chat_instance({ type: 'connections' })
    else if (input.startsWith('/nick')) 
    { user = input.slice(input.indexOf(' ') + 1) 
      chat_instance({ type: 'change-nick', data: user})
    }
    else if (input.startsWith('/room')) chat_instance({ type: 'change-topic', data: input.slice(input.indexOf(' ') + 1) })
    else chat_instance({ type: 'message', data: input })
  }
}
async function chat({ swarm: swarm_instance, room: initial_room, nick: initial_nick } = {}, protocol) {
  const notify = protocol(listen)
  const swarm = swarm_instance || new Hyperswarm()
  goodbye(exit)
  const user_key = swarm.keyPair.publicKey
  var nick = initial_nick
  swarm.on('connection', (conn, { publicKey: peer }) => {
    if (nick) conn.write(JSON.stringify({ head: [user_key], type: 'message', data: { nick } }))
    notify({ head: [peer], type: 'connection' })
    conn.on('data', data => notify({...JSON.parse(data), head: [peer]}))
    conn.on('close', () => notify({ type: 'disconnect', head: [peer] }))
    conn.on('error', e => (console.error(e), notify({ type: 'disconnect', head: [peer] })))
  })
  var topic = initial_room ? create_topic(initial_room) : undefined
  if (topic) await swarm.join(topic).flushed()
  return listen
  async function listen(message) {
    const { head: [from] = [], type, data } = message
    const handle = {
      "message": send_message,
      "change-topic": change_topic,
      "change-nick": change_nick,
      "connections": notify_connections,
      exit,
    }
    if (type in handle) await handle[type]()
    else console.log("no handle for", type, "message. message: ", message)

    async function send_message() {
      await send_to_all_peers({ head: [user_key], type, data: { message: data } })
    }
    async function change_topic() {
      if (topic) {
        await Promise.all([...swarm.connections].map(conn => conn.end()))
        await swarm.leave(topic)
      }
      topic = create_topic(data)
      await swarm.join(topic).flushed()
    }
    async function change_nick() {
      nick = data
      await send_to_all_peers({ head: [user_key], type: "message", data: { nick } })
    }
    async function notify_connections() {
      await notify({ head: [user_key], type: "connections", data: swarm.connections.size })
    }
  }
  async function send_to_all_peers(message) {
    await Promise.all([...swarm.connections].map(conn => conn.write(JSON.stringify(message))))
  }
  async function exit() {
    await Promise.all([...swarm.connections].map(conn => conn.end()))
    if (topic) await swarm.leave(topic)
    await swarm.destroy()
  }
}
function create_topic(topic) {
  return require('crypto').createHash('sha256').update(topic).digest()
}