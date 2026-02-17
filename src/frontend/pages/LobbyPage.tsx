import { useState } from 'react';
import { useQuizStore } from '../store/quizStore';
import { useWebSocketStore } from '../store/websocketStore';
import { useUIStore } from '../store/uiStore';
import { useDraftStore } from '../store/draftStore';
import { ParticipantList } from '../components/ParticipantList';

export function LobbyPage() {
  const { sessionId, quizState } = useQuizStore();
  const { send } = useWebSocketStore();
  const { showError, showNotification } = useUIStore();
  const { draftQuestions, clearDrafts } = useDraftStore();
  const [joinSessionId, setJoinSessionId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // No active session - show create/join options
  if (!sessionId || !quizState) {
    const handleCreateSession = () => {
      setIsCreating(true);
      send({ type: 'session:create', data: {} });
      
      // If there are drafts, publish them after session is created
      // The session:created handler in App.tsx will trigger, then we publish
      if (draftQuestions.length > 0) {
        setTimeout(() => {
          draftQuestions.forEach(draft => {
            send({
              type: 'question:add',
              data: {
                prompt: draft.prompt,
                options: draft.options,
                ownerResponse: draft.ownerResponse
              }
            });
          });
          clearDrafts();
          showNotification(`Session created with ${draftQuestions.length} question(s)`);
        }, 500); // Wait for session to be created
      }
    };

    const handleJoinSession = () => {
      if (!joinSessionId.trim()) {
        showError('Please enter a session ID');
        return;
      }
      send({ type: 'session:join', data: { sessionId: joinSessionId } });
    };

    return (
      <div className="page-content">
        <div style={{
          background: 'white',
          padding: '32px 24px',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>
            No Active Session
          </h2>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
            Create a new session to start a quiz, or join an existing one.
          </p>

          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '12px' }}
          >
            {isCreating ? 'Creating...' : draftQuestions.length > 0 
              ? `Create Session (${draftQuestions.length} draft${draftQuestions.length !== 1 ? 's' : ''} will publish)`
              : 'Create New Session'
            }
          </button>

          {draftQuestions.length > 0 && (
            <p style={{ color: '#6366F1', fontSize: '12px', marginBottom: '16px' }}>
              Your {draftQuestions.length} draft question{draftQuestions.length !== 1 ? 's' : ''} will be published automatically
            </p>
          )}
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '20px',
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
            Join Existing Session
          </h3>
          <input
            type="text"
            placeholder="Enter Session ID"
            value={joinSessionId}
            onChange={(e) => setJoinSessionId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
            style={{ marginBottom: '12px' }}
          />
          <button
            onClick={handleJoinSession}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            Join Session
          </button>
        </div>
      </div>
    );
  }

  // Get owner info
  const ownerInfo = quizState.participants.find(p => p.id === quizState.ownerId);
  const ownerName = ownerInfo?.username || ownerInfo?.id.slice(0, 8) || 'Unknown';

  return (
    <div className="page-content">
      <div style={{ background: 'white', padding: '20px', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>Session Info</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>Session ID</span>
            <span style={{ color: '#1F2937', fontWeight: '600', fontFamily: 'monospace' }}>{sessionId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>Owner</span>
            <span style={{ color: '#1F2937', fontWeight: '600' }}>{ownerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>Status</span>
            <span style={{
              color: quizState.status === 'live' ? '#10B981' : quizState.status === 'active' ? '#F59E0B' : '#6B7280',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {quizState.status}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>Questions</span>
            <span style={{ color: '#1F2937', fontWeight: '600' }}>{quizState.questions.length}</span>
          </div>
        </div>
      </div>

      <ParticipantList participants={quizState.participants} />
    </div>
  );
}
