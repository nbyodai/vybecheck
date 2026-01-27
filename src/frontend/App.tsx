import { useEffect, useReducer, useState } from 'react';
import './App.css';
import type { ServerMessage, QuizState, MatchResult } from '../shared/types';

type View = 'start' | 'owner' | 'participant';

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<View>('start');
  const [sessionId, setSessionId] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  // Input states
  const [joinSessionId, setJoinSessionId] = useState('');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL;
    const websocket = new WebSocket(wsUrl);

    websocket.addEventListener('open', () => {
      console.log('Connected to server');
      setConnected(true);
      setError('');
    });

    websocket.addEventListener('message', (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      handleServerMessage(message);
    });

    websocket.addEventListener('close', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    websocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error');
    });

    setWs(websocket);

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
        setView('owner');
        break;

      case 'session:joined':
        setSessionId(message.data.sessionId);
        setParticipantId(message.data.participantId);
        setIsOwner(message.data.isOwner);
        setView('participant');
        break;

      case 'quiz:state':
        setQuizState(message.data);
        break;

      case 'question:added':
        console.log('New question added client', message.data);
        setQuizState((prev) => {
          if (!prev) return null;

          return {
            ...prev,
            // 1. Add the new question to the list
            questions: [...prev.questions, message.data.question],
            // 2. CRITICAL: Add an empty response slot for this new question
            // If you miss this, `myResponses[index]` will be undefined,
            // and `undefined !== ''` is true, making the question look answered!
            myResponses: [...prev.myResponses, ""] // Not sure about this yet
          };
        });
        showNotification('New question added!');
        break;

      case 'participant:joined':
        console.log('Participant joined:', message.data);
        setQuizState((prev) => {
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
        console.log('Participant left:', message.data);
        setQuizState((prev) => {
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

      case 'matches:result':
        setMatches(message.data.matches);
        break;

      case 'notification':
        showNotification(message.message);
        break;

      case 'error':
        setError(message.message);
        setTimeout(() => setError(''), 5000);
        break;
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const send = (message: any) => {
    if (ws && connected) {
      ws.send(JSON.stringify(message));
    }
  };

  const createSession = () => {
    send({ type: 'session:create', data: {} });
  };

  const joinSession = () => {
    if (!joinSessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }
    send({ type: 'session:join', data: { sessionId: joinSessionId } });
  };

  const addQuestion = () => {
    if (!questionPrompt.trim() || !option1.trim() || !option2.trim()) {
      setError('Please fill in all fields');
      return;
    }
    send({
      type: 'question:add',
      data: {
        prompt: questionPrompt,
        options: [option1, option2]
      }
    });
    setQuestionPrompt('');
    setOption1('');
    setOption2('');
  };

  const submitResponse = (questionId: string, optionChosen: string) => {
    send({
      type: 'response:submit',
      data: { questionId, optionChosen }
    });
  };

  const getMatches = () => {
    send({ type: 'matches:get' });
  };

  if (!connected) {
    return (
      <div className="app">
        <h1>VybeCheck</h1>
        <p>Connecting to server...</p>
      </div>
    );
  }

  if (view === 'start') {
    return (
      <div className="app">
        <h1>VybeCheck</h1>
        <div className="start-screen">
          <button onClick={createSession} className="btn btn-primary">
            Create New Session (Owner)
          </button>
          <div className="separator">or</div>
          <div className="join-form">
            <input
              type="text"
              placeholder="Enter Session ID"
              value={joinSessionId}
              onChange={(e) => setJoinSessionId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinSession()}
            />
            <button onClick={joinSession} className="btn btn-secondary">
              Join Session
            </button>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  if (!quizState) {
    return (
      <div className="app">
        <h1>VybeCheck</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>VybeCheck</h1>
        <div className="session-info">
          <span>Session: {sessionId}</span>
          <span>Participants: {quizState.activeParticipantCount}/{quizState.participantCount}</span>
          {isOwner && <span className="badge">Owner</span>}
        </div>
      </header>

      {notification && <div className="notification">{notification}</div>}
      {error && <div className="error">{error}</div>}

      {isOwner && (
        <div className="owner-controls">
          <h2>Add Question</h2>
          <input
            type="text"
            placeholder="Question prompt"
            value={questionPrompt}
            onChange={(e) => setQuestionPrompt(e.target.value)}
          />
          <input
            type="text"
            placeholder="Option 1"
            value={option1}
            onChange={(e) => setOption1(e.target.value)}
          />
          <input
            type="text"
            placeholder="Option 2"
            value={option2}
            onChange={(e) => setOption2(e.target.value)}
          />
          <button onClick={addQuestion} className="btn btn-primary">
            Add Question
          </button>
        </div>
      )}

      <div className="questions-section">
        <h2>Questions ({quizState.questions.length})</h2>
        {quizState.questions.map((question, index) => {
          const myResponse = quizState.myResponses[index];
          const hasAnswered = myResponse !== '';

          return (
            <div key={question.id} className="question-card">
              <h3>Q{index + 1}: {question.prompt}</h3>
              <div className="options">
                {question.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => submitResponse(question.id, option)}
                    disabled={hasAnswered}
                    className={`btn ${
                      hasAnswered && myResponse === option
                        ? 'btn-selected'
                        : 'btn-option'
                    }`}
                  >
                    {option}
                    {hasAnswered && myResponse === option && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {quizState.questions.length === 0 && (
          <p>No questions yet. {isOwner ? 'Add some above!' : 'Waiting for owner to add questions...'}</p>
        )}
      </div>

      {quizState.myCompletionStatus && (
        <div className="matches-section">
          <h2>Your Matches</h2>
          <button onClick={getMatches} className="btn btn-secondary">
            Calculate Matches
          </button>
          {matches.length > 0 && (
            <div className="matches-list">
              {matches.map((match, index) => (
                <div key={match.participantId} className="match-card">
                  <span className="match-rank">#{index + 1}</span>
                  <span className="match-name">
                    {match.username || `Participant ${match.participantId.slice(0, 8)}`}
                  </span>
                  <span className="match-percentage">
                    {match.matchPercentage.toFixed(1)}% match
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="participants-section">
        <h3>Participants</h3>
        <ul>
          {quizState.participants.map((p) => (
            <li key={p.id}>
              {p.username || `Participant ${p.id.slice(0, 8)}`}
              {p.isOwner && <span className="badge">Owner</span>}
              {!p.isActive && <span className="inactive"> (offline)</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
