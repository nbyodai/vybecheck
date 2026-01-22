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
