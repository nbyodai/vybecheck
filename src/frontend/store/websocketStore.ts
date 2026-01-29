import { create } from 'zustand';

interface WebSocketStore {
  ws: WebSocket | null;
  connected: boolean;
  setWebSocket: (ws: WebSocket) => void;
  setConnected: (connected: boolean) => void;
  send: (message: any) => void;
}

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  ws: null,
  connected: false,
  
  setWebSocket: (ws) => set({ ws }),
  
  setConnected: (connected) => set({ connected }),
  
  send: (message) => {
    const { ws, connected } = get();
    if (ws && connected) {
      ws.send(JSON.stringify(message));
    }
  },
}));
