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
    <div className="bg-white rounded-[20px] p-5 mb-4 shadow-card transition-all active:scale-[0.99]">
      <h3 className="m-0 mb-4 text-gray-800 text-[17px] font-semibold leading-relaxed">Q{index + 1}: {question.prompt}</h3>
      <div className="flex flex-col gap-3">
        {question.options.map((option) => {
          const isSelected = hasAnswered && myResponse === option;
          return (
            <button
              key={option}
              onClick={() => onSubmit(question.id, option)}
              disabled={hasAnswered || disabled}
              className={`w-full py-4 px-6 border-2 rounded-xl cursor-pointer text-[17px] font-medium transition-all text-center select-none [-webkit-tap-highlight-color:transparent] touch-manipulation active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-500 shadow-emerald'
                  : 'bg-white text-gray-800 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:bg-gray-50 active:border-gray-300'
              }`}
            >
              {option}
              {isSelected && ' ✓'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
