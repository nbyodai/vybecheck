import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('Connecting...');
  const [statusColor, setStatusColor] = useState('orange');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const websocket = new WebSocket('ws://localhost:3000');

    websocket.addEventListener('open', () => {
      console.log('Connected to server');
      setStatus('Connected!');
      setStatusColor('green');

      // Send a ping message every 5 seconds
      const pingInterval = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 5000);

      // Store interval ID for cleanup
      (websocket as any).pingInterval = pingInterval;
    });

    websocket.addEventListener('message', (event) => {
      console.log('Message from server:', event.data);
      const data = JSON.parse(event.data);

      if (data.type === 'welcome') {
        setStatus(data.message);
      } else if (data.type === 'pong') {
        const latency = Date.now() - data.timestamp;
        setStatus(`Connected - Latency: ${latency}ms`);
      }
    });

    websocket.addEventListener('close', () => {
      console.log('Disconnected from server');
      setStatus('Disconnected');
      setStatusColor('red');

      // Clear ping interval
      if ((websocket as any).pingInterval) {
        clearInterval((websocket as any).pingInterval);
      }
    });

    websocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setStatus('Connection error');
      setStatusColor('red');
    });

    setWs(websocket);

    // Cleanup on component unmount
    return () => {
      if ((websocket as any).pingInterval) {
        clearInterval((websocket as any).pingInterval);
      }
      websocket.close();
    };
  }, []);

  return (
    <div className="app">
      <h1>VybeCheck - Phase 1</h1>
      <div id="status" style={{ color: statusColor }}>
        {status}
      </div>
    </div>
  );
}

export default App;
