const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const app = express();

const wss = new WebSocket.Server({ noServer: true });
let players = [];
let turnIndex = 0;
let currentTimeout = null;
let usedWords = new Set();
let initialChar = 'し'; // Default initial character

app.use(express.static(path.join(__dirname, 'public')));

const smallToLargeMap = {
    'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お', 
    'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'っ': 'つ'
};

const excludedChars = ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゃ', 'ゅ', 'ょ', 'っ', 'ー'];

function normalizeChar(char) {
    return smallToLargeMap[char] || char;
}

function getRandomHiragana() {
    let char;
    do {
        char = String.fromCharCode(12353 + Math.floor(Math.random() * 83));
    } while (excludedChars.includes(char));
    return char;
}

function startNewTurn() {
    clearTimeout(currentTimeout);
    const player = players[turnIndex];
    player.ws.send(JSON.stringify({ type: 'turn', message: `Your turn, ${player.name}! Start with "${initialChar}".` }));
    currentTimeout = setTimeout(() => {
        player.ws.send(JSON.stringify({ type: 'system', message: 'You lost! Time out.' }));
        handlePlayerLoss(player);
    }, player.timeout);
}

function handlePlayerLoss(player) {
    players = players.filter(p => p !== player);
    broadcast({ type: 'system', message: `${player.name} has been eliminated!` });

    if (players.length === 1) {
        broadcast({ type: 'system', message: `${players[0].name} is the champion! Game over.` });
    } else if (players.length === 0) {
        broadcast({ type: 'system', message: 'End of game.' });
    }
}

function broadcast(message) {
    players.forEach(player => player.ws.send(JSON.stringify(message)));
}

wss.on('connection', (ws) => {
    const player = { ws, id: Math.random().toString(36).substr(2, 9), timeout: 30000, name: '', isEntered: false }; // Default 30 seconds, empty name, and not entered
    players.push(player);

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'entry') {
            player.name = data.name;
            player.isEntered = true;
            broadcast({ type: 'system', message: `${player.name} has entered the game.` });
        } else if (data.type === 'start') {
            if (!player.isEntered) {
                ws.send(JSON.stringify({ type: 'system', message: 'You need to enter the game first.' }));
                return;
            }
            player.timeout = data.timeout;
            initialChar = getRandomHiragana();
            broadcast({ type: 'system', message: `Game starting with initial character "${initialChar}". Timeout is ${player.timeout / 1000} seconds.` });
            turnIndex = 0;
            startNewTurn();
        } else if (data.type === 'word') {
            if (!player.isEntered) {
                ws.send(JSON.stringify({ type: 'system', message: 'You need to enter the game first.' }));
                return;
            }
            if (players[turnIndex] !== player) {
                ws.send(JSON.stringify({ type: 'system', message: "It's not your turn." }));
                return;
            }
            const word = data.word.trim();
            if (!/^[ぁ-ゖー]+$/.test(word)) {
                ws.send(JSON.stringify({ type: 'system', message: 'Words must be in hiragana only.' }));
                return;
            }
            if (usedWords.has(word)) {
                ws.send(JSON.stringify({ type: 'system', message: 'This word has already been used.' }));
                return;
            }
            const lastChar = initialChar;
            const firstChar = normalizeChar(word.charAt(0));
            if (firstChar !== lastChar) {
                ws.send(JSON.stringify({ type: 'system', message: `Word must start with "${lastChar}".` }));
                return;
            }
            initialChar = normalizeChar(word.slice(-1));
            if (initialChar === 'ー') {
                initialChar = normalizeChar(word.slice(-2, -1));
            }
            if (initialChar === 'ん') {
                ws.send(JSON.stringify({ type: 'system', message: 'You lost! Your word ended with "ん".' }));
                handlePlayerLoss(player);
                return;
            }
            usedWords.add(word);
            broadcast({ type: 'word', player: player.name, word });
            turnIndex = (turnIndex + 1) % players.length;
            startNewTurn();
        }
    });

    ws.on('close', () => {
        players = players.filter(p => p.ws !== ws);
        if (players.length === 0) {
            clearTimeout(currentTimeout);
        }
    });
});

const server = app.listen(3000, () => console.log('Listening on port 3000'));
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
