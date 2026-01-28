import { describe, test, expect, beforeEach } from 'vitest';
import { QuizSession } from '../../src/server/models/QuizSession.js';
import { BillingService } from '../../src/server/services/BillingService.js';
import { VybeLedger } from '../../src/server/models/VybeLedger.js';
import { ParticipantUnlock } from '../../src/server/models/ParticipantUnlock.js';
import { QuotaManager } from '../../src/server/services/QuotaManager.js';
import type { Participant, Question, UnlockableFeature } from '../../src/shared/types.js';

// Test Configuration
const TEST_CONFIG = {
  PRICING: {
    MATCH_PREVIEW: 0,
    MATCH_TOP3: 2,
    MATCH_ALL: 5,
    QUESTION_LIMIT_10: 3,
  },
  INITIAL_PROMO_VYBES: 10, // TODO: Move to Promotion Service
  QUESTION_LIMITS: {
    FREE: 3,
    UPGRADED: 10,
  },
} as const;

const FEATURE = {
  MATCH_PREVIEW: 'MATCH_PREVIEW' as UnlockableFeature,
  MATCH_TOP3: 'MATCH_TOP3' as UnlockableFeature,
  MATCH_ALL: 'MATCH_ALL' as UnlockableFeature,
  QUESTION_LIMIT_10: 'QUESTION_LIMIT_10' as UnlockableFeature,
};

describe('PurchaseFlow - Integration Tests', () => {
  let session: QuizSession;
  let billingService: BillingService;
  let vybeLedger: VybeLedger;
  let participantUnlock: ParticipantUnlock;
  let quotaManager: QuotaManager;

  beforeEach(() => {
    session = new QuizSession('owner-123');
    vybeLedger = new VybeLedger();
    participantUnlock = new ParticipantUnlock();
    quotaManager = new QuotaManager();
    billingService = new BillingService({
      vybeLedger,
      participantUnlock,
      quotaManager,
    });
  });

  describe('End-to-End Purchase Flows', () => {
    test('should complete full purchase flow: add Vybes → purchase MATCH_TOP3 → verify access', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Step 1: Grant initial promotional Vybes
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Step 2: Purchase MATCH_TOP3 access
      const purchaseResult = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(purchaseResult.granted).toBe(true);
      expect(purchaseResult.charged).toBe(true);
      expect(purchaseResult.balance).toBe(TEST_CONFIG.INITIAL_PROMO_VYBES - TEST_CONFIG.PRICING.MATCH_TOP3);

      // Step 3: Verify access is granted
      const hasAccess = participantUnlock.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      });

      expect(hasAccess).toBe(true);
    });

    test('should fail purchase flow when insufficient Vybes', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant only 1 Vybe (MATCH_TOP3 costs 2)
      vybeLedger.addVybes({
        participantId,
        amount: 1,
        reason: 'INITIAL_VYBES',
      });

      // Attempt to purchase MATCH_TOP3
      const purchaseResult = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(purchaseResult.granted).toBe(false);
      expect(purchaseResult.charged).toBe(false);
      expect(purchaseResult.error).toBe('INSUFFICIENT_VYBES');
      expect(purchaseResult.balance).toBe(1); // Balance unchanged

      // Verify no access granted
      const hasAccess = participantUnlock.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      });

      expect(hasAccess).toBe(false);
    });

    test('should not double-charge when accessing already-unlocked feature', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant initial Vybes
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // First purchase
      const purchase1 = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(purchase1.granted).toBe(true);
      expect(purchase1.charged).toBe(true);
      expect(purchase1.balance).toBe(8);

      // Second access attempt (should verify, not charge)
      const purchase2 = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(purchase2.granted).toBe(true);
      expect(purchase2.charged).toBe(false);
      expect(purchase2.balance).toBe(8); // Balance unchanged
    });

    test('should handle tier hierarchy: MATCH_ALL unlocks MATCH_TOP3 and MATCH_PREVIEW', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant enough Vybes for MATCH_ALL
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Purchase MATCH_ALL
      const purchaseAll = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
        cost: TEST_CONFIG.PRICING.MATCH_ALL,
      });

      expect(purchaseAll.granted).toBe(true);
      expect(purchaseAll.charged).toBe(true);

      // Verify MATCH_TOP3 is also accessible (tier hierarchy)
      const hasTop3 = participantUnlock.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      });
      expect(hasTop3).toBe(true);

      // Verify MATCH_PREVIEW is also accessible (tier hierarchy)
      const hasPreview = participantUnlock.hasFeatureAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
      });
      expect(hasPreview).toBe(true);

      // Verify balance only deducted once
      expect(purchaseAll.balance).toBe(TEST_CONFIG.INITIAL_PROMO_VYBES - TEST_CONFIG.PRICING.MATCH_ALL);
    });
  });

  describe('Question Limit Purchase Flow', () => {
    test('should allow owner to purchase question limit upgrade', () => {
      const ownerId = 'owner-123';
      const resourceId = `session:${session.sessionId}`;

      // Add owner participant
      const owner: Participant = {
        id: ownerId,
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(owner);

      // Grant Vybes
      vybeLedger.addVybes({
        participantId: ownerId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Owner adds 3 free questions
      for (let i = 1; i <= TEST_CONFIG.QUESTION_LIMITS.FREE; i++) {
        const question: Question = {
          id: `q${i}`,
          prompt: `Question ${i}?`,
          options: ['Yes', 'No'],
          addedAt: new Date(),
        };
        session.addQuestion(question);
      }

      // Verify limit reached
      const canAddBeforeUpgrade = quotaManager.canAddQuestion({
        participantId: ownerId,
        sessionId: session.sessionId,
        currentCount: TEST_CONFIG.QUESTION_LIMITS.FREE,
        isOwner: true,
      });
      expect(canAddBeforeUpgrade).toBe(false);

      // Purchase question limit upgrade
      const purchaseResult = billingService.purchaseOrVerifyAccess({
        participantId: ownerId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
        cost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
      });

      expect(purchaseResult.granted).toBe(true);
      expect(purchaseResult.charged).toBe(true);

      // Verify new limit applied
      const canAddAfterUpgrade = quotaManager.canAddQuestion({
        participantId: ownerId,
        sessionId: session.sessionId,
        currentCount: TEST_CONFIG.QUESTION_LIMITS.FREE,
        isOwner: true,
      });
      expect(canAddAfterUpgrade).toBe(true);

      // Owner can now add up to 10 questions total
      const canAdd7More = quotaManager.canAddQuestion({
        participantId: ownerId,
        sessionId: session.sessionId,
        currentCount: 9,
        isOwner: true,
      });
      expect(canAdd7More).toBe(true);

      const cannotAdd11th = quotaManager.canAddQuestion({
        participantId: ownerId,
        sessionId: session.sessionId,
        currentCount: 10,
        isOwner: true,
      });
      expect(cannotAdd11th).toBe(false);
    });

    test('should reject question limit purchase for non-owner participant', () => {
      const nonOwnerId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Add non-owner participant
      const participant: Participant = {
        id: nonOwnerId,
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(participant);

      // Grant Vybes
      vybeLedger.addVybes({
        participantId: nonOwnerId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Non-owner attempts to purchase question limit upgrade
      const purchaseResult = billingService.purchaseOrVerifyAccess({
        participantId: nonOwnerId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
        cost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
      });

      expect(purchaseResult.granted).toBe(false);
      expect(purchaseResult.charged).toBe(false);
      expect(purchaseResult.error).toBe('NOT_OWNER');

      // Verify non-owner cannot add questions (even at count 0)
      const canAdd = quotaManager.canAddQuestion({
        participantId: nonOwnerId,
        sessionId: session.sessionId,
        currentCount: 0,
        isOwner: false,
      });
      expect(canAdd).toBe(false);
    });
  });

  describe('Multi-Session Purchase Isolation', () => {
    test('should maintain separate unlocks for different sessions', () => {
      const participantId = 'p1';
      const session1 = new QuizSession('owner-1');
      const session2 = new QuizSession('owner-2');
      const resource1 = `session:${session1.sessionId}`;
      const resource2 = `session:${session2.sessionId}`;

      // Grant Vybes
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Purchase MATCH_TOP3 for session1 only
      billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId: resource1,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Verify access granted for session1
      const hasAccessSession1 = participantUnlock.hasFeatureAccess({
        participantId,
        resourceId: resource1,
        feature: FEATURE.MATCH_TOP3,
      });
      expect(hasAccessSession1).toBe(true);

      // Verify NO access for session2 (different resource)
      const hasAccessSession2 = participantUnlock.hasFeatureAccess({
        participantId,
        resourceId: resource2,
        feature: FEATURE.MATCH_TOP3,
      });
      expect(hasAccessSession2).toBe(false);
    });

    test('should require separate purchases for each session', () => {
      const participantId = 'p1';
      const session1 = new QuizSession('owner-1');
      const session2 = new QuizSession('owner-2');
      const resource1 = `session:${session1.sessionId}`;
      const resource2 = `session:${session2.sessionId}`;

      // Grant enough for 2 purchases
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.PRICING.MATCH_TOP3 * 2,
        reason: 'INITIAL_VYBES',
      });

      // Purchase for session1
      const purchase1 = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId: resource1,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });
      expect(purchase1.granted).toBe(true);
      expect(purchase1.charged).toBe(true);
      expect(purchase1.balance).toBe(TEST_CONFIG.PRICING.MATCH_TOP3);

      // Purchase for session2 (should charge again)
      const purchase2 = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId: resource2,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });
      expect(purchase2.granted).toBe(true);
      expect(purchase2.charged).toBe(true);
      expect(purchase2.balance).toBe(0);

      // Both sessions should have access
      expect(
        participantUnlock.hasFeatureAccess({
          participantId,
          resourceId: resource1,
          feature: FEATURE.MATCH_TOP3,
        })
      ).toBe(true);
      expect(
        participantUnlock.hasFeatureAccess({
          participantId,
          resourceId: resource2,
          feature: FEATURE.MATCH_TOP3,
        })
      ).toBe(true);
    });
  });
});
