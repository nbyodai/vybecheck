import type { DraftQuestion } from '../store/draftStore';

interface DraftQuestionCardProps {
  draft: DraftQuestion;
  index: number;
  onRemove: (id: string) => void;
  onSetOwnerResponse?: (id: string, response: string) => void;
}

export function DraftQuestionCard({ draft, index, onRemove, onSetOwnerResponse }: DraftQuestionCardProps) {
  return (
    <div className="draft-question-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, flex: 1, fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
          Q{index + 1}: {draft.prompt}
        </h3>
        <button 
          onClick={() => onRemove(draft.id)} 
          className="btn-icon"
          style={{ marginLeft: '12px' }}
        >
          ✕
        </button>
      </div>
      <div className="draft-options">
        {draft.options.map((option) => (
          <div 
            key={option}
            className="draft-option"
            onClick={() => onSetOwnerResponse?.(draft.id, option)}
            style={{ 
              cursor: onSetOwnerResponse ? 'pointer' : 'default',
              background: draft.ownerResponse === option ? '#10B981' : 'white',
              color: draft.ownerResponse === option ? 'white' : '#1F2937',
              borderColor: draft.ownerResponse === option ? '#10B981' : '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{option}</span>
            {draft.ownerResponse === option && <span>✓</span>}
          </div>
        ))}
      </div>
      {!draft.ownerResponse && (
        <div style={{ 
          marginTop: '8px',
          fontSize: '12px',
          color: '#DC2626',
          fontWeight: '500'
        }}>
          ⚠️ Click an option to select your answer
        </div>
      )}
    </div>
  );
}
