import { useQuizStore } from '../store/quizStore';
import { useWebSocketStore } from '../store/websocketStore';
import { QuestionCard } from '../components/QuestionCard';
import { MatchCard } from '../components/MatchCard';

export function QuizPage() {
  const { quizState, matches } = useQuizStore();
  const { send } = useWebSocketStore();

  const submitResponse = (questionId: string, optionChosen: string) => {
    send({
      type: 'response:submit',
      data: { questionId, optionChosen }
    });
  };

  const getMatches = () => {
    send({ type: 'matches:get' });
  };

  if (!quizState) {
    return (
      <div className="page-content">
        <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px 20px' }}>
          Loading quiz...
        </p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="questions-section">
        <h2>Questions ({quizState.questions.length})</h2>
        {quizState.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            myResponse={quizState.myResponses[index]}
            onSubmit={submitResponse}
          />
        ))}
        {quizState.questions.length === 0 && (
          <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px 20px' }}>
            ⏳ Waiting for questions...
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
                <MatchCard
                  key={match.participantId}
                  match={match}
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
