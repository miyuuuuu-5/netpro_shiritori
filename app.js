const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let clients = [];
let usedWords = [];
let currentPlayer = 0;
let gameStarted = false;
let firstChar = '';

const kanaToHiragana = (kana) => {
    return kana.replace(/[\u30a1-\u30f6]/g, match => {
        const chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
};

const normalizeWord = (word) => {
    const normalized = kanaToHiragana(word).replace(/[ぁぃぅぇぉゃゅょっ]/g, char => {
        const map = { 'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'っ': 'つ' };
        return map[char] || char;
    });
    return normalized;
};

const getLastChar = (word) => {
    let lastChar = word.slice(-1);
    if (lastChar === 'ー') {
        lastChar = word.slice(-2, -1);
    }
    return lastChar;
};

wss.on('connection', (ws) => {
    ws.id = clients.length;
    clients.push(ws);

    ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.type === 'start') {
            if (!gameStarted) {
                gameStarted = true;
                usedWords = [];
                firstChar = 'し';
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'system', message: 'しりとりゲーム開始まで' }));
                        setTimeout(() => client.send(JSON.stringify({ type: 'system', message: '3' })), 1000);
                        setTimeout(() => client.send(JSON.stringify({ type: 'system', message: '2' })), 2000);
                        setTimeout(() => client.send(JSON.stringify({ type: 'system', message: '1' })), 3000);
                        setTimeout(() => client.send(JSON.stringify({ type: 'system', message: 'スタート', firstChar })), 4000);
                    }
                });
            }
        } else if (msg.type === 'word') {
            if (ws.id !== currentPlayer) {
                ws.send(JSON.stringify({ type: 'system', message: 'あなたの順番ではありません' }));
                return;
            }

            const word = normalizeWord(msg.word);
            if (usedWords.includes(word)) {
                ws.send(JSON.stringify({ type: 'system', message: 'その言葉は一度使われています' }));
                return;
            }

            if (word[0] !== firstChar) {
                ws.send(JSON.stringify({ type: 'system', message: `頭文字は${firstChar}でなければなりません` }));
                return;
            }

            const lastChar = getLastChar(word);
            if (lastChar === 'ん') {
                ws.send(JSON.stringify({ type: 'system', message: '「ん」で終わる言葉を言ったので敗北です' }));
                gameStarted = false;
                return;
            }

            usedWords.push(word);
            currentPlayer = (currentPlayer + 1) % clients.length;
            firstChar = lastChar;

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'word', player: `プレイヤー${ws.id}`, word }));
                    if (client.id === currentPlayer) {
                        client.send(JSON.stringify({ type: 'turn', firstChar }));
                    }
                }
            });
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        if (clients.length === 0) {
            gameStarted = false;
        }
    });
});

server.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});
