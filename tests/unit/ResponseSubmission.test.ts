import { describe, test, expect, beforeEach } from 'vitest';
import { QuizSession } from '../../src/server/models/QuizSession';
import type { Participant } from '../../src/server/models/Participant';
import type { Question } from '../../src/server/models/Question';
import type { Response } from '../../src/server/models/Response';

describe('QuizSession - Slice 4: Response Submission', () => {
  let ownerId: string;
  let quizSession: QuizSession;
  let ownerParticipant: Participant;
  let question1: Question;
  let question2: Question;

  beforeEach(() => {
    ownerId = 'owner123';
    quizSession = new QuizSession(ownerId);

    ownerParticipant = {
      id: ownerId,
      username: 'Owner',
      connection: null,
      isOwner: true,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };

    question1 = {
      id: 'q1',
      prompt: 'Is the sky blue?',
      options: ['Yes', 'No'],
      addedAt: new Date()
    };

    question2 = {
      id: 'q2',
      prompt: 'Do you agree?',
      options: ['Agree', 'Disagree'],
      addedAt: new Date()
    };

    quizSession.addParticipant(ownerParticipant);
    quizSession.addQuestion(question1);
    quizSession.addQuestion(question2);
  });

  describe('Recording Responses', () => {
    test('should record a single response', () => {
      const response: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response);

      expect(quizSession.responses).toHaveLength(1);
      expect(quizSession.responses[0]).toEqual(response);
    });

    test('should record multiple responses from same participant', () => {
      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      const response2: Response = {
        id: '02',
        participantId: ownerId,
        questionId: 'q2',
        sessionId: quizSession.sessionId,
        optionChosen: 'Agree',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);
      quizSession.recordResponse(response2);

      expect(quizSession.responses).toHaveLength(2);
      expect(quizSession.responses[0].questionId).toBe('q1');
      expect(quizSession.responses[1].questionId).toBe('q2');
    });

    test('should record responses from multiple participants', () => {
      const participant1: Participant = {
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(participant1);

      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      const response2: Response = {
        id: '02',
        participantId: 'p1',
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'No',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);
      quizSession.recordResponse(response2);

      expect(quizSession.responses).toHaveLength(2);
      expect(quizSession.responses[0].participantId).toBe(ownerId);
      expect(quizSession.responses[1].participantId).toBe('p1');
    });

    test('should store responses in flat array', () => {
      const participant1: Participant = {
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(participant1);

      const responses: Response[] = [
        {
          id: '01',
          participantId: ownerId,
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'Yes',
          answeredAt: new Date()
        },
        {
          id: '02',
          participantId: 'p1',
          questionId: 'q1',
          sessionId: quizSession.sessionId,
          optionChosen: 'No',
          answeredAt: new Date()
        },
        {
          id: '03',
          participantId: ownerId,
          questionId: 'q2',
          sessionId: quizSession.sessionId,
          optionChosen: 'Agree',
          answeredAt: new Date()
        }
      ];

      responses.forEach(r => quizSession.recordResponse(r));

      expect(quizSession.responses).toHaveLength(3);
      expect(Array.isArray(quizSession.responses)).toBe(true);
    });
  });

  describe('Response Validation', () => {
    test('should reject response with empty participant ID', () => {
      const invalidResponse: Response = {
        id: '01',
        participantId: '',
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      expect(() => quizSession.recordResponse(invalidResponse))
        .toThrow('Participant ID cannot be empty');
    });

    test('should reject response with empty question ID', () => {
      const invalidResponse: Response = {
        id: '01',
        participantId: ownerId,
        questionId: '',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      expect(() => quizSession.recordResponse(invalidResponse))
        .toThrow('Question ID cannot be empty');
    });

    test('should reject response with empty option chosen', () => {
      const invalidResponse: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: '',
        answeredAt: new Date()
      };

      expect(() => quizSession.recordResponse(invalidResponse))
        .toThrow('Option chosen cannot be empty');
    });

    test('should reject response for non-existent participant', () => {
      const invalidResponse: Response = {
        id: '01',
        participantId: 'nonexistent',
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      expect(() => quizSession.recordResponse(invalidResponse))
        .toThrow('Participant nonexistent does not exist');
    });

    test('should reject response for non-existent question', () => {
      const invalidResponse: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'nonexistent',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      expect(() => quizSession.recordResponse(invalidResponse))
        .toThrow('Question nonexistent does not exist');
    });

    test('should reject response with invalid option for question', () => {
      const invalidResponse: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'InvalidOption',
        answeredAt: new Date()
      };

      expect(() => quizSession.recordResponse(invalidResponse))
        .toThrow('Option InvalidOption is not valid for question q1');
    });

    test('should reject duplicate response from same participant for same question', () => {
      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      const response2: Response = {
        id: '02',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'No',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);

      expect(() => quizSession.recordResponse(response2))
        .toThrow('Participant owner123 has already answered question q1');
    });
  });

  describe('Retrieving Responses', () => {
    test('should get responses for specific participant', () => {
      const participant1: Participant = {
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(participant1);

      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      const response2: Response = {
        id: '02',
        participantId: 'p1',
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'No',
        answeredAt: new Date()
      };

      const response3: Response = {
        id: '03',
        participantId: ownerId,
        questionId: 'q2',
        sessionId: quizSession.sessionId,
        optionChosen: 'Agree',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);
      quizSession.recordResponse(response2);
      quizSession.recordResponse(response3);

      const ownerResponses = quizSession.getResponsesForParticipant(ownerId);
      expect(ownerResponses).toHaveLength(2);
      expect(ownerResponses[0].questionId).toBe('q1');
      expect(ownerResponses[1].questionId).toBe('q2');

      const p1Responses = quizSession.getResponsesForParticipant('p1');
      expect(p1Responses).toHaveLength(1);
      expect(p1Responses[0].questionId).toBe('q1');
    });

    test('should get response values in question order', () => {
      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      const response2: Response = {
        id: '02',
        participantId: ownerId,
        questionId: 'q2',
        sessionId: quizSession.sessionId,
        optionChosen: 'Agree',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);
      quizSession.recordResponse(response2);

      const values = quizSession.getResponseValuesForParticipant(ownerId);
      expect(values).toEqual(['Yes', 'Agree']);
    });

    test('should return empty string for unanswered questions in response values', () => {
      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      // Only answer q1, not q2
      quizSession.recordResponse(response1);

      const values = quizSession.getResponseValuesForParticipant(ownerId);
      expect(values).toEqual(['Yes', '']);
    });

    test('should return empty array for participant with no responses', () => {
      const responses = quizSession.getResponsesForParticipant(ownerId);
      expect(responses).toEqual([]);
    });
  });

  describe('Response Count', () => {
    test('should count total responses', () => {
      expect(quizSession.getResponseCount()).toBe(0);

      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);
      expect(quizSession.getResponseCount()).toBe(1);

      const response2: Response = {
        id: '02',
        participantId: ownerId,
        questionId: 'q2',
        sessionId: quizSession.sessionId,
        optionChosen: 'Agree',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response2);
      expect(quizSession.getResponseCount()).toBe(2);
    });

    test('should count responses for specific participant', () => {
      const participant1: Participant = {
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(participant1);

      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      const response2: Response = {
        id: '02',
        participantId: ownerId,
        questionId: 'q2',
        sessionId: quizSession.sessionId,
        optionChosen: 'Agree',
        answeredAt: new Date()
      };

      const response3: Response = {
        id: '03',
        participantId: 'p1',
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'No',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);
      quizSession.recordResponse(response2);
      quizSession.recordResponse(response3);

      expect(quizSession.getResponseCountForParticipant(ownerId)).toBe(2);
      expect(quizSession.getResponseCountForParticipant('p1')).toBe(1);
    });
  });

  describe('Participant Completion Status', () => {
    test('should check if participant has answered all questions', () => {
      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);
      expect(quizSession.hasParticipantCompletedQuiz(ownerId)).toBe(false);

      const response2: Response = {
        id: '02',
        participantId: ownerId,
        questionId: 'q2',
        sessionId: quizSession.sessionId,
        optionChosen: 'Agree',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response2);
      expect(quizSession.hasParticipantCompletedQuiz(ownerId)).toBe(true);
    });

    test('should return false for participant with no responses', () => {
      expect(quizSession.hasParticipantCompletedQuiz(ownerId)).toBe(false);
    });

    test('should return false for participant with partial responses', () => {
      const response1: Response = {
        id: '01',
        participantId: ownerId,
        questionId: 'q1',
        sessionId: quizSession.sessionId,
        optionChosen: 'Yes',
        answeredAt: new Date()
      };

      quizSession.recordResponse(response1);
      expect(quizSession.hasParticipantCompletedQuiz(ownerId)).toBe(false);
    });
  });
});
