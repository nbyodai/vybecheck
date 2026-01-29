import { useEffect } from 'react';
import './App.css';
import type { ServerMessage } from '../shared/types';
import { useWebSocketStore } from './store/websocketStore';
import { useAuthStore } from './store/authStore';
import { useQuizStore } from './store/quizStore';
import { useUIStore } from './store/uiStore';
import { useDraftStore } from './store/draftStore';
import { LoadingScreen } from './components/LoadingScreen';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { StartPage } from './pages/StartPage';
import { LabPage } from './pages/LabPage';
import { QuizPage } from './pages/QuizPage';
import { LobbyPage } from './pages/LobbyPage';
import { VybesPage } from './pages/VybesPage';

function App() {
  // Zustand stores
  const { connected, setWebSocket, setConnected } = useWebSocketStore();
  const { setSessionId, setParticipantId, setIsOwner, setQuizState, updateQuizState, setMatches, isOwner } = useQuizStore();
  const { activePage, setActivePage, notification, error, showNotification, showError } = useUIStore();
  const { draftQuestions } = useDraftStore();

  // WebSocket setup
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL;
    const websocket = new WebSocket(wsUrl);
    let hasConnected = false;

    websocket.addEventListener('open', () => {
      console.log('Connected to server');
      hasConnected = true;
      setConnected(true);
      setWebSocket(websocket);
    });

    websocket.addEventListener('message', (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      handleServerMessage(message);
    });

    websocket.addEventListener('close', () => {
      console.log('Disconnected from server');
      setConnected(false);
      // Only show error if we were previously connected
      if (hasConnected) {
        showError('Connection lost', 3000);
      }
    });

    websocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      // Only show error if we were previously connected (not on initial load)
      if (hasConnected) {
        showError('Connection error', 3000);
      }
    });

    return () => {
      websocket.close();
    };
  }, []);

  const handleServerMessage = (message: ServerMessage) => {
    console.log('Received:', message);

    switch (message.type) {
      case 'session:created':
        setSessionId(message.data.sessionId);
        setParticipantId(message.data.participantId);
        setIsOwner(true);
        setActivePage('quiz'); // Navigate to quiz page
        break;

      case 'session:joined':
        setSessionId(message.data.sessionId);
        setParticipantId(message.data.participantId);
        setIsOwner(message.data.isOwner);
        setActivePage('quiz'); // Navigate to quiz page
        break;

      case 'quiz:state':
        setQuizState(message.data);
        break;

      case 'question:added':
        updateQuizState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            questions: [...prev.questions, message.data.question],
            myResponses: [...prev.myResponses, ""]
          };
        });
        showNotification('New question added!');
        break;

      case 'participant:joined':
        updateQuizState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: [...prev.participants, message.data],
            participantCount: prev.participantCount + 1,
            activeParticipantCount: prev.activeParticipantCount + 1
          };
        });
        showNotification(`${message.data.username || 'New participant'} joined!`);
        break;

      case 'participant:left':
        updateQuizState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: prev.participants.map(p =>
              p.id === message.data.participantId ? { ...p, isActive: false } : p
            ),
            activeParticipantCount: prev.activeParticipantCount - 1
          };
        });
        break;

      case 'response:recorded':
        // Response recorded, the quiz state will be updated via quiz:state message
        break;

      case 'matches:result':
        setMatches(message.data.matches);
        break;

      case 'notification':
        showNotification(message.message);
        break;

      case 'error':
        showError(message.message);
        break;
    }
  };

  // Page titles
  const pageTitles: Record<typeof activePage, string> = {
    start: 'VybeCheck',
    lab: 'Lab',
    quiz: 'Quiz',
    lobby: 'Lobby',
    vybes: 'Vybes',
  };

  if (!connected) {
    return (
      <div className="app">
        <LoadingScreen message="Connecting to server..." />
      </div>
    );
  }

  if (activePage === 'start') {
    return (
      <div className="app">
        <StartPage />
      </div>
    );
  }

  return (
    <div className="app">
      <Header title={pageTitles[activePage]} />

      <div className="app-content">
        {notification && <div className="notification">{notification}</div>}
        {error && <div className="error">{error}</div>}

        {activePage === 'lab' && <LabPage />}
        {activePage === 'quiz' && <QuizPage />}
        {activePage === 'lobby' && <LobbyPage />}
        {activePage === 'vybes' && <VybesPage />}
      </div>

      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
        isOwner={isOwner}
        draftCount={draftQuestions.length}
      />
    </div>
  );
}

export default App;
