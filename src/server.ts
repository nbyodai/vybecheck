import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { WebSocketHandler } from './server/services/WebSocketHandler';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const wsHandler = new WebSocketHandler();

const PORT = process.env.PORT || 3000;

// Serve static files from dist directory (for production)
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
  console.log(`WebSocket server ready`);
});
