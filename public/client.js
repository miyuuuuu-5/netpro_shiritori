function main() {
    const host = location.origin.replace(/^http/, 'ws');
    const ws = new WebSocket(host + '/ws');
    const form = document.querySelector('.form');
    const input = document.querySelector('.input');
    const startGameButton = document.getElementById('start-game');
    const timeoutInput = document.getElementById('timeout');
    const nameInput = document.getElementById('name');
    const entryButton = document.getElementById('entry');
    const submitButton = document.querySelector('.submit'); // 追加

    form.onsubmit = function (e) {
        e.preventDefault();
        const text = input.value;
        ws.send(JSON.stringify({ type: 'word', word: text }));
        input.value = '';
        input.focus();
    };

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.onsubmit(e);
        }
    });

    submitButton.onclick = function (e) { // 追加
        e.preventDefault();
        form.onsubmit(e);
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

    entryButton.onclick = function () {
        const name = nameInput.value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        ws.send(JSON.stringify({ type: 'entry', name }));
    };

    startGameButton.onclick = function () {
        let timeout = parseInt(timeoutInput.value);
        if (isNaN(timeout) || timeout <= 0) {
            alert('Please enter a valid positive number for the timeout.');
            return;
        }
        timeout = timeout * 1000; // 秒をミリ秒に変換
        ws.send(JSON.stringify({ type: 'start', timeout }));
    };
}

main();
