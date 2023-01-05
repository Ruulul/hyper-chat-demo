const { b4a, join_topic, send_message, onmessage } = api;
const room_name = document.createElement("input");
room_name.placeholder = "Insert the room name here!";

const connect_btn = document.createElement("button");
connect_btn.textContent = "Connect!";

const connect_section = document.createElement("section");
connect_section.append(room_name, connect_btn)

document.body.append(connect_section)

const chat_section = document.createElement("section")
const messages = document.createElement("section")
const user_input = document.createElement("input")
var user = undefined
const message = document.createElement("textarea")
const change_user_btn = document.createElement("button")
change_user_btn.textContent = "Change nickname"
const send_message_btn = document.createElement("button")
send_message_btn.textContent = "Send message!"
const user_div = document.createElement("div")
const message_div = document.createElement("div")
user_div.append(user_input, change_user_btn)
message_div.append(message, send_message_btn)
chat_section.append(messages, message_div, user_div)

change_user_btn.onclick = ()=>{
    user = user_input.value
    if (!document.body.contains(chat_section)) {
        chat_section.append(user_div)
        document.body.append(chat_section)
    }
}
send_message_btn.onclick = async ()=>{
    send_message_btn.disabled = true
    await send_message({user, data: message.value})
    messages.innerHTML += `<p><span>${user}: </span>${message.value}`
    message.value = ''
    send_message_btn.disabled = false
}
onmessage((_, {user, data})=>messages.innerHTML += `<p><span>${user}: </span>${data}`)

connect_btn.onclick = async ()=>{
    if (!room_name.value) return
    if (document.body.contains(chat_section)) {
        chat_section.remove()
        messages.innerHTML = ''
    }
    connect_btn.disabled = true
    const topic = 'v142857-chat-demo-' + room_name.value
    const buffer = b4a.alloc(32, topic)
    await join_topic(buffer)
    connect_btn.disabled = false
    if (!user) document.body.append(user_div) 
    else document.body.append(chat_section)
}