// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:3000');

const statusDiv = document.getElementById('status')!;

// Connection opened
ws.addEventListener('open', (event) => {
  console.log('Connected to server');
  statusDiv.textContent = 'Connected!';
  statusDiv.style.color = 'green';
  
  // Send a ping message every 5 seconds
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    }
  }, 5000);
});

// Listen for messages
ws.addEventListener('message', (event) => {
  console.log('Message from server:', event.data);
  const data = JSON.parse(event.data);
  
  if (data.type === 'welcome') {
    statusDiv.textContent = data.message;
  } else if (data.type === 'pong') {
    const latency = Date.now() - data.timestamp;
    statusDiv.textContent = `Connected - Latency: ${latency}ms`;
  }
});

// Handle connection close
ws.addEventListener('close', (event) => {
  console.log('Disconnected from server');
  statusDiv.textContent = 'Disconnected';
  statusDiv.style.color = 'red';
});

// Handle errors
ws.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
  statusDiv.textContent = 'Connection error';
  statusDiv.style.color = 'red';
});
