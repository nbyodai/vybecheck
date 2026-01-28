import { describe, it, expect, beforeEach } from 'vitest';
import { BillingService } from '../../src/server/services/BillingService';
import { VybeLedger } from '../../src/server/models/VybeLedger';
import { ParticipantUnlockManager } from '../../src/server/models/ParticipantUnlock';
import type { UnlockableFeature, TransactionReason } from '../../src/shared/types';

// Test Configuration - TODO: Move to environment variables or config service
const TEST_CONFIG = {
  PRICING: {
    MATCH_PREVIEW: 0,
    MATCH_TOP3: 2,
    MATCH_ALL: 5,
    QUESTION_LIMIT_10: 3,
  },
  // TODO: Move to Promotion Service layer when implemented
  INITIAL_PROMO_VYBES: 10,
} as const;

// Feature enums to avoid magic strings
const FEATURE = {
  MATCH_PREVIEW: 'MATCH_PREVIEW' as UnlockableFeature,
  MATCH_TOP3: 'MATCH_TOP3' as UnlockableFeature,
  MATCH_ALL: 'MATCH_ALL' as UnlockableFeature,
  QUESTION_LIMIT_10: 'QUESTION_LIMIT_10' as UnlockableFeature,
} as const;

const TRANSACTION_REASON = {
  INITIAL_VYBES: 'INITIAL_VYBES' as TransactionReason,
  PURCHASE_VYBES: 'PURCHASE_VYBES' as TransactionReason,
  UNLOCK_MATCH_TOP3: 'UNLOCK_MATCH_TOP3' as TransactionReason,
  UNLOCK_MATCH_ALL: 'UNLOCK_MATCH_ALL' as TransactionReason,
  UNLOCK_QUESTION_LIMIT: 'UNLOCK_QUESTION_LIMIT' as TransactionReason,
} as const;

describe('BillingService', () => {
  let billingService: BillingService;
  let ledger: VybeLedger;
  let unlockManager: ParticipantUnlockManager;

  beforeEach(() => {
    ledger = new VybeLedger();
    unlockManager = new ParticipantUnlockManager();
    billingService = new BillingService(ledger, unlockManager);
  });

  describe('Balance Management', () => {
    it('should get balance for new participant (should be 0)', () => {
      const participantId = 'participant-123';

      const balance = billingService.getBalance(participantId);

      expect(balance).toBe(0);
    });

    it('should get balance after Vybes added', () => {
      const participantId = 'participant-123';

      billingService.addVybes({
        participantId,
        amount: 50,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      const balance = billingService.getBalance(participantId);
      expect(balance).toBe(50);
    });

    it('should get balance after Vybes spent', () => {
      const participantId = 'participant-123';

      billingService.addVybes({
        participantId,
        amount: 50,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });
      ledger.addTransaction(participantId, -10, TRANSACTION_REASON.UNLOCK_MATCH_TOP3);

      const balance = billingService.getBalance(participantId);
      expect(balance).toBe(40);
    });

    it('should add Vybes (positive amount)', () => {
      const participantId = 'participant-123';

      billingService.addVybes({
        participantId,
        amount: 100,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      expect(billingService.getBalance(participantId)).toBe(100);
    });

    it('should track multiple transactions', () => {
      const participantId = 'participant-123';

      billingService.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });
      billingService.addVybes({
        participantId,
        amount: 50,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      expect(billingService.getBalance(participantId)).toBe(60);
    });
  });

  describe('Feature Access Checking', () => {
    it('should return true for owned feature (hasFeatureAccess)', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, FEATURE.MATCH_TOP3);

      const hasAccess = billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      });
      expect(hasAccess).toBe(true);
    });

    it('should return true for lower match tier when MATCH_ALL owned (hasFeatureAccess)', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, FEATURE.MATCH_ALL);

      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
      })).toBe(true);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(true);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
      })).toBe(true);
    });

    it('should return false for unowned feature (hasFeatureAccess)', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      const hasAccess = billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      });
      expect(hasAccess).toBe(false);
    });

    it('should not grant higher tier from lower tier ownership', () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      unlockManager.createUnlock(participantId, resourceId, FEATURE.MATCH_TOP3);

      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(true);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
      })).toBe(false);
    });
  });

  describe('Purchase or Verify Access', () => {
    it('should purchase when feature not owned and sufficient balance (purchaseOrVerifyAccess)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });

      const result = await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(result).toBe(true);
      expect(billingService.getBalance(participantId)).toBe(8); // 10 - 2
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(true);
    });

    it('should not re-charge when feature already owned (purchaseOrVerifyAccess)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });
      unlockManager.createUnlock(participantId, resourceId, FEATURE.MATCH_TOP3);

      const result = await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(result).toBe(true);
      expect(billingService.getBalance(participantId)).toBe(10); // No charge
    });

    it('should throw error when insufficient balance (purchaseOrVerifyAccess)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 2,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });

      await expect(
        billingService.purchaseOrVerifyAccess({
          participantId,
          resourceId,
          feature: FEATURE.MATCH_ALL,
          cost: TEST_CONFIG.PRICING.MATCH_ALL,
        })
      ).rejects.toThrow('Insufficient Vybes');
    });

    it('should create unlock record when purchasing (purchaseOrVerifyAccess)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(unlockManager.hasUnlock(participantId, resourceId, FEATURE.MATCH_TOP3)).toBe(true);
    });

    it('should deduct correct amount when purchasing (purchaseOrVerifyAccess)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 20,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
        cost: TEST_CONFIG.PRICING.MATCH_ALL,
      });

      expect(billingService.getBalance(participantId)).toBe(15);
    });

    it('should be idempotent - multiple calls should not double-charge (purchaseOrVerifyAccess)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Should only charge once
      expect(billingService.getBalance(participantId)).toBe(8);
    });
  });

  describe('Match Tier Hierarchy', () => {
    it('should enforce hierarchy: MATCH_ALL > MATCH_TOP3 > MATCH_PREVIEW', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 100,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      // Purchase MATCH_ALL
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
        cost: TEST_CONFIG.PRICING.MATCH_ALL,
      });

      // Should have access to all tiers
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
      })).toBe(true);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(true);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
      })).toBe(true);
    });

    it('should not grant higher tier from lower tier purchase', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 100,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      // Purchase MATCH_TOP3
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(true);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
      })).toBe(false);
    });
  });

  describe('Feature Costs', () => {
    it('should correctly price MATCH_PREVIEW (0 Vybes)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 0,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });

      // MATCH_PREVIEW should be free
      const result = await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
        cost: TEST_CONFIG.PRICING.MATCH_PREVIEW,
      });

      expect(result).toBe(true);
      expect(billingService.getBalance(participantId)).toBe(0);
    });

    it('should correctly price MATCH_TOP3 (2 Vybes)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(billingService.getBalance(participantId)).toBe(8);
    });

    it('should correctly price MATCH_ALL (5 Vybes)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
        cost: TEST_CONFIG.PRICING.MATCH_ALL,
      });

      expect(billingService.getBalance(participantId)).toBe(5);
    });

    it('should correctly price QUESTION_LIMIT_10 (3 Vybes)', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
        cost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
      });

      expect(billingService.getBalance(participantId)).toBe(7);
    });
  });

  describe('Transaction History', () => {
    it('should get transaction history', () => {
      const participantId = 'participant-123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });
      billingService.addVybes({
        participantId,
        amount: 50,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      const history = billingService.getTransactionHistory(participantId);

      expect(history).toHaveLength(2);
      expect(history[0].amount).toBe(50); // Newest first
      expect(history[1].amount).toBe(10);
    });

    it('should include purchase transactions in history', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      const history = billingService.getTransactionHistory(participantId);

      expect(history).toHaveLength(2);
      expect(history[0].amount).toBe(-TEST_CONFIG.PRICING.MATCH_TOP3);
      expect(history[0].reason).toBe(TRANSACTION_REASON.UNLOCK_MATCH_TOP3);
    });

    it('should return empty array for new participant', () => {
      const history = billingService.getTransactionHistory('participant-new');

      expect(history).toEqual([]);
    });
  });

  describe('Multiple Feature Purchases', () => {
    it('should handle QUESTION_LIMIT_10 unlock persisting for session', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 10,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
        cost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
      });

      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
      })).toBe(true);
      expect(billingService.getBalance(participantId)).toBe(7);
    });

    it('should grant initial promotional Vybes for new participant', () => {
      const participantId = 'participant-new';

      // TODO: Move to Promotion Service layer when implemented
      // This simulates promotional credit grants on signup/first session
      billingService.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });

      expect(billingService.getBalance(participantId)).toBe(TEST_CONFIG.INITIAL_PROMO_VYBES);
    });

    it('should handle multiple feature purchases in same session', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 20,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
        cost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
      });

      const expectedBalance = 20 - TEST_CONFIG.PRICING.MATCH_TOP3 - TEST_CONFIG.PRICING.QUESTION_LIMIT_10;
      expect(billingService.getBalance(participantId)).toBe(expectedBalance);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(true);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
      })).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exact balance for purchase', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: TEST_CONFIG.PRICING.MATCH_TOP3,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(billingService.getBalance(participantId)).toBe(0);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(true);
    });

    it('should handle purchase with balance 1 Vybe short', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: TEST_CONFIG.PRICING.MATCH_TOP3 - 1,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await expect(
        billingService.purchaseOrVerifyAccess({
          participantId,
          resourceId,
          feature: FEATURE.MATCH_TOP3,
          cost: TEST_CONFIG.PRICING.MATCH_TOP3,
        })
      ).rejects.toThrow('Insufficient Vybes');
    });

    it('should handle zero-cost features', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 0,
        reason: TRANSACTION_REASON.INITIAL_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
        cost: TEST_CONFIG.PRICING.MATCH_PREVIEW,
      });

      expect(billingService.getBalance(participantId)).toBe(0);
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
      })).toBe(true);
    });

    it('should handle purchasing all features in sequence', async () => {
      const participantId = 'participant-123';
      const resourceId = 'session:abc123';

      billingService.addVybes({
        participantId,
        amount: 100,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
        cost: TEST_CONFIG.PRICING.MATCH_PREVIEW,
      });
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
        cost: TEST_CONFIG.PRICING.MATCH_ALL,
      });
      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
        cost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
      });

      const totalCost = TEST_CONFIG.PRICING.MATCH_PREVIEW +
                        TEST_CONFIG.PRICING.MATCH_TOP3 +
                        TEST_CONFIG.PRICING.MATCH_ALL +
                        TEST_CONFIG.PRICING.QUESTION_LIMIT_10;

      expect(billingService.getBalance(participantId)).toBe(100 - totalCost);
    });

    it('should handle resource-specific unlocks', async () => {
      const participantId = 'participant-123';
      const resourceId1 = 'session:abc123';
      const resourceId2 = 'session:def456';

      billingService.addVybes({
        participantId,
        amount: 20,
        reason: TRANSACTION_REASON.PURCHASE_VYBES,
      });

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId: resourceId1,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Different resource, should not have access yet
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId: resourceId2,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(false);

      await billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId: resourceId2,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Now should have access
      expect(billingService.hasFeatureAccess({
        participantId,
        resourceId: resourceId2,
        feature: FEATURE.MATCH_TOP3,
      })).toBe(true);
      expect(billingService.getBalance(participantId)).toBe(20 - TEST_CONFIG.PRICING.MATCH_TOP3 * 2);
    });
  });
});
