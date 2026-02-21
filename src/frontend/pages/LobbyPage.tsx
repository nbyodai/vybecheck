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
      <div className="w-full min-h-full">
        <div className="bg-white p-8 rounded-[20px] text-center shadow-card mb-5">
          <div className="text-5xl mb-4">📡</div>
          <h2 className="m-0 mb-2 text-2xl font-bold text-gray-800">
            No Active Session
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Create a new session to start a quiz, or join an existing one.
          </p>

          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="w-full mb-3 py-4 px-6 border-none rounded-xl cursor-pointer text-[17px] font-semibold transition-all text-center select-none [-webkit-tap-highlight-color:transparent] touch-manipulation bg-gradient-to-br from-vybe-blue to-vybe-purple text-white shadow-primary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : draftQuestions.length > 0 
              ? `Create Session (${draftQuestions.length} draft${draftQuestions.length !== 1 ? 's' : ''} will publish)`
              : 'Create New Session'
            }
          </button>

          {draftQuestions.length > 0 && (
            <p className="text-vybe-blue text-xs mb-4">
              Your {draftQuestions.length} draft question{draftQuestions.length !== 1 ? 's' : ''} will be published automatically
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-[20px] shadow-card">
          <h3 className="m-0 mb-4 text-base font-semibold text-gray-800">
            Join Existing Session
          </h3>
          <input
            type="text"
            placeholder="Enter Session ID"
            value={joinSessionId}
            onChange={(e) => setJoinSessionId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
            className="mb-3"
          />
          <button
            onClick={handleJoinSession}
            className="w-full py-4 px-6 border-2 border-gray-200 rounded-xl cursor-pointer text-[17px] font-semibold transition-all text-center select-none [-webkit-tap-highlight-color:transparent] touch-manipulation bg-white text-vybe-blue shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:bg-gray-50 active:scale-[0.97]"
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
    <div className="w-full min-h-full">
      <div className="bg-white p-5 rounded-[20px] mb-5 shadow-card">
        <h2 className="m-0 mb-4 text-xl font-bold text-gray-800">Session Info</h2>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Session ID</span>
            <span className="text-gray-800 font-semibold font-mono">{sessionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Owner</span>
            <span className="text-gray-800 font-semibold">{ownerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Status</span>
            <span className={`font-semibold capitalize ${
              quizState.status === 'live' ? 'text-emerald-500' : quizState.status === 'active' ? 'text-amber-500' : 'text-gray-500'
            }`}>
              {quizState.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Questions</span>
            <span className="text-gray-800 font-semibold">{quizState.questions.length}</span>
          </div>
        </div>
      </div>

      <ParticipantList participants={quizState.participants} />
    </div>
  );
}
