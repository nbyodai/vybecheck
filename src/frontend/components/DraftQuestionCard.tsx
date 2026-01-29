import type { DraftQuestion } from '../store/draftStore';

interface DraftQuestionCardProps {
  draft: DraftQuestion;
  index: number;
  onRemove: (id: string) => void;
}

export function DraftQuestionCard({ draft, index, onRemove }: DraftQuestionCardProps) {
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
        <div className="draft-option">{draft.options[0]}</div>
        <div className="draft-option">{draft.options[1]}</div>
      </div>
    </div>
  );
}
