function main() {
    const host = location.origin.replace(/^http/, 'ws');
    const ws = new WebSocket(host + '/ws');
    const form = document.querySelector('.form');
    const input = document.querySelector('.input');
    const startGameButton = document.getElementById('start-game');
    const timeoutInput = document.getElementById('timeout');
    const nameInput = document.getElementById('name');
    const entryButton = document.getElementById('entry');
    const submitButton = document.querySelector('.submit');
    const timerElement = document.getElementById('timer');
    let timerInterval = null;

    form.onsubmit = function (e) {
        e.preventDefault();
        const text = input.value;
        ws.send(JSON.stringify({ type: 'word', word: text }));
        input.value = '';
        input.focus();
        resetTimerDisplay(); // 相手のターンになるのでタイマー表示をリセット
    };

    // Enterキー押下時の処理
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.onsubmit(e);
        }
    });

    // 送信ボタン押下時の処理
    submitButton.onclick = function (e) {
        e.preventDefault();
        form.onsubmit(e);
    };

    // サーバーからのメッセージ受信時の処理
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
            if (response.timeout) {
                startTimer(response.timeout);
            } else {
                resetTimerDisplay();
            }
        }
        messageList.appendChild(li);
    };

    ws.onerror = function (error) {
        console.error('WebSocket Error: ', error);
    };

    entryButton.onclick = function () {
        const name = nameInput.value.trim();
        if (!name) {
            alert('名前を入力してください！');
            return;
        }
        ws.send(JSON.stringify({ type: 'entry', name }));
    };

    startGameButton.onclick = function () {
        let timeout = parseInt(timeoutInput.value);
        if (isNaN(timeout) || timeout <= 0) {
            alert('自然数を入力してください！');
            return;
        }
        timeout = timeout * 1000; // 秒をミリ秒に変換
        ws.send(JSON.stringify({ type: 'start', timeout }));
    };

    function startTimer(timeout) {
        clearInterval(timerInterval);
        let timeLeft = timeout / 1000; // ミリ秒を秒に変換
        timerElement.textContent = `残り時間: ${timeLeft}秒`;

        timerInterval = setInterval(() => {
            timeLeft -= 1;
            timerElement.textContent = `残り時間: ${timeLeft}秒`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerElement.textContent = '時間切れ！';
            }
        }, 1000);
    }

    function resetTimerDisplay() {
        clearInterval(timerInterval);
        timerElement.textContent = '残り時間: --秒';
    }
}

main();
