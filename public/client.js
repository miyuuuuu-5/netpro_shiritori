function main() {
  const host = location.origin.replace(/^http/, 'ws');
  const ws = new WebSocket(host + '/ws');
  const form = document.querySelector('.form');
  const startGame = (timeLimit) => {
    socket.send(JSON.stringify({ type: 'start', timeLimit }));
};

// ゲーム開始ボタンのイベントリスナー
document.getElementById('startGameButton').addEventListener('click', () => {
    const timeLimit = parseInt(document.getElementById('timeLimitInput').value) || 30;
    startGame(timeLimit);
});


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

  document.getElementById('start-game').onclick = function () {
      ws.send(JSON.stringify({ type: 'start' }));
  };
}

main();
