const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const app = express();

const wss = new WebSocket.Server({ noServer: true });
let players = [];
let turnIndex = 0;
let currentTimeout = null;
let usedWords = new Set();
let initialChar = 'し'; // 仮置き

app.use(express.static(path.join(__dirname, 'public')));

const smallToLargeMap = {
    'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お', 
    'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'っ': 'つ'
};

function normalizeChar(char) {
    return smallToLargeMap[char] || char;
}

function getRandomHiragana() {
    // ゲーム開始時に頭文字に設定できない文字
    const excludedChars = ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゃ', 'ゅ', 'ょ', 'ゎ', 'ん', 'ー'];

    let char;
    do {
        char = String.fromCharCode(12353 + Math.floor(Math.random() * 83));
    } while (excludedChars.includes(char));
    return char;
}

function startNewGame() {
    // ゲーム開始時に頭文字をランダムで設定
    initialChar = getRandomHiragana();
    while (initialChar === 'ん' || initialChar === 'ー') {
        initialChar = getRandomHiragana();
    }

    // ゲーム開始のシステムメッセージを全プレイヤーに送信
    broadcast({ type: 'system', message: `ゲームスタート！初めの文字は "${initialChar}"です！` });

    // ゲームのターンを初期化
    turnIndex = 0;
    startNewTurn();
}


function startNewTurn() {
    clearTimeout(currentTimeout); // 現在のタイムアウトをクリア
    const player = players[turnIndex];  // 現在のターンのプレイヤーを取得
    player.ws.send(JSON.stringify({ type: 'turn', message: `${player.name}さんの番です！「${initialChar}」で始めてください。` }));
    // プレイヤーにターン開始のメッセージを送信

    currentTimeout = setTimeout(() => {
        player.ws.send(JSON.stringify({ type: 'system', message: '時間切れ！あなたの負けです。' }));
        // タイムアウトメッセージをプレイヤーに送信

        handlePlayerLoss(player);
    }, player.timeout);
}

function handlePlayerLoss(player) {
    players = players.filter(p => p !== player); // プレイヤーを players 配列から削除
    player.ws.send(JSON.stringify({ type: 'system', message: 'あなたの負けです!' })); // 脱落したプレイヤーに脱落のメッセージを送信

    players.forEach(p => {
        p.ws.send(JSON.stringify({ type: 'system', message: `${player.name} さんが脱落しました。あなたの勝ちです！` }));
    });// 残りのプレイヤーに勝利のメッセージを送信

    broadcast({ type: 'system', message: 'ゲーム終了' });

    players = [];
}

function broadcast(message) {
    players.forEach(player => player.ws.send(JSON.stringify(message)));
}
//全クライアントにメッセージをブロードキャスト

wss.on('connection', (ws) => {
    // 新しいプレイヤーオブジェクトを作成し、デフォルトのタイムアウトを30秒、空の名前、および未エントリー状態に設定
    const player = { ws, id: Math.random().toString(36).substr(2, 9), timeout: 30000, name: '', isEntered: false };
    players.push(player);

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // プレイヤーがエントリー
        if (data.type === 'entry') {
            player.name = data.name;
            player.isEntered = true;
            broadcast({ type: 'system', message: `${player.name} さんがゲームに参加しました。` });
        } 
        // ゲーム開始メッセージを受信した場合の処理
        else if (data.type === 'start') {
            if (!player.isEntered) {
                ws.send(JSON.stringify({ type: 'system', message: 'まずはエントリーしましょう！' }));
                return;
            }
            player.timeout = data.timeout;
            initialChar = getRandomHiragana();
            broadcast({ type: 'system', message: `ゲームスタート！初めの文字は「${initialChar}」です。制限時間は${player.timeout / 1000}秒！` });
            turnIndex = 0;
            startNewTurn();
        } 
        // プレイヤーの単語提出メッセージを受信した場合の処理
        else if (data.type === 'word') {
            if (!player.isEntered) {
                ws.send(JSON.stringify({ type: 'system', message: 'まずはエントリーしましょう！' }));
                return;
            }
            if (players[turnIndex] !== player) {
                ws.send(JSON.stringify({ type: 'system', message: "あなたの番ではありません！" }));
                return;
            }
            const word = data.word.trim();
            if (!/^[ぁ-ゖー]+$/.test(word)) {
                ws.send(JSON.stringify({ type: 'system', message: 'ひらがなのみで送信してください！' }));
                return;
            }
            if (usedWords.has(word)) {
                ws.send(JSON.stringify({ type: 'system', message: 'すでに使用された言葉です！' }));
                return;
            }
            const lastChar = initialChar;
            const firstChar = normalizeChar(word.charAt(0));
            if (firstChar !== lastChar) {
                ws.send(JSON.stringify({ type: 'system', message: `「${lastChar}」で始めなければなりません！` }));
                return;
            }
            initialChar = normalizeChar(word.slice(-1));
            if (initialChar === 'ー') {
                initialChar = normalizeChar(word.slice(-2, -1));
            }
            if (initialChar === 'ん') {
                ws.send(JSON.stringify({ type: 'system', message: '「ん」がつきました！あなたの負けです！' }));
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
