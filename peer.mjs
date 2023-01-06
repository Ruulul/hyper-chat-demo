import Hyperswarm from 'hyperswarm'
import goodbye from 'graceful-goodbye'
import b4a from 'b4a'
import readline from 'readline'
const int = process.stdout
function question (query = '') {
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

const user = await question("Whats your user?\n:")
const prefix = user + ': '
const room_name = await question("In which room will you enter?\n:")
const room = 'v142857-chat-demo-'+room_name;
const topic = b4a.alloc(32)
b4a.fill(topic, room, 0, room.length)
console.log(topic)
const swarm = new Hyperswarm()

swarm.on('connection', conn => {
    int.write(`Someone connected!\n${swarm.connections.size} connections\n${prefix}`)
    conn.on('data', msg => {
      const {user, data}= JSON.parse(msg)
      int.write(`\n${user}: ${data}\n${prefix}`)
    })
    conn.on('close', ()=>{
      int.write(`Someone disconnected!\n${swarm.connections.size} connections\n${prefix}`)
    })
    conn.on('error', console.error)
})

const discovery = swarm.join(topic)
goodbye(async ()=>{
    int.write("Initializing shutdown sequence... ");
    await Promise.all(swarm.connections.map(conn=>conn.end()))
    await swarm.leave(topic)
    await swarm.destroy()
    int.write("done!\n")
})

await discovery.flushed().then(()=>int.write("Room joined succesfully\n"))

while (true) {
    const input = await question(prefix)
    swarm.connections.forEach(conn => {
        conn.write(JSON.stringify({user, data: input}))
    })
}