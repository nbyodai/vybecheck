import { useState } from 'react';
import { useDraftStore } from '../store/draftStore';
import { useWebSocketStore } from '../store/websocketStore';
import { useUIStore } from '../store/uiStore';
import { useQuizStore } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { DraftQuestionCard } from '../components/DraftQuestionCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function LabPage() {
  const { draftQuestions, addDraft, removeDraft, clearDrafts, setOwnerResponse } = useDraftStore();
  const { send } = useWebSocketStore();
  const { showNotification, showError } = useUIStore();
  const { quizState } = useQuizStore();
  const { getQuestionLimit } = useAuthStore();

  const [questionPrompt, setQuestionPrompt] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [ownerResponse, setOwnerResponseState] = useState<string>('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);

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
    // The owner responses will be submitted when we receive question:added events
    questionsToPublish.forEach(draft => {
      send({
        type: 'question:add',
        data: {
          prompt: draft.prompt,
          options: draft.options,
          // Include owner response in metadata so we can auto-submit it
          ownerResponse: draft.ownerResponse
        }
      });
    });
  };

  // Get question limit from authStore
  const questionLimit = getQuestionLimit();
  const publishedQuestionsCount = quizState?.questions.length ?? 0;
  const totalQuestionsCount = publishedQuestionsCount + draftQuestions.length;
  const hasReachedLimit = totalQuestionsCount >= questionLimit;

  return (
    <div className="page-content">
      {/* Combined Question Info Banner */}
      <div style={{ 
        padding: '16px 20px', 
        marginBottom: '16px', 
        backgroundColor: hasReachedLimit ? '#FEE2E2' : '#EEF2FF', 
        borderRadius: '8px',
        border: hasReachedLimit ? '1px solid #FCA5A5' : '1px solid #C7D2FE'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: hasReachedLimit ? '#991B1B' : '#4338CA', fontWeight: '600' }}>
            📊 Questions in Session
          </span>
          <span style={{ fontSize: '18px', fontWeight: '700', color: hasReachedLimit ? '#991B1B' : '#4338CA' }}>
            {publishedQuestionsCount}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ 
              fontSize: '14px', 
              color: hasReachedLimit ? '#991B1B' : '#4338CA', 
              fontWeight: '600'
            }}>
              {hasReachedLimit ? '⚠️ Question Limit Reached' : '✅ Question Limit'}
            </span>
            {hasReachedLimit && (
              <span style={{ fontSize: '12px', color: '#991B1B', marginLeft: '8px' }}>
                Remove drafts or upgrade to add more
              </span>
            )}
          </div>
          <span style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            color: hasReachedLimit ? '#991B1B' : '#4338CA'
          }}>
            {totalQuestionsCount} / {questionLimit}
          </span>
        </div>
      </div>
      <div className="owner-controls">
        <h2>Add Question</h2>
        <input
          type="text"
          placeholder="Question prompt"
          value={questionPrompt}
          onChange={(e) => setQuestionPrompt(e.target.value)}
          disabled={hasReachedLimit}
        />
        <input
          type="text"
          placeholder="Option 1"
          value={option1}
          onChange={(e) => setOption1(e.target.value)}
          disabled={hasReachedLimit}
        />
        <input
          type="text"
          placeholder="Option 2"
          value={option2}
          onChange={(e) => setOption2(e.target.value)}
          disabled={hasReachedLimit}
        />

        {/* Owner Response Selection */}
        {option1 && option2 && (
          <div style={{ marginTop: '16px', marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
              Your Answer:
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setOwnerResponseState(option1)}
                className={`btn ${ownerResponse === option1 ? 'btn-selected' : 'btn-option'}`}
                style={{ flex: 1 }}
                disabled={hasReachedLimit}
              >
                {option1}
                {ownerResponse === option1 && ' ✓'}
              </button>
              <button
                onClick={() => setOwnerResponseState(option2)}
                className={`btn ${ownerResponse === option2 ? 'btn-selected' : 'btn-option'}`}
                style={{ flex: 1 }}
                disabled={hasReachedLimit}
              >
                {option2}
                {ownerResponse === option2 && ' ✓'}
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={addQuestionToDraft} 
          className="btn btn-secondary"
          disabled={hasReachedLimit}
          style={hasReachedLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          {hasReachedLimit ? '🔒 Limit Reached' : '+ Add to Drafts'}
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
        <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px 20px' }}>
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
    </div>
  );
}
