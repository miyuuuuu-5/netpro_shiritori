document.addEventListener('DOMContentLoaded', () => {
    const ws = new WebSocket(`ws://${window.location.host}/shiritory`);
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const sendButton = document.getElementById('send');
    const startButton = document.getElementById('start');
  
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const messageElement = document.createElement('div');
      messageElement.textContent = message.type === 'system' ? `システム: ${message.message}` : `${message.player}: ${message.word}`;
      messages.appendChild(messageElement);
    };
  
    sendButton.addEventListener('click', () => {
      const word = input.value.trim();
      if (word) {
        ws.send(JSON.stringify({type: 'word', word}));
        input.value = '';
      }
    });
  
    startButton.addEventListener('click', () => {
      ws.send(JSON.stringify({type: 'start'}));
    });
  });
  