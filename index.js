const Hyperswarm = require('hyperswarm')
const goodbye = require('graceful-goodbye')

module.exports = chat
/**
 * @typedef {{
 *  head: Buffer[],
 *  type: 'message' | 'info' | 'update' | 'change-topic' | 'connections' | 'exit',
 *  data: any
 * }} Command
* @typedef {{
*  head: Buffer[],
*  type: 'message' | 'info' | 'update' | 'connections' | 'connection' | 'disconnect',
*  data: any
* }} Message
 * @function chat
 * @param {{ swarm: Hyperswarm, room: string, info: any}} options 
 * @param {(listen: (message: Command) => Promise<void>) => (message: Message) => Promise<void>} protocol 
 * @returns {(message: Command) => Promise<void>}
 */
async function chat({ swarm: swarm_instance, room: initial_room, info: initial_info } = {}, protocol) {
  const notify = protocol(listen)
  const swarm = swarm_instance || new Hyperswarm()
  goodbye(exit)
  const user_key = swarm.keyPair.publicKey
  var info = initial_info
  swarm.on('connection', (conn, { publicKey: peer }) => {
    if (info) conn.write(JSON.stringify({ head: [user_key], type: 'info', data: info }))
    notify({ head: [peer], type: 'connection' })
    conn.on('data', data => notify({ ...JSON.parse(data), head: [peer] }))
    conn.on('close', () => notify({ type: 'disconnect', head: [peer] }))
    conn.on('error', e => (console.error(e), notify({ type: 'disconnect', head: [peer] })))
  })
  var topic = initial_room ? create_topic(initial_room) : undefined
  if (topic) await swarm.join(topic).flushed()
  return listen
  /**
   * @param {Command} message 
   */
  async function listen(message) {
    const { head: [from] = [], type, data } = message
    const handle = {
      message: send_message,
      info: send_message,
      update: send_message,
      "change-topic": change_topic,
      "connections": notify_connections,
      exit,
    }
    if (type in handle) await handle[type]()
    else console.error("no handle for", type, "message. message: ", message)

    async function send_message() {
      if (type === 'info') info = data
      else if (type === 'update') {
        if (typeof info === 'object')
          Object.assign(info, data)
        else info = data
      }
      await send_to_all_peers({ head: [user_key], type, data })
    }
    async function change_topic() {
      if (topic) {
        await Promise.all([...swarm.connections].map(conn => conn.end()))
        await swarm.leave(topic)
      }
      topic = create_topic(data)
      await swarm.join(topic).flushed()
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