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

  // Auth states
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null);

  // Input states
  const [joinSessionId, setJoinSessionId] = useState('');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');

  // Draft questions
  interface DraftQuestion {
    id: string;
    prompt: string;
    options: [string, string];
  }
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

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

  const signInWithTwitter = () => {
    setIsSigningIn(true);
    // TODO: Implement actual Twitter OAuth flow
    // For now, simulate sign-in after 2 seconds
    setTimeout(() => {
      setIsSigningIn(false);
      setIsSignedIn(true);
      setTwitterUsername('@demo_user'); // Mock username
      showNotification('Signed in successfully!');
    }, 2000);
  };

  const createSession = () => {
    if (!isSignedIn) {
      setError('Please sign in with Twitter to create a session');
      return;
    }
    send({ type: 'session:create', data: {} });
  };

  const joinSession = () => {
    if (!joinSessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }
    send({ type: 'session:join', data: { sessionId: joinSessionId } });
  };

  const addQuestionToDraft = () => {
    if (!questionPrompt.trim() || !option1.trim() || !option2.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const draftQuestion: DraftQuestion = {
      id: `draft-${Date.now()}`,
      prompt: questionPrompt,
      options: [option1, option2]
    };

    setDraftQuestions([...draftQuestions, draftQuestion]);
    setQuestionPrompt('');
    setOption1('');
    setOption2('');
    showNotification('Question added to drafts');
  };

  const removeDraftQuestion = (id: string) => {
    setDraftQuestions(draftQuestions.filter(q => q.id !== id));
  };

  const publishDraftQuestions = () => {
    setShowPublishDialog(true);
  };

  const confirmPublish = () => {
    // Send all draft questions to server
    draftQuestions.forEach(draft => {
      send({
        type: 'question:add',
        data: {
          prompt: draft.prompt,
          options: draft.options
        }
      });
    });

    // Clear drafts and close dialog
    setDraftQuestions([]);
    setShowPublishDialog(false);
    showNotification(`Published ${draftQuestions.length} question${draftQuestions.length !== 1 ? 's' : ''}!`);
  };

  const cancelPublish = () => {
    setShowPublishDialog(false);
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
        <div className="loading">
          <h1>VybeCheck</h1>
          <div className="spinner"></div>
          <p>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (view === 'start') {
    return (
      <div className="app">
        <div className="start-screen">
          <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#1F2937', marginBottom: '8px' }}>VybeCheck</h1>
          <p style={{ color: '#6B7280', marginBottom: '40px', fontSize: '16px' }}>Your vibes on real-time debates</p>
          {error && <div className="error">{error}</div>}
          {notification && <div className="notification">{notification}</div>}

          {/* Sign in section */}
          {!isSignedIn ? (
            <>
              <button
                onClick={signInWithTwitter}
                disabled={isSigningIn}
                className="btn btn-twitter"
                style={{ width: '100%', maxWidth: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isSigningIn ? (
                  <>
                    <div className="spinner-small"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Sign in with Twitter</span>
                  </>
                )}
              </button>
              <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '12px', maxWidth: '320px', textAlign: 'center' }}>
                Sign in to create sessions and view matches
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#10B981', fontSize: '14px', fontWeight: '600' }}>
                <span>✓</span>
                <span>Signed in as {twitterUsername}</span>
              </div>
              <button onClick={createSession} className="btn btn-primary" style={{ width: '100%', maxWidth: '320px' }}>
                Create New Session
              </button>
            </>
          )}

          <div className="separator">or join existing</div>
          <div className="join-form" style={{ width: '100%', maxWidth: '320px' }}>
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
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '12px', maxWidth: '320px', textAlign: 'center' }}>
            {isSignedIn ? 'Join any session with the ID' : 'No sign-in required to join, but needed to participate'}
          </p>
        </div>
      </div>
    );
  }

  if (!quizState) {
    return (
      <div className="app">
        <div className="loading">
          <h1>VybeCheck</h1>
          <div className="spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>VybeCheck</h1>
        <div className="session-info">
          <span>Session: {sessionId}</span>
          <span>👥 {quizState.activeParticipantCount}/{quizState.participantCount}</span>
          {isOwner && <span className="badge">Owner</span>}
        </div>
      </header>

      <div className="app-content">
        {notification && <div className="notification">{notification}</div>}
        {error && <div className="error">{error}</div>}

        {isOwner && (
          <>
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
              <button onClick={addQuestionToDraft} className="btn btn-secondary">
                + Add to Drafts
              </button>
            </div>

            {draftQuestions.length > 0 && (
              <div className="drafts-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2>Draft Questions ({draftQuestions.length})</h2>
                  <button onClick={publishDraftQuestions} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '15px' }}>
                    Publish All
                  </button>
                </div>
                {draftQuestions.map((draft, index) => (
                  <div key={draft.id} className="draft-question-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, flex: 1, fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                        Q{index + 1}: {draft.prompt}
                      </h3>
                      <button
                        onClick={() => removeDraftQuestion(draft.id)}
                        className="btn-icon"
                        style={{ marginLeft: '12px' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="draft-options">
                      <div className="draft-option">{draft.options[0]}</div>
                      <div className="draft-option">{draft.options[1]}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
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
            <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px 20px' }}>
              {isOwner ? '👆 Add your first question above' : '⏳ Waiting for questions...'}
            </p>
          )}
        </div>

        {quizState.myCompletionStatus && (
          <div className="matches-section">
            <h2>Your Matches</h2>
            <button onClick={getMatches} className="btn btn-secondary" style={{ width: '100%' }}>
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
                      {match.matchPercentage.toFixed(1)}%
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

      {/* Publish Confirmation Dialog */}
      {showPublishDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>
              Publish Questions?
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: '15px', lineHeight: '1.5' }}>
              Are you sure you want to publish {draftQuestions.length} question{draftQuestions.length !== 1 ? 's' : ''}?
              Participants will be able to see and answer them immediately.
            </p>
            <div className="dialog-actions">
              <button onClick={cancelPublish} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={confirmPublish} className="btn btn-primary" style={{ flex: 1 }}>
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
