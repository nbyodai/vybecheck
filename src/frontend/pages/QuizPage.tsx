import { useState, useEffect, useRef } from 'react';
import { useQuizStore } from '../store/quizStore';
import { useWebSocketStore } from '../store/websocketStore';
import { MatchCard } from '../components/MatchCard';
import '../styles/QuizPage.css';

export function QuizPage() {
  const { quizState, matches } = useQuizStore();
  const { send } = useWebSocketStore();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const prevQuestionCountRef = useRef(0);

  // Configurable threshold: percentage of participants that must complete before matches can be calculated
  // 100 = all participants must complete, 50 = half must complete, etc.
  const COMPLETION_THRESHOLD_PERCENT = 100;

  // Navigate to new questions when they're added
  useEffect(() => {
    if (!quizState || quizState.questions.length === 0) return;

    const currentQuestionCount = quizState.questions.length;

    // Check if new questions were added
    if (currentQuestionCount > prevQuestionCountRef.current) {
      console.log('New questions added! Old count:', prevQuestionCountRef.current, 'New count:', currentQuestionCount);

      // Find first unanswered
      const firstUnanswered = quizState.myResponses.findIndex(response => response === '');
      console.log('First unanswered question index:', firstUnanswered);

      if (firstUnanswered !== -1) {
        // Jump to first unanswered question
        setCurrentQuestionIndex(firstUnanswered);
      }
    }

    // Update the ref for next comparison
    prevQuestionCountRef.current = currentQuestionCount;

    // Handle out of bounds
    if (currentQuestionIndex >= quizState.questions.length) {
      setCurrentQuestionIndex(quizState.questions.length - 1);
    }
  }, [quizState?.questions.length, quizState?.myResponses, currentQuestionIndex]);

  const submitResponse = (questionId: string, optionChosen: string) => {
    send({
      type: 'response:submit',
      data: { questionId, optionChosen }
    });

    // Move to next question after answering
    if (quizState && currentQuestionIndex < quizState.questions.length - 1) {
      setTimeout(() => setCurrentQuestionIndex(currentQuestionIndex + 1), 300);
    }
  };

  const getMatches = () => {
    console.log(quizState?.myResponses)
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

  if (quizState.questions.length === 0) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>Waiting for questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quizState.questions[currentQuestionIndex];
  const currentResponse = quizState.myResponses[currentQuestionIndex];
  const hasAnswered = currentResponse !== '';
  const answeredCount = quizState.myResponses.filter(r => r !== '').length;
  const totalQuestions = quizState.questions.length;
  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);

  // Calculate completion locally - check if all questions have been answered
  const isCompleted = quizState.myResponses.every(r => r !== '');

  return (
    <div className="page-content quiz-page">
      {/* Progress Bar */}
      <div className="quiz-progress">
        <div className="progress-header">
          <span className="progress-label">QUESTION {currentQuestionIndex + 1} OF {totalQuestions}</span>
          <span className="progress-percentage">{progressPercentage}% Complete</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
        </div>
      </div>

      {/* Question Card */}
      {!isCompleted ? (
        <div className="single-question-container">
          <div className="question-icon">🎨</div>
          <h2 className="question-title">{currentQuestion.prompt}</h2>
          <p className="question-subtitle">Pick the option that speaks to you right now.</p>

          <div className="question-options">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => submitResponse(currentQuestion.id, option)}
                disabled={hasAnswered}
                className={`option-button ${
                  hasAnswered && currentResponse === option ? 'selected' : ''
                }`}
              >
                <div className="option-icon" style={{
                  background: hasAnswered && currentResponse === option
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                }}>
                  {hasAnswered && currentResponse === option ? '✓' : '○'}
                </div>
                <span className="option-text">{option}</span>
                <div className="option-radio">
                  {hasAnswered && currentResponse === option && (
                    <div className="radio-selected" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Matches Section - shown after completion */
        <div className="single-question-container">
          <div className="question-icon">✨</div>
          <h2 className="question-title">You've completed the quiz!</h2>
          <p className="question-subtitle">Calculate your matches to see who you vibe with.</p>

          {(() => {
            // Calculate how many participants have completed
            const participantsWithResponses = quizState.participants.filter(p => {
              // Check if this participant has answered all questions
              // Note: This is a simplified check - in reality, we'd need server data
              // For now, we'll use a simple heuristic based on active participants
              return p.isActive;
            }).length;

            const totalParticipants = quizState.participantCount;
            const completionRate = totalParticipants > 0
              ? Math.round((participantsWithResponses / totalParticipants) * 100)
              : 0;

            const canCalculateMatches = completionRate >= COMPLETION_THRESHOLD_PERCENT;

            return (
              <>
                {!canCalculateMatches && (
                  <div style={{
                    background: '#FEF3C7',
                    border: '2px solid #F59E0B',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginTop: '16px',
                    fontSize: '14px',
                    color: '#92400E',
                    fontWeight: '500',
                    textAlign: 'center'
                  }}>
                    ⏳ Waiting for {COMPLETION_THRESHOLD_PERCENT}% of participants to complete
                    <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.8 }}>
                      Currently: {completionRate}% ({participantsWithResponses}/{totalParticipants} active)
                    </div>
                  </div>
                )}

                <button
                  onClick={getMatches}
                  disabled={!canCalculateMatches}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: '24px',
                    opacity: canCalculateMatches ? 1 : 0.5,
                    cursor: canCalculateMatches ? 'pointer' : 'not-allowed'
                  }}
                >
                  Calculate Matches
                </button>
              </>
            );
          })()}

          {matches.length > 0 && (
            <div className="matches-list" style={{ marginTop: '24px' }}>
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
