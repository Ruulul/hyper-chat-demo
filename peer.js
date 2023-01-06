const Hyperswarm = require('hyperswarm')
const readline = require('readline')
const goodbye = require('graceful-goodbye')

run_chat()

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
async function run_chat() {
  const int = process.stdout
  const user = await question("Whats your user?\n:")
  const prefix = user + ': '
  const room_name = await question("In which room will you enter?\n:")
  const room = 'v142857-chat-demo-' + room_name;
  const topic = require('crypto').createHash('sha256').update(room).digest()
  console.log(topic)
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