import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

// Serve static files
app.use(express.static('.'));

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send welcome message
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to VybeCheck server' }));

  // Handle incoming messages
  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    
    // Echo back with ping/pong
    const message = JSON.parse(data.toString());
    if (message.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});