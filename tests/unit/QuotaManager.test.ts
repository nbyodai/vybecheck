import { describe, it, expect, beforeEach } from 'vitest';
import { QuotaManager } from '../../src/server/models/QuotaManager';
import { ParticipantUnlockManager } from '../../src/server/models/ParticipantUnlock';

describe('QuotaManager', () => {
  let quotaManager: QuotaManager;
  let unlockManager: ParticipantUnlockManager;

  beforeEach(() => {
    unlockManager = new ParticipantUnlockManager();
    quotaManager = new QuotaManager(unlockManager);
  });

  describe('Question Limit Retrieval', () => {
    it('should get default question limit (returns 3)', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';

      const limit = quotaManager.getQuestionLimit(ownerId, sessionId);

      expect(limit).toBe(3);
    });

    it('should get upgraded question limit (returns 10 after unlock)', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const resourceId = `session:${sessionId}`;

      // Grant the question limit upgrade to owner
      unlockManager.createUnlock(ownerId, resourceId, 'QUESTION_LIMIT_10');

      const limit = quotaManager.getQuestionLimit(ownerId, sessionId);

      expect(limit).toBe(10);
    });

    it('should return default limit for different session even if owner has upgrade elsewhere', () => {
      const ownerId = 'owner-123';
      const sessionId1 = 'session:abc123';
      const sessionId2 = 'session:def456';

      // Grant upgrade for session 1 only
      unlockManager.createUnlock(ownerId, `session:${sessionId1}`, 'QUESTION_LIMIT_10');

      expect(quotaManager.getQuestionLimit(ownerId, sessionId1)).toBe(10);
      expect(quotaManager.getQuestionLimit(ownerId, sessionId2)).toBe(3);
    });
  });

  describe('canAddQuestion Validation (Owner Only)', () => {
    it('should return true when owner is under limit', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const isOwner = true;

      // Default limit is 3, current count is 2
      const canAdd = quotaManager.canAddQuestion(ownerId, sessionId, 2, isOwner);

      expect(canAdd).toBe(true);
    });

    it('should return true when owner is at exactly limit - 1', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const isOwner = true;

      // Default limit is 3, current count is 2 (can add 1 more to reach 3)
      const canAdd = quotaManager.canAddQuestion(ownerId, sessionId, 2, isOwner);

      expect(canAdd).toBe(true);
    });

    it('should return false when owner is at limit', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const isOwner = true;

      // Default limit is 3, current count is 3
      const canAdd = quotaManager.canAddQuestion(ownerId, sessionId, 3, isOwner);

      expect(canAdd).toBe(false);
    });

    it('should return false when owner is over limit', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const isOwner = true;

      // Somehow exceeded limit (shouldn't happen, but handle it)
      const canAdd = quotaManager.canAddQuestion(ownerId, sessionId, 5, isOwner);

      expect(canAdd).toBe(false);
    });

    it('should return true when owner purchases upgrade and can add more', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const resourceId = `session:${sessionId}`;
      const isOwner = true;

      // Owner is at default limit (3 questions)
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 3, isOwner)).toBe(false);

      // Owner purchases upgrade
      unlockManager.createUnlock(ownerId, resourceId, 'QUESTION_LIMIT_10');

      // Now can add more (limit is 10)
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 3, isOwner)).toBe(true);
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 9, isOwner)).toBe(true);
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 10, isOwner)).toBe(false);
    });

    it('should return false for non-owner regardless of quota', () => {
      const nonOwnerId = 'participant-456';
      const sessionId = 'session:abc123';
      const isOwner = false;

      // Non-owner should never be able to add questions
      expect(quotaManager.canAddQuestion(nonOwnerId, sessionId, 0, isOwner)).toBe(false);
      expect(quotaManager.canAddQuestion(nonOwnerId, sessionId, 2, isOwner)).toBe(false);
      expect(quotaManager.canAddQuestion(nonOwnerId, sessionId, 5, isOwner)).toBe(false);
    });

    it('should return false for non-owner even if they purchased question limit upgrade', () => {
      const nonOwnerId = 'participant-456';
      const sessionId = 'session:abc123';
      const resourceId = `session:${sessionId}`;
      const isOwner = false;

      // Non-owner purchases upgrade (shouldn't happen, but test defense)
      unlockManager.createUnlock(nonOwnerId, resourceId, 'QUESTION_LIMIT_10');

      // Still cannot add questions because not owner
      expect(quotaManager.canAddQuestion(nonOwnerId, sessionId, 0, isOwner)).toBe(false);
    });

    it('should handle zero current count for owner', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const isOwner = true;

      const canAdd = quotaManager.canAddQuestion(ownerId, sessionId, 0, isOwner);

      expect(canAdd).toBe(true);
    });
  });

  describe('unlockQuestionLimit', () => {
    it('should create proper unlock record for owner', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const resourceId = `session:${sessionId}`;

      quotaManager.unlockQuestionLimit(ownerId, sessionId);

      // Verify unlock was created
      const hasUnlock = unlockManager.hasUnlock(ownerId, resourceId, 'QUESTION_LIMIT_10');
      expect(hasUnlock).toBe(true);

      // Verify limit is now 10
      const limit = quotaManager.getQuestionLimit(ownerId, sessionId);
      expect(limit).toBe(10);
    });

    it('should be idempotent (calling multiple times does not create duplicates)', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';

      quotaManager.unlockQuestionLimit(ownerId, sessionId);
      quotaManager.unlockQuestionLimit(ownerId, sessionId);
      quotaManager.unlockQuestionLimit(ownerId, sessionId);

      const limit = quotaManager.getQuestionLimit(ownerId, sessionId);
      expect(limit).toBe(10);

      // Verify only one unlock exists
      const unlocks = unlockManager.getUnlocksForParticipant(ownerId);
      expect(unlocks).toHaveLength(1);
    });
  });

  describe('Multiple Quota Types (Extensibility)', () => {
    it('should support multiple quota types for same owner', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const resourceId = `session:${sessionId}`;

      // Question limit unlock
      quotaManager.unlockQuestionLimit(ownerId, sessionId);

      // Simulate other quota types (like match tiers) being unlocked
      unlockManager.createUnlock(ownerId, resourceId, 'MATCH_TOP3');

      // Both should coexist
      expect(unlockManager.hasUnlock(ownerId, resourceId, 'QUESTION_LIMIT_10')).toBe(true);
      expect(unlockManager.hasUnlock(ownerId, resourceId, 'MATCH_TOP3')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative current count for owner (invalid input)', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const isOwner = true;

      // Should treat as under limit
      const canAdd = quotaManager.canAddQuestion(ownerId, sessionId, -1, isOwner);

      expect(canAdd).toBe(true);
    });

    it('should handle very large current count for owner', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const isOwner = true;

      const canAdd = quotaManager.canAddQuestion(ownerId, sessionId, 1000, isOwner);

      expect(canAdd).toBe(false);
    });

    it('should distinguish between owner and non-owner in same session', () => {
      const ownerId = 'owner-123';
      const nonOwnerId = 'participant-456';
      const sessionId = 'session:abc123';
      const resourceId = `session:${sessionId}`;

      // Owner purchases upgrade
      unlockManager.createUnlock(ownerId, resourceId, 'QUESTION_LIMIT_10');

      // Owner can add questions (has upgraded limit)
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 5, true)).toBe(true);

      // Non-owner cannot add questions (not owner, regardless of quota)
      expect(quotaManager.canAddQuestion(nonOwnerId, sessionId, 0, false)).toBe(false);
    });

    it('should handle boundary condition at exactly the default limit', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const isOwner = true;

      // At 2 questions, can add the 3rd (default limit is 3)
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 2, isOwner)).toBe(true);
      
      // At 3 questions, cannot add the 4th
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 3, isOwner)).toBe(false);
    });

    it('should handle boundary condition with upgraded limit', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const resourceId = `session:${sessionId}`;
      const isOwner = true;

      unlockManager.createUnlock(ownerId, resourceId, 'QUESTION_LIMIT_10');

      // At 9 questions, can add the 10th (upgraded limit is 10)
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 9, isOwner)).toBe(true);
      
      // At 10 questions, cannot add the 11th
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 10, isOwner)).toBe(false);
    });

    it('should handle owner attempting to add 11th question even with upgrade', () => {
      const ownerId = 'owner-123';
      const sessionId = 'session:abc123';
      const resourceId = `session:${sessionId}`;
      const isOwner = true;

      unlockManager.createUnlock(ownerId, resourceId, 'QUESTION_LIMIT_10');

      // Even with upgrade, 11th question should fail
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 10, isOwner)).toBe(false);
      expect(quotaManager.canAddQuestion(ownerId, sessionId, 11, isOwner)).toBe(false);
    });
  });
});
