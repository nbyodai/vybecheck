import type { Question } from '../../shared/types';

interface QuestionCardProps {
  question: Question;
  index: number;
  myResponse?: string;
  onSubmit: (questionId: string, optionChosen: string) => void;
  disabled?: boolean;
}

export function QuestionCard({ question, index, myResponse = '', onSubmit, disabled = false }: QuestionCardProps) {
  const hasAnswered = myResponse !== '';

  return (
    <div className="question-card">
      <h3>Q{index + 1}: {question.prompt}</h3>
      <div className="options">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => onSubmit(question.id, option)}
            disabled={hasAnswered || disabled}
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
}
