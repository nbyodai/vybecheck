import { useState, useEffect, useRef } from 'react';
import { useDraftStore } from '../store/draftStore';
import { useWebSocketStore } from '../store/websocketStore';
import { useUIStore } from '../store/uiStore';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { DraftQuestionCard } from '../components/DraftQuestionCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

// TODO: Move this to config or constants file
const QUESTION_LIMIT_UPGRADE_COST = 3;

export function LabPage() {
  const { draftQuestions, addDraft, removeDraft, clearDrafts, setOwnerResponse } = useDraftStore();
  const { send } = useWebSocketStore();
  const { showNotification, showError } = useUIStore();
  const { sessionId, quizState, questionLimitState, isOwner } = useQuizStore();
  const { getQuestionLimit, vybesBalance, hasUpgradedQuestionLimit } = useAuthStore();
  const [isUnlocking, setIsUnlocking] = useState(false);

  const [questionPrompt, setQuestionPrompt] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [ownerResponse, setOwnerResponseState] = useState<string>('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showCreateSessionDialog, setShowCreateSessionDialog] = useState(false);
  const [pendingPublish, setPendingPublish] = useState(false);
  const prevSessionIdRef = useRef<string | null>(null);

  // Check if session is active (has sessionId and quizState)
  const hasActiveSession = Boolean(sessionId && quizState);

  // Watch for session creation to auto-publish drafts
  useEffect(() => {
    if (pendingPublish && sessionId && sessionId !== prevSessionIdRef.current) {
      // Session was just created, publish the drafts
      const questionsToPublish = [...draftQuestions];
      questionsToPublish.forEach(draft => {
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
      setPendingPublish(false);
      showNotification(`Session created with ${questionsToPublish.length} question(s)`);
    }
    prevSessionIdRef.current = sessionId;
  }, [sessionId, pendingPublish, draftQuestions, send, clearDrafts, showNotification]);

  const addQuestionToDraft = () => {
    // Check question limit first
    if (hasReachedLimit) {
      showError(`Question limit reached (${questionLimit}). Remove drafts or upgrade to add more.`);
      return;
    }

    if (!questionPrompt.trim() || !option1.trim() || !option2.trim()) {
      showError('Please fill in all fields');
      return;
    }

    if (!ownerResponse) {
      showError('Please select your answer to this question');
      return;
    }

    addDraft(questionPrompt, [option1, option2], ownerResponse);
    setQuestionPrompt('');
    setOption1('');
    setOption2('');
    setOwnerResponseState('');
    showNotification('Question added to drafts');
  };

  const publishDraftQuestions = () => {
    // Check if all drafts have owner responses
    const unansweredDrafts = draftQuestions.filter(q => !q.ownerResponse);
    if (unansweredDrafts.length > 0) {
      showError(`Please answer all questions before publishing (${unansweredDrafts.length} unanswered)`);
      return;
    }
    
    // If no active session, show create session dialog
    if (!hasActiveSession) {
      setShowCreateSessionDialog(true);
      return;
    }
    
    setShowPublishDialog(true);
  };

  const confirmPublish = () => {
    // Store draft questions with responses before clearing
    const questionsToPublish = [...draftQuestions];

    // Clear drafts and close dialog immediately for better UX
    clearDrafts();
    setShowPublishDialog(false);
    showNotification(`Publishing ${questionsToPublish.length} question${questionsToPublish.length !== 1 ? 's' : ''}...`);

    // Send all draft questions to server
    questionsToPublish.forEach(draft => {
      send({
        type: 'question:add',
        data: {
          prompt: draft.prompt,
          options: draft.options,
          ownerResponse: draft.ownerResponse
        }
      });
    });
  };

  const confirmCreateSession = () => {
    setShowCreateSessionDialog(false);
    setPendingPublish(true);
    send({ type: 'session:create', data: {} });
  };

  // Get question limit from authStore
  const questionLimit = getQuestionLimit();
  const publishedQuestionsCount = hasActiveSession ? (quizState?.questions.length ?? 0) : 0;
  const totalQuestionsCount = publishedQuestionsCount + draftQuestions.length;
  const hasReachedLimit = totalQuestionsCount >= questionLimit;
  const canAffordUpgrade = vybesBalance >= QUESTION_LIMIT_UPGRADE_COST;
  const hasUpgraded = hasUpgradedQuestionLimit();

  const handleUnlockQuestionLimit = () => {
    if (!canAffordUpgrade) {
      showError(`Not enough Vybes! Need ${QUESTION_LIMIT_UPGRADE_COST}, have ${vybesBalance}`);
      return;
    }
    setIsUnlocking(true);
    send({ type: 'question:unlock-limit' });
    // isUnlocking will be reset when we receive question:limit-unlocked or error
    setTimeout(() => setIsUnlocking(false), 3000); // Fallback reset
  };

  return (
    <div className="w-full min-h-full">
      {/* Session Status Banner */}
      {hasActiveSession ? (
        <div className="py-3 px-4 mb-4 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-base">🟢</span>
            <span className="text-sm font-semibold text-emerald-800">Live Session</span>
          </div>
          <span className="text-xs text-emerald-700 font-mono">
            {sessionId}
          </span>
        </div>
      ) : (
        <div className="py-3 px-4 mb-4 bg-amber-100 rounded-lg border border-amber-300 flex items-center gap-2">
          <span className="text-base">✏️</span>
          <span className="text-sm font-medium text-amber-800">
            Draft Mode — Create questions offline, publish when ready
          </span>
        </div>
      )}

      {/* Combined Question Info Banner */}
      <div className={`py-4 px-5 mb-4 rounded-lg border ${
        hasReachedLimit ? 'bg-red-100 border-red-300' : 'bg-indigo-50 border-indigo-200'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-semibold ${hasReachedLimit ? 'text-red-800' : 'text-indigo-700'}`}>
            📊 Questions in Session
          </span>
          <span className={`text-lg font-bold ${hasReachedLimit ? 'text-red-800' : 'text-indigo-700'}`}>
            {publishedQuestionsCount}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <span className={`text-sm font-semibold ${hasReachedLimit ? 'text-red-800' : 'text-indigo-700'}`}>
              {hasReachedLimit ? '⚠️ Question Limit Reached' : '✅ Question Limit'}
            </span>
            {hasReachedLimit && !hasUpgraded && (
              <span className="text-xs text-red-800 ml-2">
                Upgrade to add more
              </span>
            )}
          </div>
          <span className={`text-lg font-bold ${hasReachedLimit ? 'text-red-800' : 'text-indigo-700'}`}>
            {totalQuestionsCount} / {questionLimit}
          </span>
        </div>

        {/* Upgrade Button - show when at limit and not yet upgraded */}
        {hasReachedLimit && !hasUpgraded && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  Upgrade to 10 Questions
                </div>
                <div className="text-xs text-gray-500">
                  Your balance: {vybesBalance} ✨
                </div>
              </div>
              <button
                onClick={handleUnlockQuestionLimit}
                disabled={!canAffordUpgrade || isUnlocking}
                className={`py-2.5 px-5 rounded-lg border-none font-semibold text-sm transition-all ${
                  canAffordUpgrade
                    ? 'bg-gradient-to-br from-vybe-blue to-vybe-purple text-white cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                } ${isUnlocking ? 'opacity-70' : 'opacity-100'}`}
              >
                {isUnlocking ? 'Unlocking...' : `Unlock (${QUESTION_LIMIT_UPGRADE_COST} ✨)`}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-[20px] mb-5 shadow-card">
        <h2 className="mt-0 mb-4 text-gray-800 text-xl font-bold">Add Question</h2>
        <input
          type="text"
          placeholder="Question prompt"
          value={questionPrompt}
          onChange={(e) => setQuestionPrompt(e.target.value)}
          disabled={hasReachedLimit}
          className="w-full mb-3"
        />
        <input
          type="text"
          placeholder="Option 1"
          value={option1}
          onChange={(e) => setOption1(e.target.value)}
          disabled={hasReachedLimit}
          className="w-full mb-3"
        />
        <input
          type="text"
          placeholder="Option 2"
          value={option2}
          onChange={(e) => setOption2(e.target.value)}
          disabled={hasReachedLimit}
          className="w-full mb-3"
        />

        {/* Owner Response Selection */}
        {option1 && option2 && (
          <div className="mt-4 mb-3">
            <label className="block mb-2 text-sm font-semibold text-gray-800">
              Your Answer:
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setOwnerResponseState(option1)}
                disabled={hasReachedLimit}
                className={`flex-1 py-4 px-6 border-2 rounded-xl cursor-pointer text-[17px] font-medium transition-all text-center select-none [-webkit-tap-highlight-color:transparent] touch-manipulation active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
                  ownerResponse === option1
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-500 shadow-emerald'
                    : 'bg-white text-gray-800 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                }`}
              >
                {option1}
                {ownerResponse === option1 && ' ✓'}
              </button>
              <button
                onClick={() => setOwnerResponseState(option2)}
                disabled={hasReachedLimit}
                className={`flex-1 py-4 px-6 border-2 rounded-xl cursor-pointer text-[17px] font-medium transition-all text-center select-none [-webkit-tap-highlight-color:transparent] touch-manipulation active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
                  ownerResponse === option2
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-500 shadow-emerald'
                    : 'bg-white text-gray-800 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                }`}
              >
                {option2}
                {ownerResponse === option2 && ' ✓'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={addQuestionToDraft}
          disabled={hasReachedLimit}
          className={`w-full py-4 px-6 border-2 border-gray-200 rounded-xl cursor-pointer text-[17px] font-semibold transition-all text-center select-none [-webkit-tap-highlight-color:transparent] touch-manipulation bg-white text-vybe-blue shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:bg-gray-50 active:scale-[0.97] ${
            hasReachedLimit ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {hasReachedLimit ? '🔒 Limit Reached' : '+ Add to Drafts'}
        </button>
      </div>

      {draftQuestions.length > 0 && (
        <div className="mb-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-800 text-xl font-bold m-0">Draft Questions ({draftQuestions.length})</h2>
            <button
              onClick={publishDraftQuestions}
              className="py-2.5 px-5 text-[15px] border-none rounded-xl cursor-pointer font-semibold transition-all text-center select-none [-webkit-tap-highlight-color:transparent] touch-manipulation bg-gradient-to-br from-vybe-blue to-vybe-purple text-white shadow-primary active:scale-[0.97]"
            >
              Publish All
            </button>
          </div>
          {draftQuestions.map((draft, index) => (
            <DraftQuestionCard
              key={draft.id}
              draft={draft}
              index={index}
              onRemove={removeDraft}
              onSetOwnerResponse={setOwnerResponse}
            />
          ))}
        </div>
      )}

      {draftQuestions.length === 0 && (
        <p className="text-center text-gray-500 py-10 px-5">
          ✏️ Create questions above to add to your drafts
        </p>
      )}

      <ConfirmDialog
        isOpen={showPublishDialog}
        title="Publish Questions?"
        message={`Are you sure you want to publish ${draftQuestions.length} question${draftQuestions.length !== 1 ? 's' : ''}? Participants will be able to see and answer them immediately.`}
        onConfirm={confirmPublish}
        onCancel={() => setShowPublishDialog(false)}
        confirmText="Publish"
      />

      <ConfirmDialog
        isOpen={showCreateSessionDialog}
        title="Create New Session?"
        message={`This will create a new quiz session and publish your ${draftQuestions.length} draft question${draftQuestions.length !== 1 ? 's' : ''}. Others can join using the session ID.`}
        onConfirm={confirmCreateSession}
        onCancel={() => setShowCreateSessionDialog(false)}
        confirmText="Create & Publish"
      />
    </div>
  );
}
