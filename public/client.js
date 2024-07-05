function main() {
    const host = location.origin.replace(/^http/, 'ws');
    const ws = new WebSocket(host + '/ws');
    const form = document.querySelector('.form');
    const startGameButton = document.getElementById('start-game');
    const timeoutInput = document.getElementById('timeout');

    form.onsubmit = function (e) {
        e.preventDefault();
        const input = document.querySelector('.input');
        const text = input.value;
        ws.send(JSON.stringify({ type: 'word', word: text }));
        input.value = '';
        input.focus();
    };

    ws.onmessage = function (msg) {
        const response = JSON.parse(msg.data);
        const messageList = document.querySelector('.messages');
        const li = document.createElement('li');

        if (response.type === 'system') {
            li.textContent = response.message;
        } else if (response.type === 'word') {
            li.textContent = `${response.player}: ${response.word}`;
        } else if (response.type === 'turn') {
            li.textContent = response.message;
        }
        messageList.appendChild(li);
    };

    ws.onerror = function (error) {
        console.error('WebSocket Error: ', error);
    };

    startGameButton.onclick = function () {
        const timeout = parseInt(timeoutInput.value) * 1000; // 秒をミリ秒に変換
        ws.send(JSON.stringify({ type: 'start', timeout }));
    };
}

main();
