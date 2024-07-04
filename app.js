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

wss.on('connection', (ws) => {
    ws.id = clients.length;
    clients.push(ws);

    ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.type === 'start') {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'system', message: 'しりとりゲーム開始！' }));
                }
            });
        } else if (msg.type === 'word') {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'word', player: `プレイヤー${ws.id}`, word: msg.word }));
                }
            });
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

server.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});
