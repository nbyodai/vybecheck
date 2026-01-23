import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { WebSocketHandler } from './server/services/WebSocketHandler';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const wsHandler = new WebSocketHandler();

const PORT = 3000;

// Serve static files
app.use(express.static('.'));

// WebSocket connection handler
wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
});
