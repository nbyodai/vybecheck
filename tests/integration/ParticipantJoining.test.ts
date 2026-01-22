import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { QuizSession } from '../../src/server/models/QuizSession';
import type { Participant } from '../../src/server/models/Participant';

describe('QuizSession - Slice 3: Multiple Participants Join', () => {
  let ownerId: string;
  let quizSession: QuizSession;

  beforeEach(() => {
    ownerId = 'owner123';
    quizSession = new QuizSession(ownerId);
  });

  describe('Adding Multiple Participants', () => {
    test('should add multiple participants to session', () => {
      const owner: Participant = {
        id: ownerId,
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const participant1: Participant = {
        id: 'participant1',
        username: 'Alice',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const participant2: Participant = {
        id: 'participant2',
        username: 'Bob',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(owner);
      quizSession.addParticipant(participant1);
      quizSession.addParticipant(participant2);

      expect(quizSession.participants.size).toBe(3);
      expect(quizSession.participants.has(ownerId)).toBe(true);
      expect(quizSession.participants.has('participant1')).toBe(true);
      expect(quizSession.participants.has('participant2')).toBe(true);
    });

    test('should track participant count correctly', () => {
      expect(quizSession.getParticipantCount()).toBe(0);

      const owner: Participant = {
        id: ownerId,
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(owner);
      expect(quizSession.getParticipantCount()).toBe(1);

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
      expect(quizSession.getParticipantCount()).toBe(2);
    });

    test('should distinguish between owner and regular participants', () => {
      const owner: Participant = {
        id: ownerId,
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const regular: Participant = {
        id: 'regular1',
        username: 'Regular',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(owner);
      quizSession.addParticipant(regular);

      expect(quizSession.participants.get(ownerId)?.isOwner).toBe(true);
      expect(quizSession.participants.get('regular1')?.isOwner).toBe(false);
    });
  });

  describe('Retrieving Participants', () => {
    test('should get all participants', () => {
      const owner: Participant = {
        id: ownerId,
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

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

      quizSession.addParticipant(owner);
      quizSession.addParticipant(p1);
      quizSession.addParticipant(p2);

      const allParticipants = quizSession.getAllParticipants();
      expect(allParticipants).toHaveLength(3);
      const allParticipantsId = allParticipants.map(p => p.id)
      expect(allParticipantsId).toContain(ownerId);
      expect(allParticipantsId).toContain('p1');
      expect(allParticipantsId).toContain('p2');
    });

    test('should get participant by ID', () => {
      const participant: Participant = {
        id: 'testId',
        username: 'TestUser',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(participant);

      const retrieved = quizSession.getParticipantById('testId');
      expect(retrieved).toBeDefined();
      expect(retrieved?.username).toBe('TestUser');
    });

    test('should return undefined for non-existent participant', () => {
      const retrieved = quizSession.getParticipantById('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    test('should return empty array when no participants', () => {
      const participants = quizSession.getAllParticipants();
      expect(participants).toEqual([]);
    });
  });

  describe('Removing Participants', () => {
    test('should remove participant successfully', () => {
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
      expect(quizSession.participants.size).toBe(1);

      quizSession.removeParticipant('p1');
      expect(quizSession.participants.size).toBe(0);
      expect(quizSession.participants.has('p1')).toBe(false);
    });

    test('should update participant count after removal', () => {
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

      quizSession.addParticipant(p1);
      quizSession.addParticipant(p2);
      expect(quizSession.getParticipantCount()).toBe(2);

      quizSession.removeParticipant('p1');
      expect(quizSession.getParticipantCount()).toBe(1);
    });

    test('should handle removing non-existent participant gracefully', () => {
      expect(() => quizSession.removeParticipant('nonexistent')).not.toThrow();
      expect(quizSession.participants.size).toBe(0);
    });
  });

  describe('Active vs Inactive Participants', () => {
    test('should track active participants', () => {
      const active: Participant = {
        id: 'active1',
        username: 'Active',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const inactive: Participant = {
        id: 'inactive1',
        username: 'Inactive',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: false
      };

      quizSession.addParticipant(active);
      quizSession.addParticipant(inactive);

      const activeParticipants = quizSession.getActiveParticipants();
      expect(activeParticipants).toHaveLength(1);
      expect(activeParticipants[0].id).toBe('active1');
    });

    test('should count only active participants', () => {
      const active1: Participant = {
        id: 'a1',
        username: 'Active1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const active2: Participant = {
        id: 'a2',
        username: 'Active2',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const inactive: Participant = {
        id: 'i1',
        username: 'Inactive',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: false
      };

      quizSession.addParticipant(active1);
      quizSession.addParticipant(active2);
      quizSession.addParticipant(inactive);

      expect(quizSession.getActiveParticipantCount()).toBe(2);
    });

    test('should update participant active status', () => {
      const participant: Participant = {
        id: 'p1',
        username: 'User1',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(participant);
      expect(quizSession.participants.get('p1')?.isActive).toBe(true);

      // Manually update for now (later will be handled by connection manager)
      const updated = quizSession.participants.get('p1');
      if (updated) {
        updated.isActive = false;
      }

      expect(quizSession.participants.get('p1')?.isActive).toBe(false);
    });
  });

  describe('Participant List Display', () => {
    test('should show all participants with owner badge', () => {
      const owner: Participant = {
        id: ownerId,
        username: 'OwnerUser',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      const regular: Participant = {
        id: 'regular1',
        username: 'RegularUser',
        connection: null,
        isOwner: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

      quizSession.addParticipant(owner);
      quizSession.addParticipant(regular);

      const participants = quizSession.getAllParticipants();
      const ownerInList = participants.find(p => p.isOwner);
      const regularInList = participants.find(p => !p.isOwner);

      expect(ownerInList).toBeDefined();
      expect(ownerInList?.username).toBe('OwnerUser');
      expect(regularInList).toBeDefined();
      expect(regularInList?.username).toBe('RegularUser');
    });
  });

  describe('Session State with Multiple Participants', () => {
    test('should include all participants in session state', () => {
      const owner: Participant = {
        id: ownerId,
        username: 'Owner',
        connection: null,
        isOwner: true,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      };

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

      quizSession.addParticipant(owner);
      quizSession.addParticipant(p1);
      quizSession.addParticipant(p2);

      const state = quizSession.getState();
      expect(state.participants.size).toBe(3);
      expect(state.participants.has(ownerId)).toBe(true);
      expect(state.participants.has('p1')).toBe(true);
      expect(state.participants.has('p2')).toBe(true);
    });
  });
});
