import { describe, test, expect, beforeEach } from 'vitest';
import { QuizSession } from '../../src/server/models/QuizSession';
import type { Participant } from '../../src/server/models/Participant';
import type { Question } from '../../src/server/models/Question';

describe('QuizSession - Slice 2: Owner Adds Questions', () => {
  let ownerId: string;
  let quizSession: QuizSession;
  let ownerParticipant: Participant;

  beforeEach(() => {
    ownerId = 'owner123';
    quizSession = new QuizSession(ownerId);
    
    ownerParticipant = {
      id: ownerId,
      username: 'TestOwner',
      connection: null,
      isOwner: true,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };
    
    quizSession.addParticipant(ownerParticipant);
  });

  describe('Adding Questions', () => {
    test('should add a question with all required fields', () => {
      const question: Question = {
        id: 'q1',
        prompt: 'red vs blue',
        options: ['red', 'blue'],
        addedAt: new Date()
      };

      quizSession.addQuestion(question);

      expect(quizSession.questions).toHaveLength(1);
      expect(quizSession.questions[0]).toEqual(question);
      expect(quizSession.quiz).toHaveLength(1);
      expect(quizSession.quiz[0]).toBe('q1');
    });

    test('should add multiple questions in order', () => {
      const q1: Question = {
        id: 'q1',
        prompt: 'red vs blue',
        options: ['red', 'blue'],
        addedAt: new Date()
      };

      const q2: Question = {
        id: 'q2',
        prompt: 'Home made pie tastes better',
        options: ['agree', 'disagree'],
        addedAt: new Date()
      };

      const q3: Question = {
        id: 'q3',
        prompt: 'sony vs nintendo',
        options: ['sony', 'nintendo'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      quizSession.addQuestion(q2);
      quizSession.addQuestion(q3);

      expect(quizSession.questions).toHaveLength(3);
      expect(quizSession.quiz).toEqual(['q1', 'q2', 'q3']);
      expect(quizSession.questions[0].prompt).toBe('red vs blue');
      expect(quizSession.questions[1].prompt).toBe('Home made pie tastes better');
      expect(quizSession.questions[2].prompt).toBe('sony vs nintendo');
    });

    test('should preserve question options (exactly 2)', () => {
      const question: Question = {
        id: 'q1',
        prompt: 'Choose your favorite',
        options: ['option1', 'option2'],
        addedAt: new Date()
      };

      quizSession.addQuestion(question);

      const addedQuestion = quizSession.questions[0];
      expect(addedQuestion.options).toEqual(['option1', 'option2']);
      expect(addedQuestion.options).toHaveLength(2);
    });

    test('should handle optional timer field', () => {
      const questionWithTimer: Question = {
        id: 'q1',
        prompt: 'Quick question',
        options: ['yes', 'no'],
        timer: 5,
        addedAt: new Date()
      };

      quizSession.addQuestion(questionWithTimer);

      expect(quizSession.questions[0].timer).toBe(5);
    });

    test('should handle question without timer field', () => {
      const questionWithoutTimer: Question = {
        id: 'q1',
        prompt: 'Normal question',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      quizSession.addQuestion(questionWithoutTimer);

      expect(quizSession.questions[0].timer).toBeUndefined();
    });
  });

  describe('Question Validation', () => {
    test('should reject question with empty prompt', () => {
      const invalidQuestion: Question = {
        id: 'q1',
        prompt: '',
        options: ['red', 'blue'],
        addedAt: new Date()
      };

      expect(() => quizSession.addQuestion(invalidQuestion))
        .toThrow('Question prompt cannot be empty');
    });

    test('should reject question with only 1 option', () => {
      const invalidQuestion: Question = {
        id: 'q1',
        prompt: 'Invalid question',
        options: ['only-one'] as any,
        addedAt: new Date()
      };

      expect(() => quizSession.addQuestion(invalidQuestion))
        .toThrow('Question must have exactly 2 options');
    });

    test('should reject question with empty options array', () => {
      const invalidQuestion: Question = {
        id: 'q1',
        prompt: 'No options',
        options: [] as any,
        addedAt: new Date()
      };

      expect(() => quizSession.addQuestion(invalidQuestion))
        .toThrow('Question must have exactly 2 options');
    });

    test('should reject question with more than 2 options', () => {
      const invalidQuestion: Question = {
        id: 'q1',
        prompt: 'Too many options',
        options: ['option1', 'option2', 'option3'] as any,
        addedAt: new Date()
      };

      expect(() => quizSession.addQuestion(invalidQuestion))
        .toThrow('Question must have exactly 2 options');
    });

    test('should reject question with duplicate ID', () => {
      const q1: Question = {
        id: 'q1',
        prompt: 'First question',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      const q2: Question = {
        id: 'q1', // Same ID
        prompt: 'Second question',
        options: ['agree', 'disagree'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      
      expect(() => quizSession.addQuestion(q2))
        .toThrow('Question with ID q1 already exists');
    });

    test('should reject question with empty ID', () => {
      const invalidQuestion: Question = {
        id: '',
        prompt: 'Question',
        options: ['yes', 'no'],
        addedAt: new Date()
      };

      expect(() => quizSession.addQuestion(invalidQuestion))
        .toThrow('Question ID cannot be empty');
    });
  });

  describe('Owner Permission for Adding Questions', () => {
    test('owner should be able to add questions', () => {
      const question: Question = {
        id: 'q1',
        prompt: 'test',
        options: ['a', 'b'],
        addedAt: new Date()
      };

      // Owner can add (already tested above, but explicit check)
      expect(() => quizSession.addQuestion(question)).not.toThrow();
      expect(quizSession.questions).toHaveLength(1);
    });

    test('canAddQuestion should return true for owner', () => {
      expect(quizSession.canAddQuestion(ownerId)).toBe(true);
    });

    test('non-owner participant should not be able to add questions', () => {
      const regularParticipant: Participant = {
        id: 'participant456',
        username: 'Regular',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(regularParticipant);

      expect(quizSession.canAddQuestion('participant456')).toBe(false);
    });
  });

  describe('Retrieving Questions', () => {
    test('should retrieve question by ID', () => {
      const q1: Question = {
        id: 'q1',
        prompt: 'First',
        options: ['a', 'b'],
        addedAt: new Date()
      };

      const q2: Question = {
        id: 'q2',
        prompt: 'Second',
        options: ['c', 'd'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      quizSession.addQuestion(q2);

      const retrieved = quizSession.getQuestionById('q1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.prompt).toBe('First');
    });

    test('should return undefined for non-existent question', () => {
      const retrieved = quizSession.getQuestionById('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    test('should get all questions', () => {
      const q1: Question = {
        id: 'q1',
        prompt: 'First',
        options: ['a', 'b'],
        addedAt: new Date()
      };

      const q2: Question = {
        id: 'q2',
        prompt: 'Second',
        options: ['c', 'd'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      quizSession.addQuestion(q2);

      const allQuestions = quizSession.getAllQuestions();
      expect(allQuestions).toHaveLength(2);
      expect(allQuestions[0].id).toBe('q1');
      expect(allQuestions[1].id).toBe('q2');
    });

    test('should return empty array when no questions exist', () => {
      const allQuestions = quizSession.getAllQuestions();
      expect(allQuestions).toEqual([]);
    });
  });

  describe('Question Count', () => {
    test('should return correct question count', () => {
      expect(quizSession.getQuestionCount()).toBe(0);

      const q1: Question = {
        id: 'q1',
        prompt: 'First',
        options: ['a', 'b'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q1);
      expect(quizSession.getQuestionCount()).toBe(1);

      const q2: Question = {
        id: 'q2',
        prompt: 'Second',
        options: ['c', 'd'],
        addedAt: new Date()
      };

      quizSession.addQuestion(q2);
      expect(quizSession.getQuestionCount()).toBe(2);
    });
  });
});
