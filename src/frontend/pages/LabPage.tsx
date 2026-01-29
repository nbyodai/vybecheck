import { useState } from 'react';
import { useDraftStore } from '../store/draftStore';
import { useWebSocketStore } from '../store/websocketStore';
import { useUIStore } from '../store/uiStore';
import { DraftQuestionCard } from '../components/DraftQuestionCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function LabPage() {
  const { draftQuestions, addDraft, removeDraft, clearDrafts } = useDraftStore();
  const { send } = useWebSocketStore();
  const { showNotification, showError } = useUIStore();
  
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const addQuestionToDraft = () => {
    if (!questionPrompt.trim() || !option1.trim() || !option2.trim()) {
      showError('Please fill in all fields');
      return;
    }
    
    addDraft(questionPrompt, [option1, option2]);
    setQuestionPrompt('');
    setOption1('');
    setOption2('');
    showNotification('Question added to drafts');
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
    
    clearDrafts();
    setShowPublishDialog(false);
    showNotification(`Published ${draftQuestions.length} question${draftQuestions.length !== 1 ? 's' : ''}!`);
  };

  return (
    <div className="page-content">
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
            <DraftQuestionCard
              key={draft.id}
              draft={draft}
              index={index}
              onRemove={removeDraft}
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
