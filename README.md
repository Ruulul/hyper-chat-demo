## Starting the cli
```bash
pnpm start # or pnpm run cli
# enter your user and topic of choice
# use /nick [nick] to change your nick, 
# /topic [topic] to change the room, 
# /connections to list the connections and nicks at the moment
# /q, /quit or /exit to end the application
```

## Using in code
```js
const Chat = require("hyper-chat-demo")
let chat_instance = await Chat(options = { swarm: swarm_instance, room: initial_room, info: initial_info }, 
    chat_instance => //protocol function, you can catch and manage the chat instance by the argument of this function instead
        message => { //listener function, receives message from the component
            const { head: [from], type, data } = message
            const handlers = { 
                message, //your main event, sent by users
                info, //your info/awareness info of the peer
                update, //for partial updates of the info object
                connection, //fired when a peer connects
                disconnect, //fired when a peer disconnects
                connections, //fired when the number of connections is notified (you request that event)
            }
            handlers[type]()
        })
chat_instance({ type: "message" | "change-topic" | "info" | "update" | "connections" | "exit", data: /** the new topic, info/info update, or the message you will send */ })
```