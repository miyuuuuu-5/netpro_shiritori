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

    form.onsubmit = function (e) {
        e.preventDefault();
        const text = input.value;
        ws.send(JSON.stringify({ type: 'word', word: text }));
        input.value = '';
        input.focus();
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
    
            // 制限時間の情報が含まれている場合、タイマーを設定
            if (response.message.includes('制限時間は')) {
                const timeout = parseInt(response.message.match(/制限時間は(\d+)秒/)[1]);
                startTimer(timeout);
            }
        } else if (response.type === 'word') {
            li.textContent = `${response.player}: ${response.word}`;
        } else if (response.type === 'turn') {
            li.textContent = response.message;
        }
        messageList.appendChild(li);
    };
    
    // タイマーを開始する関数
    function startTimer(timeout) {
        let timeLeft = timeout;
        const timerElement = document.createElement('div');
        timerElement.className = 'timer';
        timerElement.textContent = `残り時間: ${timeLeft}秒`;
        document.body.appendChild(timerElement);
    
        const timerInterval = setInterval(() => {
            timeLeft -= 1;
            timerElement.textContent = `残り時間: ${timeLeft}秒`;
    
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerElement.textContent = '時間切れ！';
            }
        }, 1000);
    }
    

    // エントリーボタン押下時の処理
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
}

main();
