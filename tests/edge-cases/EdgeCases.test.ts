import { describe, test, expect, beforeEach } from 'vitest';
import { QuizSession } from '../../src/server/models/QuizSession';
import { BillingService } from '../../src/server/services/BillingService';
import { VybeLedger } from '../../src/server/models/VybeLedger';
import { ParticipantUnlock } from '../../src/server/models/ParticipantUnlock';
import { QuotaManager } from '../../src/server/models/QuotaManager';
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

describe('EdgeCases - Integration Tests', () => {
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
    quotaManager = new QuotaManager(participantUnlock);
    matchingService = new MatchingService();
    billingService = new BillingService({
      vybeLedger,
      participantUnlock,
      quotaManager,
    });
  });

  describe('Zero Vybes Balance', () => {
    test('should handle participant with zero Vybes balance', () => {
      const participantId = 'p1';

      // Check balance (no Vybes granted yet)
      const balance = vybeLedger.getBalance(participantId);
      expect(balance).toBe(0);

      // Attempt to purchase with zero balance
      const resourceId = `session:${session.sessionId}`;
      const result = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(result.granted).toBe(false);
      expect(result.charged).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_VYBES');
      expect(result.balance).toBe(0);
    });

    test('should allow free features (MATCH_PREVIEW) with zero Vybes', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // MATCH_PREVIEW costs 0 Vybes
      const result = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_PREVIEW,
        cost: TEST_CONFIG.PRICING.MATCH_PREVIEW,
      });

      expect(result.granted).toBe(true);
      expect(result.charged).toBe(false); // Free feature, no charge
      expect(result.balance).toBe(0);
    });
  });

  describe('Exact Vybe Balance Scenarios', () => {
    test('should allow purchase when balance exactly matches cost', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant exactly 2 Vybes (exact cost of MATCH_TOP3)
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.PRICING.MATCH_TOP3,
        reason: 'INITIAL_VYBES',
      });

      const result = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(result.granted).toBe(true);
      expect(result.charged).toBe(true);
      expect(result.balance).toBe(0); // Exactly zero after purchase
    });

    test('should reject purchase when balance is 1 Vybe short', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant 1 Vybe (1 short of MATCH_TOP3 cost)
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.PRICING.MATCH_TOP3 - 1,
        reason: 'INITIAL_VYBES',
      });

      const result = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(result.granted).toBe(false);
      expect(result.charged).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_VYBES');
      expect(result.balance).toBe(1);
    });
  });

  describe('Empty Quiz State', () => {
    test('should handle match request when no questions exist', () => {
      const participantId = 'p1';

      // Add participant but no questions
      const p1: Participant = {
        id: participantId,
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(p1);

      // Get matches (no questions, no responses)
      const matches = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      expect(matches).toEqual([]);
    });

    test('should handle match request when no responses exist', () => {
      const participantId = 'p1';

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

      // Add question but no responses
      const question: Question = {
        id: 'q1',
        prompt: 'Test?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question);

      // Get matches (questions exist but no responses)
      const matches = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      expect(matches).toEqual([]);
    });

    test('should handle quota check for owner with no questions added yet', () => {
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

      // Check if owner can add first question (count = 0)
      const canAdd = quotaManager.canAddQuestion({
        participantId: ownerId,
        sessionId: session.sessionId,
        currentCount: 0,
        isOwner: true,
      });

      expect(canAdd).toBe(true);
    });
  });

  describe('Single Participant Scenarios', () => {
    test('should return empty matches when only one participant exists', () => {
      const ownerId = 'owner-123';

      // Add only owner
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

      // Add question
      const question: Question = {
        id: 'q1',
        prompt: 'Test?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question);

      // Owner answers
      session.recordResponse({
        id: 'r-owner',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });

      // Get matches (should be empty - can't match with self)
      const matches = matchingService.getMatchesByTier({
        participantId: ownerId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      expect(matches).toEqual([]);
    });
  });

  describe('Invalid/Non-existent References', () => {
    test('should handle purchase for non-existent participant', () => {
      const nonExistentId = 'non-existent-participant';
      const resourceId = `session:${session.sessionId}`;

      // Grant Vybes to non-existent participant
      vybeLedger.addVybes({
        participantId: nonExistentId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Attempt purchase (should work - VybeLedger doesn't require participant to exist in session)
      const result = billingService.purchaseOrVerifyAccess({
        participantId: nonExistentId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(result.granted).toBe(true);
      expect(result.charged).toBe(true);
    });

    test('should handle match request for non-existent participant', () => {
      const nonExistentId = 'non-existent-participant';

      // Attempt to get matches for participant not in session
      const matches = matchingService.getMatchesByTier({
        participantId: nonExistentId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      // Should return empty (participant has no responses)
      expect(matches).toEqual([]);
    });

    test('should handle quota check for non-existent session', () => {
      const ownerId = 'owner-123';
      const nonExistentSessionId = 'non-existent-session';

      // Check quota for non-existent session
      const canAdd = quotaManager.canAddQuestion({
        participantId: ownerId,
        sessionId: nonExistentSessionId,
        currentCount: 0,
        isOwner: true,
      });

      // Should still return valid result based on default limits
      expect(typeof canAdd).toBe('boolean');
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple purchases in rapid succession', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant enough for 2 purchases
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.PRICING.MATCH_TOP3 * 2,
        reason: 'INITIAL_VYBES',
      });

      // First purchase
      const result1 = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Second purchase (different feature)
      const result2 = billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId: `session:different-session`,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      expect(result1.granted).toBe(true);
      expect(result1.balance).toBe(2);
      expect(result2.granted).toBe(true);
      expect(result2.balance).toBe(0);
    });

    test('should handle balance check during active purchase', () => {
      const participantId = 'p1';
      const resourceId = `session:${session.sessionId}`;

      // Grant Vybes
      vybeLedger.addVybes({
        participantId,
        amount: TEST_CONFIG.INITIAL_PROMO_VYBES,
        reason: 'INITIAL_VYBES',
      });

      // Check balance before purchase
      const balanceBefore = vybeLedger.getBalance(participantId);
      expect(balanceBefore).toBe(10);

      // Purchase
      billingService.purchaseOrVerifyAccess({
        participantId,
        resourceId,
        feature: FEATURE.MATCH_TOP3,
        cost: TEST_CONFIG.PRICING.MATCH_TOP3,
      });

      // Check balance after purchase
      const balanceAfter = vybeLedger.getBalance(participantId);
      expect(balanceAfter).toBe(8);
    });
  });

  describe('Boundary Conditions', () => {
    test('should handle owner at exact question limit (3 free questions)', () => {
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

      // Add exactly 3 questions (free limit)
      for (let i = 1; i <= 3; i++) {
        const question: Question = {
          id: `q${i}`,
          prompt: `Question ${i}?`,
          options: ['Yes', 'No'],
          addedAt: new Date(),
        };
        session.addQuestion(question);
      }

      // Check if owner can add 4th question (should be denied)
      const canAdd = quotaManager.canAddQuestion({
        participantId: ownerId,
        sessionId: session.sessionId,
        currentCount: 3,
        isOwner: true,
      });

      expect(canAdd).toBe(false);
    });

    test('should handle owner at exact upgraded limit (10 questions)', () => {
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

      // Add exactly 10 questions
      for (let i = 1; i <= 10; i++) {
        const question: Question = {
          id: `q${i}`,
          prompt: `Question ${i}?`,
          options: ['Yes', 'No'],
          addedAt: new Date(),
        };
        session.addQuestion(question);
      }

      // Check if owner can add 11th question (should be denied)
      const canAdd = quotaManager.canAddQuestion({
        participantId: ownerId,
        sessionId: session.sessionId,
        currentCount: 10,
        isOwner: true,
      });

      expect(canAdd).toBe(false);
    });

    test('should handle PREVIEW tier when fewer than 7 matches exist', () => {
      const participantId = 'p1';

      // Add owner
      const owner: Participant = {
        id: 'owner-123',
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(owner);

      // Add only 3 other participants (total 4, so 3 potential matches)
      for (let i = 1; i <= 3; i++) {
        const participant: Participant = {
          id: `p${i}`,
          username: `User${i}`,
          connection: null,
          isOwner: false,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
          isActive: true,
        };
        session.addParticipant(participant);
      }

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

      for (let i = 1; i <= 3; i++) {
        session.recordResponse({
          id: `r${i}`,
          participantId: `p${i}`,
          questionId: 'q1',
          sessionId: session.sessionId,
          optionChosen: 'Yes',
          answeredAt: new Date(),
        });
      }

      // PREVIEW tier expects middle 2 matches (indices 5-6), but only 3 matches exist
      const matches = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.PREVIEW,
      });

      // Should return fewer matches than typical (can't return matches that don't exist)
      expect(matches.length).toBeLessThanOrEqual(2);
    });
  });
});
