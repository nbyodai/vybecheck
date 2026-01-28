import type { Response } from '../models/Response';
import type { QuizSession } from '../models/QuizSession';

export interface Match {
  participantId: string;
  matchPercentage: number;
}

export type Tier = 'PREVIEW' | 'TOP3' | 'ALL';

interface CacheEntry {
  matches: Match[];
  timestamp: number;
}

export class MatchingService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 600000; // 10 minutes
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

      // Skip participants who have no responses
      if (otherValues.every(v => v === '')) {
        continue;
      }

      const matchPercentage = this.calculateMatch(targetValues, otherValues);

      matches.push({
        participantId: otherId,
        matchPercentage
      });
    }

    // Sort by match percentage (highest first)
    return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  /**
   * Generate a cache version key based on session state
   * This invalidates the cache when quiz state changes
   */
  private getSessionStateHash(session: QuizSession): string {
    // Include: number of questions, number of responses, number of participants
    // This ensures cache invalidation when any of these change
    const questionCount = session.quiz.length;
    const responseCount = session.responses.length;
    const participantCount = session.participants.size;
    
    return `${questionCount}:${responseCount}:${participantCount}`;
  }

  /**
   * Get matches for a participant by tier, with caching
   * 
   * @param params.participantId - The participant to get matches for
   * @param params.session - The quiz session
   * @param params.tier - The tier level (PREVIEW, TOP3, or ALL)
   * @returns Filtered matches based on tier
   */
  getMatchesByTier(params: {
    participantId: string;
    session: QuizSession;
    tier: Tier;
  }): Match[] {
    const { participantId, session, tier } = params;
    const stateHash = this.getSessionStateHash(session);
    const cacheKey = `${participantId}_${session.sessionId}_${stateHash}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    let allMatches: Match[];

    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      // Use cached data
      allMatches = cached.matches;
    } else {
      // Calculate and cache
      allMatches = this.getMatchesForParticipant(participantId, session);
      this.cache.set(cacheKey, {
        matches: allMatches,
        timestamp: now,
      });
    }

    // Apply tier filtering
    switch (tier) {
      case 'PREVIEW':
        // Return 2 middle matches (indices 5-6)
        return allMatches.slice(5, 7);
      case 'TOP3':
        // Return top 3 matches
        return allMatches.slice(0, 3);
      case 'ALL':
        // Return all matches
        return allMatches;
      default:
        return allMatches;
    }
  }
}
