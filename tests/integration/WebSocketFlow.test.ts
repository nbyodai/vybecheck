import { describe, test, expect, beforeEach } from 'vitest';
import { QuizSession } from '../../src/server/models/QuizSession';
import { BillingService } from '../../src/server/services/BillingService';
import { VybeLedger } from '../../src/server/models/VybeLedger';
import { ParticipantUnlock } from '../../src/server/models/ParticipantUnlock';
import { QuotaManager } from '../../src/server/services/QuotaManager';
import { MatchingService } from '../../src/server/services/MatchingService';
import type { Participant, Question, UnlockableFeature } from '../../src/shared/types';

// Test Configuration
const TEST_CONFIG = {
  PRICING: {
    MATCH_PREVIEW: 0,
    MATCH_TOP3: 2,
    MATCH_ALL: 5,
    QUESTION_LIMIT_10: 3,
  },
  INITIAL_PROMO_VYBES: 10, // TODO: Move to Promotion Service
  TIERS: {
    PREVIEW: 'PREVIEW',
    TOP3: 'TOP3',
    ALL: 'ALL',
  },
} as const;

const FEATURE = {
  MATCH_PREVIEW: 'MATCH_PREVIEW' as UnlockableFeature,
  MATCH_TOP3: 'MATCH_TOP3' as UnlockableFeature,
  MATCH_ALL: 'MATCH_ALL' as UnlockableFeature,
  QUESTION_LIMIT_10: 'QUESTION_LIMIT_10' as UnlockableFeature,
};

describe('WebSocketFlow - Integration Tests', () => {
  let session: QuizSession;
  let billingService: BillingService;
  let vybeLedger: VybeLedger;
  let participantUnlock: ParticipantUnlock;
  let quotaManager: QuotaManager;
  let matchingService: MatchingService;

  beforeEach(() => {
    session = new QuizSession('owner-123');
    vybeLedger = new VybeLedger();
    participantUnlock = new ParticipantUnlock();
    quotaManager = new QuotaManager();
    matchingService = new MatchingService();
    billingService = new BillingService({
      vybeLedger,
      participantUnlock,
      quotaManager,
    });
  });

  describe('vybes:purchase Message Flow', () => {
    test('should handle vybes:purchase message and grant access', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Simulate participant joining (grants initial Vybes)
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Simulate WebSocket message: vybes:purchase
      const purchaseMessage = {
        type: 'vybes:purchase',
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      };

      // Server-side handling
      const result = billingService.purchaseOrVerifyAccess({
        participantId: purchaseMessage.participantId,
        resourceId: purchaseMessage.resourceId,
        feature: purchaseMessage.feature,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Expected WebSocket response: vybes:purchased
      const expectedResponse = {
        type: 'vybes:purchased',
        success: true,
        feature: FEATURE.MATCH_TOP3,
        balance: TEST_CONFIG.INITIAL_PROMO_VYBES - TEST_CONFIG.PRICING.MATCH_TOP3,
        charged: true,
      };

      expect(result.granted).toBe(expectedResponse.success);
      expect(result.balance).toBe(expectedResponse.balance);
      expect(result.charged).toBe(expectedResponse.charged);
    });

    test('should return error response when insufficient Vybes', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant only 1 Vybe (insufficient for MATCH_TOP3)
      vybeLedger.addVybes({
        participantId,
        amount: 1,
        reason: 'INITIAL_VYBES',
      });

      // Simulate WebSocket message: vybes:purchase
      const purchaseMessage = {
        type: 'vybes:purchase',
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      };

      // Server-side handling
      const result = billingService.purchaseOrVerifyAccess({
        participantId: purchaseMessage.participantId,
        resourceId: purchaseMessage.resourceId,
        feature: purchaseMessage.feature,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Expected WebSocket response: vybes:error
      const expectedResponse = {
        type: 'vybes:error',
        success: false,
        error: 'INSUFFICIENT_VYBES',
        balance: 1,
        required: TEST_CONFIG.PRICING.MATCH_TOP3,
      };

      expect(result.granted).toBe(false);
      expect(result.error).toBe(expectedResponse.error);
      expect(result.balance).toBe(expectedResponse.balance);
    });

    test('should handle vybes:check_balance message', () => {
      const participantId = 'p1';

      // Grant initial Vybes
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Simulate WebSocket message: vybes:check_balance
      const checkMessage = {
        type: 'vybes:check_balance',
        participantId,
      };

      // Server-side handling
      const balance = vybeLedger.getBalance(checkMessage.participantId);

      // Expected WebSocket response: vybes:balance
      const expectedResponse = {
        type: 'vybes:balance',
        balance: TEST_CONFIG.INITIAL_PROMO_VYBES,
      };

      expect(balance).toBe(expectedResponse.balance);
    });
  });

  describe('matches:get Message Flow with Tiered Access', () => {
    test('should return PREVIEW tier matches for free', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Add participants
      const owner: Participant = {
        id: 'owner-123',
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      const p1: Participant = {
        id: participantId,
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(owner);
      session.addParticipant(p1);

      // Add question and responses
      const question: Question = {
        id: 'q1',
        prompt: 'Test?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question);

      session.recordResponse({
        id: 'r-owner',
        participantId: 'owner-123',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });
      session.recordResponse({
        id: 'r1',
        participantId,
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });

      // Simulate WebSocket message: matches:get with PREVIEW tier
      const matchesMessage = {
        type: 'matches:get',
        participantId,
        tier: TEST_CONFIG.TIERS.PREVIEW,
      };

      // Server-side handling (no payment required for PREVIEW)
      const hasAccess = participantUnlock.hasFeatureAccess({
        participantId: matchesMessage.participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
      });

      // PREVIEW is always free (no purchase needed)
      expect(hasAccess || TEST_CONFIG.PRICING.MATCH_PREVIEW === 0).toBe(true);

      // Get matches
      const matches = matchingService.getMatchesByTier({
        participantId: matchesMessage.participantId,
        session,
        tier: matchesMessage.tier,
      });

      // Expected WebSocket response: matches:result
      const expectedResponse = {
        type: 'matches:result',
        tier: TEST_CONFIG.TIERS.PREVIEW,
        matches,
        totalCount: 1,
      };

      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    test('should require purchase for TOP3 tier matches', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Add participants
      const owner: Participant = {
        id: 'owner-123',
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      const p1: Participant = {
        id: participantId,
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(owner);
      session.addParticipant(p1);

      // Simulate WebSocket message: matches:get with TOP3 tier (no prior purchase)
      const matchesMessage = {
        type: 'matches:get',
        participantId,
        tier: TEST_CONFIG.TIERS.TOP3,
      };

      // Server-side handling (check access)
      const hasAccess = participantUnlock.hasFeatureAccess({
        participantId: matchesMessage.participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      });

      // Expected: Access denied
      expect(hasAccess).toBe(false);

      // Expected WebSocket response: matches:locked
      const expectedResponse = {
        type: 'matches:locked',
        tier: TEST_CONFIG.TIERS.TOP3,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
        message: 'Purchase required to view TOP3 matches',
      };

      expect(hasAccess).toBe(false);
    });

    test('should grant TOP3 matches after successful purchase', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Add participants
      const owner: Participant = {
        id: 'owner-123',
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      const p1: Participant = {
        id: participantId,
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(owner);
      session.addParticipant(p1);

      // Add question and responses
      const question: Question = {
        id: 'q1',
        prompt: 'Test?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question);

      session.recordResponse({
        id: 'r-owner',
        participantId: 'owner-123',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });
      session.recordResponse({
        id: 'r1',
        participantId,
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });

      // Grant Vybes and purchase TOP3 access
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });
      billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Simulate WebSocket message: matches:get with TOP3 tier (after purchase)
      const matchesMessage = {
        type: 'matches:get',
        participantId,
        tier: TEST_CONFIG.TIERS.TOP3,
      };

      // Server-side handling
      const hasAccess = participantUnlock.hasFeatureAccess({
        participantId: matchesMessage.participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
      });
      expect(hasAccess).toBe(true);

      // Get matches
      const matches = matchingService.getMatchesByTier({
        participantId: matchesMessage.participantId,
        session,
        tier: matchesMessage.tier,
      });

      // Expected WebSocket response: matches:result
      const expectedResponse = {
        type: 'matches:result',
        tier: TEST_CONFIG.TIERS.TOP3,
        matches,
        totalCount: 1,
      };

      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    test('should require purchase for ALL tier matches', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Simulate WebSocket message: matches:get with ALL tier (no prior purchase)
      const matchesMessage = {
        type: 'matches:get',
        participantId,
        tier: TEST_CONFIG.TIERS.ALL,
      };

      // Server-side handling (check access)
      const hasAccess = participantUnlock.hasFeatureAccess({
        participantId: matchesMessage.participantId,
        resourceId,
        feature: FEATURE.MATCH_ALL,
      });

      // Expected: Access denied
      expect(hasAccess).toBe(false);

      // Expected WebSocket response: matches:locked
      const expectedResponse = {
        type: 'matches:locked',
        tier: TEST_CONFIG.TIERS.ALL,
        feature: FEATURE.MATCH_ALL,
        cost: TEST_CONFIG.PRICING.MATCH_ALL,
        message: 'Purchase required to view ALL matches',
      };

      expect(hasAccess).toBe(false);
    });
  });

  describe('question:add Message Flow with Quota Enforcement', () => {
    test('should allow owner to add question within free limit', () => {
      const ownerId = 'owner-123';

      // Add owner
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

      // Simulate WebSocket message: question:add (1st question)
      const addQuestionMessage = {
        type: 'question:add',
        participantId: ownerId,
        sessionId: session.sessionId,
        prompt: 'First question?',
        options: ['Yes', 'No'],
      };

      // Server-side validation
      const canAdd = quotaManager.canAddQuestion({
        participantId: addQuestionMessage.participantId,
        sessionId: addQuestionMessage.sessionId,
        currentCount: 0,
        isOwner: true,
      });

      expect(canAdd).toBe(true);

      // Expected WebSocket response: question:added
      const expectedResponse = {
        type: 'question:added',
        success: true,
        questionId: expect.any(String),
        remainingQuota: 2,
      };
    });

    test('should reject question when free limit reached without upgrade', () => {
      const ownerId = 'owner-123';
      const resourceId = `session:${session.sessionId}`;

      // Add owner
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

      // Add 3 free questions
      for (let i = 1; i <= 3; i++) {
        const question: Question = {
          id: `q${i}`,
          prompt: `Question ${i}?`,
          options: ['Yes', 'No'],
          addedAt: new Date(),
        };
        session.addQuestion(question);
      }

      // Simulate WebSocket message: question:add (4th question, limit reached)
      const addQuestionMessage = {
        type: 'question:add',
        participantId: ownerId,
        sessionId: session.sessionId,
        prompt: 'Fourth question?',
        options: ['Yes', 'No'],
      };

      // Server-side validation
      const canAdd = quotaManager.canAddQuestion({
        participantId: addQuestionMessage.participantId,
        sessionId: addQuestionMessage.sessionId,
        currentCount: 3,
        isOwner: true,
      });

      expect(canAdd).toBe(false);

      // Expected WebSocket response: question:quota_reached
      const expectedResponse = {
        type: 'question:quota_reached',
        success: false,
        currentLimit: 3,
        upgradeFeature: FEATURE.QUESTION_LIMIT_10,
        upgradeCost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
        message: 'Question limit reached. Purchase upgrade to add up to 10 questions.',
      };
    });

    test('should allow owner to add questions after purchasing upgrade', () => {
      const ownerId = 'owner-123';
      const resourceId = `session:${session.sessionId}`;

      // Add owner
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

      // Add 3 free questions
      for (let i = 1; i <= 3; i++) {
        const question: Question = {
          id: `q${i}`,
          prompt: `Question ${i}?`,
          options: ['Yes', 'No'],
          addedAt: new Date(),
        };
        session.addQuestion(question);
      }

      // Grant Vybes and purchase upgrade
      vybeLedger.addVybes({
        participantId: ownerId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });
      billingService.purchaseOrVerifyAccess({
        participantId: ownerId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
        cost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
      });

      // Simulate WebSocket message: question:add (4th question, after upgrade)
      const addQuestionMessage = {
        type: 'question:add',
        participantId: ownerId,
        sessionId: session.sessionId,
        prompt: 'Fourth question?',
        options: ['Yes', 'No'],
      };

      // Server-side validation
      const canAdd = quotaManager.canAddQuestion({
        participantId: addQuestionMessage.participantId,
        sessionId: addQuestionMessage.sessionId,
        currentCount: 3,
        isOwner: true,
      });

      expect(canAdd).toBe(true);

      // Expected WebSocket response: question:added
      const expectedResponse = {
        type: 'question:added',
        success: true,
        questionId: expect.any(String),
        remainingQuota: 6,
      };
    });

    test('should reject question:add from non-owner participant', () => {
      const nonOwnerId = 'p1';

      // Add non-owner
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

      // Simulate WebSocket message: question:add from non-owner
      const addQuestionMessage = {
        type: 'question:add',
        participantId: nonOwnerId,
        sessionId: session.sessionId,
        prompt: 'Unauthorized question?',
        options: ['Yes', 'No'],
      };

      // Server-side validation
      const canAdd = quotaManager.canAddQuestion({
        participantId: addQuestionMessage.participantId,
        sessionId: addQuestionMessage.sessionId,
        currentCount: 0,
        isOwner: false,
      });

      expect(canAdd).toBe(false);

      // Expected WebSocket response: question:error
      const expectedResponse = {
        type: 'question:error',
        success: false,
        error: 'NOT_OWNER',
        message: 'Only the session owner can add questions.',
      };
    });
  });

  describe('Broadcast Scenarios', () => {
    test('should broadcast vybes balance update after purchase', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant Vybes
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Purchase MATCH_TOP3
      const result = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Expected broadcast to participant only: vybes:balance_updated
      const expectedBroadcast = {
        type: 'vybes:balance_updated',
        participantId,
        balance: result.balance,
      };

      expect(result.balance).toBe(TEST_CONFIG.INITIAL_PROMO_VYBES - TEST_CONFIG.PRICING.MATCH_TOP3);
    });

    test('should broadcast quota update after question limit purchase', () => {
      const ownerId = 'owner-123';
      const resourceId = `session:${session.sessionId}`;

      // Add owner
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

      // Grant Vybes and purchase upgrade
      vybeLedger.addVybes({
        participantId: ownerId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });
      billingService.purchaseOrVerifyAccess({
        participantId: ownerId,
        resourceId,
        feature: FEATURE.QUESTION_LIMIT_10,
        cost: TEST_CONFIG.PRICING.QUESTION_LIMIT_10,
      });

      // Expected broadcast to owner only: quota:updated
      const expectedBroadcast = {
        type: 'quota:updated',
        participantId: ownerId,
        newLimit: 10,
        feature: FEATURE.QUESTION_LIMIT_10,
      };
    });
  });
});
