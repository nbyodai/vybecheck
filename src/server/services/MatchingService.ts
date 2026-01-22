import type { Response } from '../models/Response';
import type { QuizSession } from '../models/QuizSession';

export interface Match {
  participantId: string;
  matchPercentage: number;
}

export class MatchingService {
  /**
   * Get ordered response values for a participant
   * Used for quick matching calculations
   * Returns values in question order, with empty strings for unanswered questions
   */
  getResponseValues(
    participantId: string,
    responses: Response[],
    questionOrder: string[]
  ): string[] {
    const responseMap = new Map<string, string>();

    // Build map of questionId -> optionChosen
    responses
      .filter(r => r.participantId === participantId)
      .forEach(r => responseMap.set(r.questionId, r.optionChosen));

    // Return in question order
    return questionOrder.map(qId => responseMap.get(qId) || '');
  }

  /**
   * Calculate match percentage between two participants
   * Returns percentage of questions answered the same way
   * Ignores empty strings (unanswered questions)
   */
  calculateMatch(
    participant1Values: string[],
    participant2Values: string[]
  ): number {
    const minLength = Math.min(participant1Values.length, participant2Values.length);
    
    if (minLength === 0) {
      return 0;
    }

    let matches = 0;
    let comparedCount = 0;

    for (let i = 0; i < minLength; i++) {
      const val1 = participant1Values[i];
      const val2 = participant2Values[i];

      // Skip if either participant hasn't answered this question
      if (val1 === '' || val2 === '') {
        continue;
      }

      comparedCount++;

      if (val1 === val2) {
        matches++;
      }
    }

    // Avoid division by zero
    if (comparedCount === 0) {
      return 0;
    }

    return (matches / comparedCount) * 100;
  }

  /**
   * Get all matches for a participant, sorted by similarity (highest first)
   */
  getMatchesForParticipant(
    participantId: string,
    session: QuizSession
  ): Match[] {
    // Get target participant's response values
    const targetValues = this.getResponseValues(
      participantId,
      session.responses,
      session.quiz
    );

    // If target participant has no responses, return empty
    if (targetValues.every(v => v === '')) {
      return [];
    }

    const matches: Match[] = [];

    // Compare with all other participants
    for (const [otherId, _] of session.participants) {
      // Skip self
      if (otherId === participantId) {
        continue;
      }

      const otherValues = this.getResponseValues(
        otherId,
        session.responses,
        session.quiz
      );

      const matchPercentage = this.calculateMatch(targetValues, otherValues);

      matches.push({
        participantId: otherId,
        matchPercentage
      });
    }

    // Sort by match percentage (highest first)
    return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }
}
