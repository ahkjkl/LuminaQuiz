const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ① 画面(index.html)を表示するためのサーバー
const server = http.createServer((req, res) => {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
});

// ② クイズの早押し通信(WebSocket)のサーバー
const wss = new WebSocket.Server({ server });
let rooms = {};

function broadcastToRoom(roomId, msgObj) {
    wss.clients.forEach(client => {
        if (client.readyState === 1 && client.roomId === roomId) {
            client.send(JSON.stringify(msgObj));
        }
    });
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        let msg;
        try { msg = JSON.parse(message); } catch (e) { return; }

        if (msg.type === 'create_room') {
            const roomId = Math.floor(1000 + Math.random() * 9000).toString();
            rooms[roomId] = { pressedPlayers: [] };
            ws.roomId = roomId;
            ws.send(JSON.stringify({ type: 'room_created', roomId: roomId }));
        }
        else if (msg.type === 'join_room') {
            const roomId = msg.roomId;
            ws.roomId = roomId;
            if (!rooms[roomId]) rooms[roomId] = { pressedPlayers: [] };
            ws.send(JSON.stringify({ type: 'init', roomId: roomId, data: rooms[roomId].pressedPlayers }));
        }
        else if (msg.type === 'push') {
            const roomId = msg.roomId;
            if (rooms[roomId]) {
                const alreadyPressed = rooms[roomId].pressedPlayers.some(p => p.name === msg.name);
                if (!alreadyPressed) {
                    rooms[roomId].pressedPlayers.push({ name: msg.name });
                    broadcastToRoom(roomId, { type: 'update', roomId: roomId, data: rooms[roomId].pressedPlayers, sound: true });
                }
            }
        }
        else if (msg.type === 'reset') {
            const roomId = msg.roomId;
            if (rooms[roomId]) {
                rooms[roomId].pressedPlayers = [];
                broadcastToRoom(roomId, { type: 'update', roomId: roomId, data: [], sound: false });
            }
        }
    });
});

// 3000番の部屋で起動！
server.listen(3000, () => {
    console.log("🚀 LUMINA QUIZ 万能サーバー起動中！");
    console.log("👉 ブラウザで http://localhost:3000 を開いてね！");
});
