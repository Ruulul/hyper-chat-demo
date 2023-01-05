const page = `
    <h1> Hello World! </h1>
    From electron
`
document.body.innerHTML = page
const output = document.createElement('span')
output.textContent = 'Waiting server answer...'
document.body.append(output)
window.versions.ping().then(new_text => output.textContent = new_text)