import { describe, test, expect, beforeEach } from 'vitest';
import { QuizSession } from '../../src/server/models/QuizSession';
import { MatchingService } from '../../src/server/services/MatchingService';
import type { Participant } from '../../src/server/models/Participant';
import type { Question } from '../../src/server/models/Question';
import type { Response } from '../../src/server/models/Response';

describe('QuizSession - Slice 6: Dynamic Match Updates', () => {
  let quizSession: QuizSession;
  let matchingService: MatchingService;
  let owner: Participant;
  let p1: Participant;
  let p2: Participant;

  beforeEach(() => {
    quizSession = new QuizSession('owner123');
    matchingService = new MatchingService();

    owner = {
      id: 'owner123',
      username: 'Owner',
      connection: null,
      isOwner: true,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };

    p1 = {
      id: 'p1',
      username: 'User1',
      connection: null,
      isOwner: false,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };

    p2 = {
      id: 'p2',
      username: 'User2',
      connection: null,
      isOwner: false,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };

    quizSession.addParticipant(owner);
    quizSession.addParticipant(p1);
    quizSession.addParticipant(p2);
  });

  describe('Adding Questions After Responses', () => {
    test('should allow adding questions after participants have answered', () => {
      // Add initial questions
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

      quizSession.addQuestion(q1);
      quizSession.addQuestion(q2);

      // Participants answer
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
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'blue',
          answeredAt: new Date()
        },
        {
          id: '04',
          participantId: 'p1',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'rihanna',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      // Now add a new question
      const q3: Question = {
        id: 'q3',
        prompt: 'agree vs disagree',
        options: ['agree', 'disagree'],
        addedAt: new Date()
      };

      expect(() => quizSession.addQuestion(q3)).not.toThrow();
      expect(quizSession.getQuestionCount()).toBe(3);
      expect(quizSession.quiz).toEqual(['q1', 'q2', 'q3']);
    });

    test('should update question order when new question added', () => {
      const q1: Question = {
        id: 'q1',
        prompt: 'Question 1',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      const q2: Question = {
        id: 'q2',
        prompt: 'Question 2',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      expect(quizSession.quiz).toEqual(['q1']);

      quizSession.addQuestion(q2);
      expect(quizSession.quiz).toEqual(['q1', 'q2']);
    });
  });

  describe('Match Recalculation After New Questions', () => {
    test('should recalculate matches when new question is added and answered', () => {
      // Initial setup: 3 questions
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

      // Owner: red, beyonce, agree
      // P1: blue, rihanna, disagree (0% match)
      const initialResponses: Response[] = [
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
        },
        {
          id: '04',
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'blue',
          answeredAt: new Date()
        },
        {
          id: '05',
          participantId: 'p1',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'rihanna',
          answeredAt: new Date()
        },
        {
          id: '06',
          participantId: 'p1',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'disagree',
          answeredAt: new Date()
        }
      ];

      initialResponses.forEach(r => quizSession.recordResponse(r));

      // Check initial match: 0%
      let matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].matchPercentage).toBe(0);

      // Add new question q4
      const q4: Question = {
        id: 'q4',
        prompt: 'sony vs nintendo',
        options: ['sony', 'nintendo'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q4);

      // Both answer with matching response
      const newResponses: Response[] = [
        {
          id: '07',
          participantId: 'owner123',
          questionId: 'q4',
          sessionId: quizSession.sessionId,
          optionChosen: 'sony',
          answeredAt: new Date()
        },
        {
          id: '08',
          participantId: 'p1',
          questionId: 'q4',
          sessionId: quizSession.sessionId,
          optionChosen: 'sony',
          answeredAt: new Date()
        }
      ];

      newResponses.forEach(r => quizSession.recordResponse(r));

      // Recalculate match: should now be 25% (1/4)
      matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].matchPercentage).toBe(25);
    });

    test('should handle match from 33% to 25% when question added', () => {
      // Setup: 3 questions, 1 match out of 3 (33%)
      const q1: Question = {
        id: 'q1',
        prompt: 'Question 1',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      const q2: Question = {
        id: 'q2',
        prompt: 'Question 2',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      const q3: Question = {
        id: 'q3',
        prompt: 'Question 3',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      quizSession.addQuestion(q2);
      quizSession.addQuestion(q3);

      // Owner: yes, yes, yes
      // P1: yes, no, no (33% match: 1/3)
      const responses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'owner123',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '03',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '04',
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '05',
          participantId: 'p1',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'no',
          answeredAt: new Date()
        },
        {
          id: '06',
          participantId: 'p1',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'no',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      let matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].matchPercentage).toBeCloseTo(33.33, 1);

      // Add q4, both answer differently
      const q4: Question = {
        id: 'q4',
        prompt: 'Question 4',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q4);

      const newResponses: Response[] = [
        {
          id: '07',
          participantId: 'owner123',
          questionId: 'q4',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '08',
          participantId: 'p1',
          questionId: 'q4',
          sessionId: quizSession.sessionId,
          optionChosen: 'no',
          answeredAt: new Date()
        }
      ];

      newResponses.forEach(r => quizSession.recordResponse(r));

      // Should now be 25% (1/4)
      matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].matchPercentage).toBe(25);
    });

    test('should handle match staying at 100% when all still match', () => {
      const q1: Question = {
        id: 'q1',
        prompt: 'Question 1',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      const q2: Question = {
        id: 'q2',
        prompt: 'Question 2',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      quizSession.addQuestion(q2);

      // Both answer identically
      const responses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'owner123',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '03',
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '04',
          participantId: 'p1',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      let matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].matchPercentage).toBe(100);

      // Add q3, both answer identically again
      const q3: Question = {
        id: 'q3',
        prompt: 'Question 3',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q3);

      const newResponses: Response[] = [
        {
          id: '05',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '06',
          participantId: 'p1',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        }
      ];

      newResponses.forEach(r => quizSession.recordResponse(r));

      // Should still be 100% (3/3)
      matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].matchPercentage).toBe(100);
    });
  });

  describe('Match Ranking Updates', () => {
    test('should update match ranking when new question changes order', () => {
      // Add 2 questions
      const q1: Question = {
        id: 'q1',
        prompt: 'Question 1',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      const q2: Question = {
        id: 'q2',
        prompt: 'Question 2',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      quizSession.addQuestion(q2);

      // Owner: yes, yes
      // P1: yes, yes (100% match)
      // P2: yes, no (50% match)
      const responses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'owner123',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '03',
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '04',
          participantId: 'p1',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '05',
          participantId: 'p2',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '06',
          participantId: 'p2',
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'no',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      let matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].participantId).toBe('p1'); // 100%
      expect(matches[1].participantId).toBe('p2'); // 50%

      // Add q3
      const q3: Question = {
        id: 'q3',
        prompt: 'Question 3',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q3);

      // Owner: yes
      // P1: no (drops to 67%)
      // P2: yes (rises to 67%)
      const newResponses: Response[] = [
        {
          id: '07',
          participantId: 'owner123',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '08',
          participantId: 'p1',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'no',
          answeredAt: new Date()
        },
        {
          id: '09',
          participantId: 'p2',
          questionId: 'q3',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        }
      ];

      newResponses.forEach(r => quizSession.recordResponse(r));

      matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      
      // Both should now be 67%, but order may vary (both have same percentage)
      expect(matches[0].matchPercentage).toBeCloseTo(66.67, 1);
      expect(matches[1].matchPercentage).toBeCloseTo(66.67, 1);
    });
  });

  describe('Partial Responses After New Question', () => {
    test('should handle when only some participants answer new question', () => {
      const q1: Question = {
        id: 'q1',
        prompt: 'Question 1',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);

      // Both answer q1
      const responses: Response[] = [
        {
          id: '01',
          participantId: 'owner123',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'yes',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      let matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].matchPercentage).toBe(100);

      // Add q2
      const q2: Question = {
        id: 'q2',
        prompt: 'Question 2',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q2);

      // Only owner answers q2
      const partialResponse: Response = {
        id: '03',
        participantId: 'owner123',
        questionId: 'q2',
        sessionId: quizSession.sessionId,
        optionChosen: 'yes',
        answeredAt: new Date()
      };

      quizSession.recordResponse(partialResponse);

      // P1 hasn't answered q2 yet, so match should still be based on q1 only
      matches = matchingService.getMatchesForParticipant('owner123', quizSession);
      expect(matches[0].matchPercentage).toBe(100); // Still 100% on the 1 question both answered
    });
  });
});
