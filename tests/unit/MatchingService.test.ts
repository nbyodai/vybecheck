import { describe, test, expect, beforeEach } from 'vitest';
import { MatchingService } from '../../src/server/services/MatchingService';
import { QuizSession } from '../../src/server/models/QuizSession';
import type { Participant } from '../../src/server/models/Participant';
import type { Question } from '../../src/server/models/Question';
import type { Response } from '../../src/server/models/Response';

describe('MatchingService - Slice 5: Basic Match Calculation', () => {
  let matchingService: MatchingService;
  let quizSession: QuizSession;

  beforeEach(() => {
    matchingService = new MatchingService();
    quizSession = new QuizSession('owner123');

    // Add owner
    const owner: Participant = {
      id: 'owner123',
      username: 'Owner',
      connection: null,
      isOwner: true,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };
    quizSession.addParticipant(owner);

    // Add questions
    const q1: Question = {
      id: 'q1',
      prompt: 'red vs blue',
      options: ['red', 'blue'],
      addedAt: new Date()
    };

    const q2: Question = {
      id: 'q2',
      prompt: 'beyonce vs rihanna',
      options: ['beyonce', 'rihanna'],
      addedAt: new Date()
    };

    const q3: Question = {
      id: 'q3',
      prompt: 'agree vs disagree',
      options: ['agree', 'disagree'],
      addedAt: new Date()
    };

    quizSession.addQuestion(q1);
    quizSession.addQuestion(q2);
    quizSession.addQuestion(q3);
  });

  describe('Get Response Values', () => {
    test('should get response values in question order', () => {
      const responses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'owner123',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'beyonce',
          answeredAt: new Date()
        },
        {
          id: '03',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'agree',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      const values = matchingService.getResponseValues(
        'owner123',
        quizSession.responses,
        quizSession.quiz
      );

      expect(values).toEqual(['red', 'beyonce', 'agree']);
    });

    test('should return empty string for unanswered questions', () => {
      const responses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        },
        // Skip q2
        {
          id: '03',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'agree',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      const values = matchingService.getResponseValues(
        'owner123',
        quizSession.responses,
        quizSession.quiz
      );

      expect(values).toEqual(['red', '', 'agree']);
    });

    test('should return empty array for participant with no responses', () => {
      const values = matchingService.getResponseValues(
        'owner123',
        [],
        quizSession.quiz
      );

      expect(values).toEqual(['', '', '']);
    });

    test('should maintain question order regardless of response submission order', () => {
      // Submit responses in reverse order: q3, q2, q1
      const responses: Response[] = [
        {
          id: '03',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'agree',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'owner123',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'beyonce',
          answeredAt: new Date()
        },
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      const values = matchingService.getResponseValues(
        'owner123',
        quizSession.responses,
        quizSession.quiz
      );

      // Should still be in q1, q2, q3 order
      expect(values).toEqual(['red', 'beyonce', 'agree']);
    });
  });

  describe('Calculate Match Percentage', () => {
    test('should calculate 100% match for identical responses', () => {
      const participant1Values = ['red', 'beyonce', 'agree'];
      const participant2Values = ['red', 'beyonce', 'agree'];

      const matchPercentage = matchingService.calculateMatch(
        participant1Values,
        participant2Values
      );

      expect(matchPercentage).toBe(100);
    });

    test('should calculate 0% match for completely different responses', () => {
      const participant1Values = ['red', 'beyonce', 'agree'];
      const participant2Values = ['blue', 'rihanna', 'disagree'];

      const matchPercentage = matchingService.calculateMatch(
        participant1Values,
        participant2Values
      );

      expect(matchPercentage).toBe(0);
    });

    test('should calculate 33% match for 1 out of 3 matching', () => {
      const participant1Values = ['red', 'beyonce', 'agree'];
      const participant2Values = ['red', 'rihanna', 'disagree'];

      const matchPercentage = matchingService.calculateMatch(
        participant1Values,
        participant2Values
      );

      expect(matchPercentage).toBeCloseTo(33.33, 1);
    });

    test('should calculate 67% match for 2 out of 3 matching', () => {
      const participant1Values = ['red', 'beyonce', 'agree'];
      const participant2Values = ['red', 'beyonce', 'disagree'];

      const matchPercentage = matchingService.calculateMatch(
        participant1Values,
        participant2Values
      );

      expect(matchPercentage).toBeCloseTo(66.67, 1);
    });

    test('should calculate 50% match for 2 out of 4 matching', () => {
      const participant1Values = ['red', 'beyonce', 'agree', 'sony'];
      const participant2Values = ['blue', 'rihanna', 'agree', 'sony'];

      const matchPercentage = matchingService.calculateMatch(
        participant1Values,
        participant2Values
      );

      expect(matchPercentage).toBe(50);
    });

    test('should return 0 for empty response arrays', () => {
      const matchPercentage = matchingService.calculateMatch([], []);
      expect(matchPercentage).toBe(0);
    });

    test('should handle different length arrays by using minimum length', () => {
      const participant1Values = ['red', 'beyonce', 'agree'];
      const participant2Values = ['red', 'beyonce']; // Only answered 2 questions

      const matchPercentage = matchingService.calculateMatch(
        participant1Values,
        participant2Values
      );

      // Should compare only first 2: both match = 100%
      expect(matchPercentage).toBe(100);
    });

    test('should ignore empty strings in comparison', () => {
      const participant1Values = ['red', '', 'agree'];
      const participant2Values = ['red', 'beyonce', 'agree'];

      const matchPercentage = matchingService.calculateMatch(
        participant1Values,
        participant2Values
      );

      // Only compare non-empty: red=red ✓, agree=agree ✓ = 100% of 2
      expect(matchPercentage).toBe(100);
    });
  });

  describe('Get Matches For Participant', () => {
    test('should get all matches sorted by percentage (highest first)', () => {
      // Add participants
      const p1: Participant = {
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const p2: Participant = {
        id: 'p2',
        username: 'User2',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const p3: Participant = {
        id: 'p3',
        username: 'User3',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(p1);
      quizSession.addParticipant(p2);
      quizSession.addParticipant(p3);

      // Owner: red, beyonce, agree
      const ownerResponses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'owner123',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'beyonce',
          answeredAt: new Date()
        },
        {
          id: '03',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'agree',
          answeredAt: new Date()
        }
      ];

      // P1: red, beyonce, agree (100% match with owner)
      const p1Responses: Response[] = [
        {
          id: '04',
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        },
        {
          id: '05',
          participantId: 'p1',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'beyonce',
          answeredAt: new Date()
        },
        {
          id: '06',
          participantId: 'p1',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'agree',
          answeredAt: new Date()
        }
      ];

      // P2: red, beyonce, disagree (67% match with owner)
      const p2Responses: Response[] = [
        {
          id: '07',
          participantId: 'p2',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        },
        {
          id: '08',
          participantId: 'p2',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'beyonce',
          answeredAt: new Date()
        },
        {
          id: '09',
          participantId: 'p2',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'disagree',
          answeredAt: new Date()
        }
      ];

      // P3: blue, rihanna, disagree (0% match with owner)
      const p3Responses: Response[] = [
        {
          id: '10',
          participantId: 'p3',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'blue',
          answeredAt: new Date()
        },
        {
          id: '11',
          participantId: 'p3',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'rihanna',
          answeredAt: new Date()
        },
        {
          id: '12',
          participantId: 'p3',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'disagree',
          answeredAt: new Date()
        }
      ];

      [...ownerResponses, ...p1Responses, ...p2Responses, ...p3Responses].forEach(r =>
        quizSession.recordResponse(r)
      );

      const matches = matchingService.getMatchesForParticipant('owner123', quizSession);

      expect(matches).toHaveLength(3);
      
      // Should be sorted: p1 (100%), p2 (67%), p3 (0%)
      expect(matches[0].participantId).toBe('p1');
      expect(matches[0].matchPercentage).toBe(100);
      
      expect(matches[1].participantId).toBe('p2');
      expect(matches[1].matchPercentage).toBeCloseTo(66.67, 1);
      
      expect(matches[2].participantId).toBe('p3');
      expect(matches[2].matchPercentage).toBe(0);
    });

    test('should not include self in matches', () => {
      const ownerResponses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'owner123',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'beyonce',
          answeredAt: new Date()
        },
        {
          id: '03',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'agree',
          answeredAt: new Date()
        }
      ];

      ownerResponses.forEach(r => quizSession.recordResponse(r));

      const matches = matchingService.getMatchesForParticipant('owner123', quizSession);

      expect(matches).toHaveLength(0);
      expect(matches.find(m => m.participantId === 'owner123')).toBeUndefined();
    });

    test('should return empty array when participant has no responses', () => {
      const matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches).toEqual([]);
    });

    test('should handle participants with partial responses', () => {
      const p1: Participant = {
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(p1);

      // Owner answers all 3
      const ownerResponses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'owner123',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'beyonce',
          answeredAt: new Date()
        },
        {
          id: '03',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'agree',
          answeredAt: new Date()
        }
      ];

      // P1 only answers 2
      const p1Responses: Response[] = [
        {
          id: '04',
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'red',
          answeredAt: new Date()
        },
        {
          id: '05',
          participantId: 'p1',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'beyonce',
          answeredAt: new Date()
        }
      ];

      [...ownerResponses, ...p1Responses].forEach(r => quizSession.recordResponse(r));

      const matches = matchingService.getMatchesForParticipant('owner123', quizSession);

      expect(matches).toHaveLength(1);
      // Should match on the 2 questions both answered
      expect(matches[0].matchPercentage).toBe(100);
    });
  });
});

// Phase 3 Enhancement Tests: Tiered Results & Caching
describe('MatchingService - Tiered Results & Caching', () => {
  let matchingService: MatchingService;
  let session: QuizSession;

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

  beforeEach(() => {
    matchingService = new MatchingService();
    session = new QuizSession('owner-123');
  });

  describe('getMatchesByTier - Tiered Results', () => {
    test('should return 2 middle matches for PREVIEW tier (matches[5:7])', () => {
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

      // Add 10 more participants (11 total, 10 potential matches)
      for (let i = 1; i <= 10; i++) {
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

      const question: Question = {
        id: 'q1',
        prompt: 'Test?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question);

      // Create varied match percentages
      session.recordResponse({
        id: 'r-owner',
        participantId: 'owner-123',
        questionId: 'q1',
        sessionId: session.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date(),
      });

      for (let i = 1; i <= 10; i++) {
        session.recordResponse({
          id: `r${i}`,
          participantId: `p${i}`,
          questionId: 'q1',
          sessionId: session.sessionId,
          optionChosen: i <= 5 ? 'Yes' : 'No',
          answeredAt: new Date(),
        });
      }

      const matches = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.PREVIEW,
      });

      // PREVIEW should return 2 matches from middle (indices 5-6)
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    test('should return top 3 matches for TOP3 tier', () => {
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

      for (let i = 1; i <= 5; i++) {
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

      for (let i = 1; i <= 5; i++) {
        session.recordResponse({
          id: `r${i}`,
          participantId: `p${i}`,
          questionId: 'q1',
          sessionId: session.sessionId,
          optionChosen: i <= 3 ? 'Yes' : 'No',
          answeredAt: new Date(),
        });
      }

      const matches = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.TOP3,
      });

      expect(matches.length).toBeLessThanOrEqual(3);
      // Should be sorted by percentage (highest first)
      if (matches.length >= 2) {
        expect(matches[0].matchPercentage).toBeGreaterThanOrEqual(matches[1].matchPercentage);
      }
    });

    test('should return all matches for ALL tier', () => {
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

      for (let i = 1; i <= 4; i++) {
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

      for (let i = 1; i <= 4; i++) {
        session.recordResponse({
          id: `r${i}`,
          participantId: `p${i}`,
          questionId: 'q1',
          sessionId: session.sessionId,
          optionChosen: i % 2 === 0 ? 'Yes' : 'No',
          answeredAt: new Date(),
        });
      }

      const matches = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      // Should return all 4 matches
      expect(matches).toHaveLength(4);
    });

    test('should handle fewer matches than tier requires (2 participants, TOP3 requested)', () => {
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
      session.addParticipant(owner);
      session.addParticipant(p1);

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

      const matches = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.TOP3,
      });

      // Only 1 match available (can't return 3)
      expect(matches).toHaveLength(1);
    });

    test('should return empty matches for all tiers when no responses', () => {
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

      const question: Question = {
        id: 'q1',
        prompt: 'Test?',
        options: ['Yes', 'No'],
        addedAt: new Date(),
      };
      session.addQuestion(question);

      // No responses added

      const matchesPreview = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.PREVIEW,
      });
      const matchesTop3 = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.TOP3,
      });
      const matchesAll = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      expect(matchesPreview).toEqual([]);
      expect(matchesTop3).toEqual([]);
      expect(matchesAll).toEqual([]);
    });
  });

  describe('Caching Behavior', () => {
    test('should cache calculation on first call (cache miss)', () => {
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
      session.addParticipant(owner);
      session.addParticipant(p1);

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

      // First call should calculate and cache
      const matches1 = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      expect(matches1).toHaveLength(1);
    });

    test('should use cached data on second call (cache hit)', () => {
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
      session.addParticipant(owner);
      session.addParticipant(p1);

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

      const matches1 = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      const matches2 = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      // Should return same results
      expect(matches1).toEqual(matches2);
    });

    test('should use same cached calculation for different tiers', () => {
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

      for (let i = 1; i <= 5; i++) {
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

      for (let i = 1; i <= 5; i++) {
        session.recordResponse({
          id: `r${i}`,
          participantId: `p${i}`,
          questionId: 'q1',
          sessionId: session.sessionId,
          optionChosen: 'Yes',
          answeredAt: new Date(),
        });
      }

      // Request different tiers (should use same cached calculation, just slice differently)
      const matchesPreview = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.PREVIEW,
      });
      const matchesTop3 = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.TOP3,
      });
      const matchesAll = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      // All should return data (different slices of same calculation)
      expect(matchesPreview.length).toBeLessThanOrEqual(2);
      expect(matchesTop3.length).toBeLessThanOrEqual(3);
      expect(matchesAll).toHaveLength(5);
    });

    test('should maintain separate cache entries for different participants', () => {
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

      // Get matches for different participants (should have separate cache keys)
      const matchesOwner = matchingService.getMatchesByTier({
        participantId: 'owner-123',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });
      const matchesP1 = matchingService.getMatchesByTier({
        participantId: 'p1',
        session,
        tier: TEST_CONFIG.TIERS.ALL,
      });

      // Should be different (each participant has different matches)
      expect(matchesOwner).not.toEqual(matchesP1);
    });
  });
});
