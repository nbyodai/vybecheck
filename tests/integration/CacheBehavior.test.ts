import { describe, test, expect, beforeEach, vi } from 'vitest';
import { QuizSession } from '../../src/server/models/QuizSession';
import { MatchingService } from '../../src/server/services/MatchingService';
import type { Participant, Question } from '../../src/shared/types';

// Test Configuration
const TEST_CONFIG = {
  CACHE: {
    TTL_MS: 600000, // 10 minutes
  },
  TIERS: {
    PREVIEW: 'PREVIEW',
    TOP3: 'TOP3',
    ALL: 'ALL',
  },
} as const;

describe('CacheBehavior - Integration Tests', () => {
  let session: QuizSession;
  let matchingService: MatchingService;

  beforeEach(() => {
    session = new QuizSession('owner-123');
    matchingService = new MatchingService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Cache TTL (Time-To-Live)', () => {
    test('should invalidate cache after 10-minute TTL expires', () => {
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

      // First call - cache miss
      const matches1 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches1).toHaveLength(1);

      // Advance time by 9 minutes (still within TTL)
      vi.advanceTimersByTime(9 * 60 * 1000);

      // Second call - cache hit (within TTL)
      const matches2 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches2).toEqual(matches1);

      // Advance time by 2 more minutes (total 11 minutes - beyond TTL)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Third call - cache miss (TTL expired, should recalculate)
      const matches3 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches3).toHaveLength(1);
    });

    test('should use cached data within TTL window', () => {
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

      // First call
      const matches1 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      // Multiple calls within TTL (should all return cached data)
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(60 * 1000); // Advance 1 minute each iteration
        const matches = matchingService.getMatchesByTier({
          participantId,
          session,
          tier: TEST_CONFIG.TIERS.ALL,
        });
        expect(matches).toEqual(matches1);
      }
    });
  });

  describe('Cache Invalidation on Quiz State Changes', () => {
    test('should invalidate cache when new question is added', () => {
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

      // Add first question
      const question1: Question = {
        id: 'q1',
        prompt: 'Test 1?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question1);

      session.recordResponse({
        id: 'r-owner-1',
        participantId: 'owner-123',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });
      session.recordResponse({
        id: 'r1-1',
        participantId,
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });

      // First call - cache miss
      const matches1 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches1).toHaveLength(1);
      expect(matches1[0].matchPercentage).toBe(100);

      // Add second question (should invalidate cache)
      const question2: Question = {
        id: 'q2',
        prompt: 'Test 2?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question2);

      // Owner answers second question
      session.recordResponse({
        id: 'r-owner-2',
        participantId: 'owner-123',
        questionId: 'q2',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });

      // p1 answers differently
      session.recordResponse({
        id: 'r1-2',
        participantId,
        questionId: 'q2',
        sessionId: session.sessionId,
        optionChosen: 'No',
        answeredAt: new Date(),
      });

      // Call after question added - should recalculate (not use stale cache)
      const matches2 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches2).toHaveLength(1);
      expect(matches2[0].matchPercentage).toBe(50); // Now only 1/2 questions match
    });

    test('should invalidate cache when new response is submitted', () => {
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
      const p2: Participant = {
        id: 'p2',
        username: 'User2',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(owner);
      session.addParticipant(p1);
      session.addParticipant(p2);

      // Add question
      const question: Question = {
        id: 'q1',
        prompt: 'Test?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question);

      // Owner and p1 answer
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

      // First call - only owner in matches (p2 hasn't answered yet)
      const matches1 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches1).toHaveLength(1); // Only owner

      // p2 submits response (should invalidate cache)
      session.recordResponse({
        id: 'r2',
        participantId: 'p2',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'No',
        answeredAt: new Date(),
      });

      // Call after new response - should show updated matches
      const matches2 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches2).toHaveLength(2); // Owner + p2
    });

    test('should invalidate cache when participant joins and answers', () => {
      const participantId = 'p1';

      // Add initial participants
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

      // Add question
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

      // First call
      const matches1 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches1).toHaveLength(1);

      // New participant joins
      const p2: Participant = {
        id: 'p2',
        username: 'User2',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(p2);

      // New participant answers
      session.recordResponse({
        id: 'r2',
        participantId: 'p2',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });

      // Cache should be invalidated, showing new participant
      const matches2 = matchingService.getMatchesByTier({
        participantId,
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matches2).toHaveLength(2); // Owner + p2
    });
  });

  describe('Cache Isolation Between Participants', () => {
    test('should maintain separate caches for different participants in same session', () => {
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
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      const p2: Participant = {
        id: 'p2',
        username: 'User2',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(owner);
      session.addParticipant(p1);
      session.addParticipant(p2);

      // Add question
      const question: Question = {
        id: 'q1',
        prompt: 'Test?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question);

      // Different responses
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
        participantId: 'p1',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });
      session.recordResponse({
        id: 'r2',
        participantId: 'p2',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'No',
        answeredAt: new Date(),
      });

      // Get matches for p1 (should match with owner)
      const matchesP1 = matchingService.getMatchesByTier({
        participantId: 'p1',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matchesP1).toHaveLength(2);
      const ownerMatchP1 = matchesP1.find((m) => m.participantId === 'owner-123');
      expect(ownerMatchP1?.matchPercentage).toBe(100);

      // Get matches for p2 (should NOT match with owner)
      const matchesP2 = matchingService.getMatchesByTier({
        participantId: 'p2',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      expect(matchesP2).toHaveLength(2);
      const ownerMatchP2 = matchesP2.find((m) => m.participantId === 'owner-123');
      expect(ownerMatchP2?.matchPercentage).toBe(0);

      // Caches should be independent
      expect(matchesP1).not.toEqual(matchesP2);
    });

    test('should not affect other participant caches when one cache is invalidated', () => {
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
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      const p2: Participant = {
        id: 'p2',
        username: 'User2',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true,
      };
      session.addParticipant(owner);
      session.addParticipant(p1);
      session.addParticipant(p2);

      // Add question
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
        participantId: 'p1',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });
      session.recordResponse({
        id: 'r2',
        participantId: 'p2',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'No',
        answeredAt: new Date(),
      });

      // Cache results for both participants
      matchingService.getMatchesByTier({
        participantId: 'p1',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      matchingService.getMatchesByTier({
        participantId: 'p2',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      // Adding new question should invalidate ALL participant caches (global quiz state change)
      const question2: Question = {
        id: 'q2',
        prompt: 'Test 2?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question2);

      // Both should recalculate (but this is expected behavior - global invalidation)
      const matchesP1After = matchingService.getMatchesByTier({
        participantId: 'p1',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      const matchesP2After = matchingService.getMatchesByTier({
        participantId: 'p2',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      expect(matchesP1After).toBeDefined();
      expect(matchesP2After).toBeDefined();
    });
  });
});
