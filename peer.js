const Hyperswarm = require('hyperswarm')
const readline = require('readline')
const goodbye = require('graceful-goodbye')

module.exports = {
  create_topic,
  chat,
}
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
  const user = await question("Whats your user?\n:")
  const prefix = user + ': '
  const room_name = await question("In which room will you enter?\n:")
  const room = 'v142857-chat-demo-' + room_name;
  const topic = create_topic(room)
  const swarm = new Hyperswarm()

  swarm.on('connection', conn => {
    int.write(`Someone connected!\n${swarm.connections.size} connections\n${prefix}`)
    conn.on('data', msg => {
      const { user, data } = JSON.parse(msg)
      int.write(`\n${user}: ${data}\n${prefix}`)
    })
    conn.on('close', () => {
      int.write(`Someone disconnected!\n${swarm.connections.size} connections\n${prefix}`)
    })
    conn.on('error', console.error)
  })

  const discovery = swarm.join(topic)
  goodbye(async () => {
    int.write("Initializing shutdown sequence... ");
    await Promise.all(swarm.connections.map(conn => conn.end()))
    await swarm.leave(topic)
    await swarm.destroy()
    int.write("done!\n")
  })

  await discovery.flushed().then(() => int.write("Room joined succesfully\n"))

  while (true) {
    const input = await question(prefix)
    swarm.connections.forEach(conn => {
      conn.write(JSON.stringify({ user, data: input }))
    })
  }

}
async function chat({ swarm: swarm_instance, room: initial_room, nick: initial_nick } = {}, protocol) {
  const notify = protocol(listen)
  const swarm = swarm_instance || new Hyperswarm()
  swarm.on('connection', (conn, data) => {
    notify({ head: [data.publicKey], type: 'connection', data })
    conn.on('data', data => notify(JSON.parse(data)))
    conn.on('close', () => notify({ type: 'disconnect', head: [data.publicKey] }))
    conn.on('error', e => (console.error(e), notify({ type: 'disconnect', head: [data.publicKey] })))
  })
  var topic = initial_room ? create_topic(initial_room) : undefined
  if (topic) await swarm.join(topic).flushed()
  var nick = initial_nick || undefined
  if (nick && topic) await send_to_all_peers({head: [], type: 'nick', data: nick})
  async function listen(message) {
    const { head: [from], type, data } = message
    const handle = {
      "send-message": send_message,
      "change-topic": change_topic,
      "change-nick": change_nick,
      "connections": notify_connections,
    }
    await handle[type]()

    async function send_message() {
      await send_to_all_peers({ head: [], type: "message", data })
    }
    async function change_topic() {
      if (topic) swarm.leave(topic)
      topic = create_topic(data)
      await swarm.join(topic).flushed()
    }
    async function change_nick() {
      await send_to_all_peers({ head: [], type: "nick", data })
    }
    async function notify_connections() {
      await notify({ type: "connections", data: swarm.connections.size })
    }
  }
  async function send_to_all_peers(message) {
    await Promise.all(() => [...swarm.connections].map(conn => conn.send(JSON.stringify(message))))
  }
}
function create_topic(topic) {
  return require('crypto').createHash('sha256').update(topic).digest()
}