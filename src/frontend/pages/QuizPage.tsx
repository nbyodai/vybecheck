import { useState, useEffect, useRef } from 'react';
import { useQuizStore } from '../store/quizStore';
import { useWebSocketStore } from '../store/websocketStore';
import { useAuthStore } from '../store/authStore';
import { MatchCard } from '../components/MatchCard';
import type { MatchTier } from '../../shared/types';
import '../styles/QuizPage.css';

// TODO: Refactor this page - it's doing a lot right now with quiz taking, progress tracking, and match purchasing.
// We can break it down into smaller components and hooks for better readability and maintainability.
// Pricing for match tiers
const TIER_COSTS: Record<MatchTier, number> = {
  PREVIEW: 0,
  TOP3: 2,
  ALL: 5,
};

const TIER_LABELS: Record<MatchTier, string> = {
  PREVIEW: 'Preview (2 matches)',
  TOP3: 'Top 3 Matches',
  ALL: 'All Matches',
};

export function QuizPage() {
  const { quizState, matchState, setMatchesLoading } = useQuizStore();
  const { send } = useWebSocketStore();
  const { vybesBalance, hasFeatureUnlock } = useAuthStore();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<MatchTier>('PREVIEW');
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

  const getMatches = (tier: MatchTier) => {
    setMatchesLoading(true);
    send({ type: 'matches:get', data: { tier } });
  };

  // Check if user already has access to a tier (won't be charged again)
  const hasTierAccess = (tier: MatchTier): boolean => {
    if (tier === 'PREVIEW') return true;
    if (tier === 'TOP3') return hasFeatureUnlock('MATCH_TOP3') || hasFeatureUnlock('MATCH_ALL');
    if (tier === 'ALL') return hasFeatureUnlock('MATCH_ALL');
    return false;
  };

  const canAffordTier = (tier: MatchTier): boolean => {
    if (hasTierAccess(tier)) return true;
    return vybesBalance >= TIER_COSTS[tier];
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

                {/* Tier Selection */}
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(['PREVIEW', 'TOP3', 'ALL'] as MatchTier[]).map((tier) => {
                    const cost = TIER_COSTS[tier];
                    const hasAccess = hasTierAccess(tier);
                    const canAfford = canAffordTier(tier);
                    const isSelected = selectedTier === tier;

                    return (
                      <button
                        key={tier}
                        onClick={() => setSelectedTier(tier)}
                        disabled={!canCalculateMatches}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #6366F1' : '2px solid #E5E7EB',
                          background: isSelected ? '#EEF2FF' : 'white',
                          cursor: canCalculateMatches ? 'pointer' : 'not-allowed',
                          opacity: canCalculateMatches ? 1 : 0.5,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: isSelected ? '6px solid #6366F1' : '2px solid #D1D5DB',
                            background: 'white',
                          }} />
                          <span style={{ fontWeight: '600', color: '#1F2937' }}>
                            {TIER_LABELS[tier]}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: hasAccess ? '#10B981' : canAfford ? '#6366F1' : '#EF4444',
                        }}>
                          {hasAccess ? '✓ Unlocked' : cost === 0 ? 'Free' : `${cost} ✨`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Balance indicator */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#6B7280',
                }}>
                  <span>Your balance:</span>
                  <span style={{ fontWeight: '600', color: '#1F2937' }}>{vybesBalance} ✨</span>
                </div>

                <button
                  onClick={() => getMatches(selectedTier)}
                  disabled={!canCalculateMatches || !canAffordTier(selectedTier) || matchState.isLoading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    opacity: canCalculateMatches && canAffordTier(selectedTier) ? 1 : 0.5,
                    cursor: canCalculateMatches && canAffordTier(selectedTier) ? 'pointer' : 'not-allowed'
                  }}
                >
                  {matchState.isLoading ? 'Loading...' :
                   hasTierAccess(selectedTier) ? `View ${TIER_LABELS[selectedTier]}` :
                   `Unlock ${TIER_LABELS[selectedTier]} (${TIER_COSTS[selectedTier]} ✨)`}
                </button>
              </>
            );
          })()}

          {matchState.matches.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>
                  Your Matches ({TIER_LABELS[matchState.tier]})
                </h3>
                {matchState.cost > 0 && (
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>
                    Cost: {matchState.cost} ✨
                  </span>
                )}
              </div>
              <div className="matches-list">
                {matchState.matches.map((match, index) => (
                  <MatchCard
                    key={match.participantId}
                    match={match}
                    rank={index + 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
