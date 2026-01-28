import type { ParticipantUnlock } from '../models/ParticipantUnlock.js';

/**
 * QuotaManager - Manages question limits for quiz owners
 * 
 * Default: 3 free questions
 * With upgrade: 10 questions
 * Only owners can add questions
 */
export class QuotaManager {
  private participantUnlock?: ParticipantUnlockManager;

  private readonly DEFAULT_LIMIT = 3;
  private readonly UPGRADED_LIMIT = 10;

  constructor(participantUnlock?: ParticipantUnlockManager) {
    this.participantUnlock = participantUnlock;
  }

  /**
   * Get question limit for a participant
   * @param participantId - Participant ID
   * @param sessionId - Session ID
   * @returns Current question limit
   */
  getQuestionLimit(participantId: string, sessionId: string): number {
    const resourceId = `session:${sessionId}`;
    const hasUpgrade = this.participantUnlock?.hasUnlock(
      participantId,
      resourceId,
      'QUESTION_LIMIT_10'
    );

    return hasUpgrade ? this.UPGRADED_LIMIT : this.DEFAULT_LIMIT;
  }

  /**
   * Check if participant can add another question
   * @param participantId - Participant ID
   * @param sessionId - Session ID
   * @param currentCount - Current question count
   * @param isOwner - Whether participant is owner
   * @returns True if participant can add question
   */
  canAddQuestion(
    participantId: string,
    sessionId: string,
    currentCount: number,
    isOwner: boolean
  ): boolean {
    // Only owners can add questions
    if (!isOwner) {
      return false;
    }

    const limit = this.getQuestionLimit(participantId, sessionId);
    return currentCount < limit;
  }

  /**
   * Unlock question limit for participant
   * @param participantId - Participant ID
   * @param sessionId - Session ID
   */
  unlockQuestionLimit(participantId: string, sessionId: string): void {
    const resourceId = `session:${sessionId}`;
    this.participantUnlock?.createUnlock(
      participantId,
      resourceId,
      'QUESTION_LIMIT_10'
    );
  }

  /**
   * Get current limit for a participant (alias with params object)
   * @param params - Query parameters
   * @returns Current question limit
   */
  getCurrentLimit(params: {
    participantId: string;
    sessionId: string;
    isOwner: boolean;
  }): number {
    const { participantId, sessionId, isOwner } = params;

    if (!isOwner) {
      return 0; // Non-owners cannot add questions
    }

    return this.getQuestionLimit(participantId, sessionId);
  }
}
