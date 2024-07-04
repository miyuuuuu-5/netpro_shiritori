const express = require('express');
const expressWs = require('express-ws');

const app = express();
expressWs(app);

let clients = [];
let usedWords = new Set();
let currentWord = '';
let currentTurn = 0;
let wordLength = 3; // Default word length
let responseTime = 30 * 1000; // Default response time in ms
let timeout;
let gameStarted = false; // ゲームが開始されたかどうかを管理

// Convert small kana to large kana
const convertKana = (char) => {
  const kanaMap = {'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ'};
  return kanaMap[char] || char;
};

// Generate unique ID
const generateId = () => {
  return `${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
};

// Validate word
const validateWord = (word) => {
  if (usedWords.has(word)) {
    return 'その言葉は一度使われています';
  }
  if (word.length !== wordLength) {
    return `文字数が違います。${wordLength}文字の単語を入力してください。`;
  }
  const lastChar = currentWord.slice(-1);
  const nextChar = (lastChar === 'ー') ? currentWord.slice(-2, -1) : lastChar;
  if (currentWord && word[0] !== convertKana(nextChar)) {
    return `「${convertKana(nextChar)}」で始まる単語を入力してください。`;
  }
  if (word.slice(-1) === 'ん') {
    return '「ん」で終わる単語を言ったため敗北です。';
  }
  return null;
};

// Handle client connection
app.ws('/shiritory', (ws, req) => {
  const id = generateId();
  clients.push({id, ws});
  ws.send(JSON.stringify({type: 'system', message: 'しりとりゲームに接続されました'}));

  ws.on('message', (msg) => {
    const message = JSON.parse(msg);

    if (message.type === 'start') {
      if (!gameStarted) {
        gameStarted = true;
        broadcast({type: 'system', message: 'しりとりゲーム開始まで\n3\n2\n1\nスタート'});
        nextTurn();
      }
    }

    if (message.type === 'word' && gameStarted) {
      if (clients[currentTurn].id !== id) {
        ws.send(JSON.stringify({type: 'system', message: '現在のプレイヤーの順番ではありません'}));
        return;
      }

      const error = validateWord(message.word);
      if (error) {
        ws.send(JSON.stringify({type: 'system', message: error}));
      } else {
        usedWords.add(message.word);
        currentWord = message.word;
        broadcast({type: 'word', word: message.word, player: id});
        nextTurn();
      }
    }
  });

  ws.on('close', () => {
    clients = clients.filter(client => client.id !== id);
  });
});

const nextTurn = () => {
  clearTimeout(timeout);
  currentTurn = (currentTurn + 1) % clients.length;
  wordLength = Math.floor(Math.random() * 5) + 2; // Random word length between 2 and 6
  const player = clients[currentTurn].id;
  const lastChar = currentWord.slice(-1);
  const nextChar = (lastChar === 'ー') ? currentWord.slice(-2, -1) : lastChar;
  broadcast({type: 'system', message: `頭文字「${convertKana(nextChar)}」文字数「${wordLength}」 プレイヤーの順番: ${player}`});
  timeout = setTimeout(() => {
    broadcast({type: 'system', message: `プレイヤー${player}は時間切れで敗北です。`});
    process.exit(); // or any other logic to handle game end
  }, responseTime);
};

const broadcast = (message) => {
  clients.forEach(client => client.ws.send(JSON.stringify(message)));
};

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
