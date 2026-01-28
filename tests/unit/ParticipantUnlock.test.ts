import { describe, it, expect, beforeEach } from 'vitest';
import { ParticipantUnlockManager } from '../../src/server/models/ParticipantUnlock';
import type { UnlockableFeature } from '../../src/shared/types';

describe('ParticipantUnlock', () => {
  let unlockManager: ParticipantUnlockManager;

  beforeEach(() => {
    unlockManager = new ParticipantUnlockManager();
  });

  describe('Unlock Creation', () => {
    it('should create unlock record', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';
      const feature: UnlockableFeature = 'MATCH_TOP3';

      const unlock = unlockManager.createUnlock(participantId, resourceId, feature);

      expect(unlock.participantId).toBe(participantId);
      expect(unlock.resourceId).toBe(resourceId);
      expect(unlock.feature).toBe(feature);
      expect(unlock.id).toBeDefined();
      expect(unlock.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique unlock IDs', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      const unlock1 = unlockManager.createUnlock(participantId, resourceId, 'MATCH_TOP3');
      const unlock2 = unlockManager.createUnlock(participantId, resourceId, 'MATCH_ALL');

      expect(unlock1.id).not.toBe(unlock2.id);
    });

    it('should record unlock timestamp', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';
      const before = Date.now();

      const unlock = unlockManager.createUnlock(participantId, resourceId, 'MATCH_TOP3');
      const after = Date.now();

      expect(unlock.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(unlock.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('Unlock Verification', () => {
    it('should check if participant has specific unlock', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, 'MATCH_TOP3');

      const hasUnlock = unlockManager.hasUnlock(participantId, resourceId, 'MATCH_TOP3');
      expect(hasUnlock).toBe(true);
    });

    it('should return false if participant does not have unlock', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      const hasUnlock = unlockManager.hasUnlock(participantId, resourceId, 'MATCH_TOP3');
      expect(hasUnlock).toBe(false);
    });

    it('should check if participant has higher match tier (MATCH_ALL unlocks MATCH_TOP3)', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, 'MATCH_ALL');

      // Should have access to lower tiers
      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_ALL')).toBe(true);
      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_TOP3')).toBe(true);
      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_PREVIEW')).toBe(true);
    });

    it('should check if participant has higher match tier (MATCH_ALL unlocks MATCH_PREVIEW)', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, 'MATCH_ALL');

      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_PREVIEW')).toBe(true);
    });

    it('should not grant higher tier from lower tier unlock', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, 'MATCH_TOP3');

      // Should NOT have access to higher tier
      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_TOP3')).toBe(true);
      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_ALL')).toBe(false);
    });

    it('should check if participant has any unlock for resource', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, 'MATCH_TOP3');

      const hasAnyUnlock = unlockManager.hasAnyUnlock(participantId, resourceId);
      expect(hasAnyUnlock).toBe(true);
    });

    it('should return false if participant has no unlocks for resource', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      const hasAnyUnlock = unlockManager.hasAnyUnlock(participantId, resourceId);
      expect(hasAnyUnlock).toBe(false);
    });
  });

  describe('Unlock Retrieval', () => {
    it('should get all unlocks for participant', () => {
      const participantId = 'participant-123';
      const resourceId1 = 'session:abc123';
      const resourceId2 = 'session:def456';

      unlockManager.createUnlock(participantId, resourceId1, 'MATCH_TOP3');
      unlockManager.createUnlock(participantId, resourceId2, 'MATCH_ALL');

      const unlocks = unlockManager.getUnlocksForParticipant(participantId);

      expect(unlocks).toHaveLength(2);
      expect(unlocks[0].resourceId).toBe(resourceId1);
      expect(unlocks[1].resourceId).toBe(resourceId2);
    });

    it('should get unlocks by resource ID', () => {
      const participantId1 = 'participant-1';
      const participantId2 = 'participant-2';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId1, resourceId, 'MATCH_TOP3');
      unlockManager.createUnlock(participantId2, resourceId, 'MATCH_ALL');

      const unlocks = unlockManager.getUnlocksByResource(resourceId);

      expect(unlocks).toHaveLength(2);
      expect(unlocks.map(u => u.participantId)).toContain(participantId1);
      expect(unlocks.map(u => u.participantId)).toContain(participantId2);
    });

    it('should return empty array for participant with no unlocks', () => {
      const unlocks = unlockManager.getUnlocksForParticipant('participant-new');
      expect(unlocks).toEqual([]);
    });
  });

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate unlock (same participant + resource + feature)', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';
      const feature: UnlockableFeature = 'MATCH_TOP3';

      const unlock1 = unlockManager.createUnlock(participantId, resourceId, feature);
      const unlock2 = unlockManager.createUnlock(participantId, resourceId, feature);

      // Should return the existing unlock instead of creating a new one
      expect(unlock1.id).toBe(unlock2.id);

      // Verify only one unlock exists
      const unlocks = unlockManager.getUnlocksForParticipant(participantId);
      expect(unlocks).toHaveLength(1);
    });

    it('should allow different features for same participant and resource', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, 'MATCH_TOP3');
      unlockManager.createUnlock(participantId, resourceId, 'QUESTION_LIMIT_10');

      const unlocks = unlockManager.getUnlocksForParticipant(participantId);
      expect(unlocks).toHaveLength(2);
    });
  });

  describe('Feature-Specific Unlocks', () => {
    it('should handle question limit unlock (QUESTION_LIMIT_10 feature)', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      const unlock = unlockManager.createUnlock(participantId, resourceId, 'QUESTION_LIMIT_10');

      expect(unlock.feature).toBe('QUESTION_LIMIT_10');
      expect(unlockManager.hasUnlock(participantId, resourceId, 'QUESTION_LIMIT_10')).toBe(true);
    });

    it('should handle MATCH_PREVIEW unlock', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      // Note: MATCH_PREVIEW is typically free, but we should still support unlocking it
      const unlock = unlockManager.createUnlock(participantId, resourceId, 'MATCH_PREVIEW');

      expect(unlock.feature).toBe('MATCH_PREVIEW');
      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_PREVIEW')).toBe(true);
    });

    it('should not mix question limit with match tier hierarchy', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      // QUESTION_LIMIT_10 unlock should NOT grant match tier access
      unlockManager.createUnlock(participantId, resourceId, 'QUESTION_LIMIT_10');

      expect(unlockManager.hasUnlock(participantId, resourceId, 'QUESTION_LIMIT_10')).toBe(true);
      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_TOP3')).toBe(false);
      expect(unlockManager.hasUnlock(participantId, resourceId, 'MATCH_ALL')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple participants with same resource', () => {
      const resourceId = 'session:abc123';

      unlockManager.createUnlock('participant-1', resourceId, 'MATCH_TOP3');
      unlockManager.createUnlock('participant-2', resourceId, 'MATCH_ALL');
      unlockManager.createUnlock('participant-3', resourceId, 'QUESTION_LIMIT_10');

      expect(unlockManager.hasUnlock('participant-1', resourceId, 'MATCH_TOP3')).toBe(true);
      expect(unlockManager.hasUnlock('participant-2', resourceId, 'MATCH_ALL')).toBe(true);
      expect(unlockManager.hasUnlock('participant-3', resourceId, 'QUESTION_LIMIT_10')).toBe(true);

      // Participants should not share unlocks
      expect(unlockManager.hasUnlock('participant-1', resourceId, 'MATCH_ALL')).toBe(false);
      expect(unlockManager.hasUnlock('participant-2', resourceId, 'MATCH_TOP3')).toBe(true); // ALL unlocks TOP3
    });

    it('should handle multiple resources for same participant', () => {
      const participantId = 'participant-123';

      unlockManager.createUnlock(participantId, 'session:abc123', 'MATCH_TOP3');
      unlockManager.createUnlock(participantId, 'session:def456', 'MATCH_ALL');

      expect(unlockManager.hasUnlock(participantId, 'session:abc123', 'MATCH_TOP3')).toBe(true);
      expect(unlockManager.hasUnlock(participantId, 'session:def456', 'MATCH_ALL')).toBe(true);

      // Unlocks should be resource-specific
      expect(unlockManager.hasUnlock(participantId, 'session:abc123', 'MATCH_ALL')).toBe(false);
      expect(unlockManager.hasUnlock(participantId, 'session:def456', 'MATCH_TOP3')).toBe(true); // ALL unlocks TOP3
    });

    it('should reject invalid feature name', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      expect(() => {
        unlockManager.createUnlock(participantId, resourceId, 'INVALID_FEATURE' as UnlockableFeature);
      }).toThrow();
    });
  });
});
