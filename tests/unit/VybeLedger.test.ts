import { describe, it, expect, beforeEach } from 'vitest';
import { VybeLedger } from '../../src/server/models/VybeLedger';
import type { LedgerEntry, TransactionReason } from '../../src/shared/types';

describe('VybeLedger', () => {
  let ledger: VybeLedger;

  beforeEach(() => {
    ledger = new VybeLedger();
  });

  describe('Transaction Management', () => {
    it('should add a positive transaction (purchase Vybes)', () => {
      const participantId = 'participant-123';
      const entry = ledger.addTransaction(participantId, 50, 'PURCHASE_VYBES');

      expect(entry.participantId).toBe(participantId);
      expect(entry.amount).toBe(50);
      expect(entry.reason).toBe('PURCHASE_VYBES');
      expect(entry.id).toBeDefined();
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it('should add a negative transaction (spend Vybes)', () => {
      const participantId = 'participant-123';
      const entry = ledger.addTransaction(participantId, -5, 'UNLOCK_MATCH_TOP3');

      expect(entry.participantId).toBe(participantId);
      expect(entry.amount).toBe(-5);
      expect(entry.reason).toBe('UNLOCK_MATCH_TOP3');
      expect(entry.id).toBeDefined();
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique transaction IDs', () => {
      const participantId = 'participant-123';
      const entry1 = ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');
      const entry2 = ledger.addTransaction(participantId, 20, 'PURCHASE_VYBES');

      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should record transaction timestamp', () => {
      const participantId = 'participant-123';
      const before = Date.now();
      const entry = ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');
      const after = Date.now();

      expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(entry.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('Balance Calculation', () => {
    it('should calculate balance with multiple transactions', () => {
      const participantId = 'participant-123';
      
      ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');
      ledger.addTransaction(participantId, 20, 'PURCHASE_VYBES');
      ledger.addTransaction(participantId, -5, 'UNLOCK_MATCH_TOP3');
      ledger.addTransaction(participantId, -3, 'UNLOCK_QUESTION_LIMIT');

      const balance = ledger.getBalance(participantId);
      expect(balance).toBe(22); // 10 + 20 - 5 - 3
    });

    it('should calculate balance with empty ledger (should be 0)', () => {
      const participantId = 'participant-new';
      const balance = ledger.getBalance(participantId);
      
      expect(balance).toBe(0);
    });

    it('should calculate balance for specific participantId only', () => {
      ledger.addTransaction('participant-1', 10, 'INITIAL_VYBES');
      ledger.addTransaction('participant-2', 20, 'INITIAL_VYBES');
      ledger.addTransaction('participant-1', -5, 'UNLOCK_MATCH_TOP3');

      const balance1 = ledger.getBalance('participant-1');
      const balance2 = ledger.getBalance('participant-2');

      expect(balance1).toBe(5);
      expect(balance2).toBe(20);
    });

    it('should handle only positive transactions', () => {
      const participantId = 'participant-123';
      
      ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');
      ledger.addTransaction(participantId, 20, 'PURCHASE_VYBES');
      ledger.addTransaction(participantId, 15, 'PURCHASE_VYBES');

      const balance = ledger.getBalance(participantId);
      expect(balance).toBe(45);
    });

    it('should handle only negative transactions', () => {
      const participantId = 'participant-123';
      
      ledger.addTransaction(participantId, -2, 'UNLOCK_MATCH_TOP3');
      ledger.addTransaction(participantId, -5, 'UNLOCK_MATCH_ALL');
      ledger.addTransaction(participantId, -3, 'UNLOCK_QUESTION_LIMIT');

      const balance = ledger.getBalance(participantId);
      expect(balance).toBe(-10);
    });

    it('should handle zero-amount transactions', () => {
      const participantId = 'participant-123';
      
      ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');
      ledger.addTransaction(participantId, 0, 'PURCHASE_VYBES');

      const balance = ledger.getBalance(participantId);
      expect(balance).toBe(10);
    });
  });

  describe('Transaction History', () => {
    it('should get transaction history sorted by date (newest first)', () => {
      const participantId = 'participant-123';
      
      const entry1 = ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');
      // Small delay to ensure different timestamps
      const entry2 = ledger.addTransaction(participantId, 20, 'PURCHASE_VYBES');
      const entry3 = ledger.addTransaction(participantId, -5, 'UNLOCK_MATCH_TOP3');

      const history = ledger.getTransactionHistory(participantId);

      expect(history).toHaveLength(3);
      expect(history[0].id).toBe(entry3.id); // newest first
      expect(history[1].id).toBe(entry2.id);
      expect(history[2].id).toBe(entry1.id); // oldest last
    });

    it('should return empty array for participant with no transactions', () => {
      const history = ledger.getTransactionHistory('participant-new');
      
      expect(history).toEqual([]);
    });

    it('should filter transactions by participantId', () => {
      ledger.addTransaction('participant-1', 10, 'INITIAL_VYBES');
      ledger.addTransaction('participant-2', 20, 'INITIAL_VYBES');
      ledger.addTransaction('participant-1', -5, 'UNLOCK_MATCH_TOP3');

      const history1 = ledger.getTransactionHistory('participant-1');
      const history2 = ledger.getTransactionHistory('participant-2');

      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(1);
    });

    it('should filter transactions by reason', () => {
      const participantId = 'participant-123';
      
      ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');
      ledger.addTransaction(participantId, 20, 'PURCHASE_VYBES');
      ledger.addTransaction(participantId, -5, 'UNLOCK_MATCH_TOP3');
      ledger.addTransaction(participantId, 30, 'PURCHASE_VYBES');

      const purchaseHistory = ledger.getTransactionsByReason(participantId, 'PURCHASE_VYBES');

      expect(purchaseHistory).toHaveLength(2);
      expect(purchaseHistory[0].amount).toBe(30);
      expect(purchaseHistory[1].amount).toBe(20);
    });

    it('should return empty array when filtering by reason with no matches', () => {
      const participantId = 'participant-123';
      
      ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');

      const unlockHistory = ledger.getTransactionsByReason(participantId, 'UNLOCK_MATCH_TOP3');

      expect(unlockHistory).toEqual([]);
    });
  });

  describe('Multiple Participants', () => {
    it('should handle transactions for multiple participants independently', () => {
      ledger.addTransaction('participant-1', 10, 'INITIAL_VYBES');
      ledger.addTransaction('participant-2', 20, 'INITIAL_VYBES');
      ledger.addTransaction('participant-3', 30, 'INITIAL_VYBES');

      expect(ledger.getBalance('participant-1')).toBe(10);
      expect(ledger.getBalance('participant-2')).toBe(20);
      expect(ledger.getBalance('participant-3')).toBe(30);
    });

    it('should get all transactions across all participants', () => {
      ledger.addTransaction('participant-1', 10, 'INITIAL_VYBES');
      ledger.addTransaction('participant-2', 20, 'INITIAL_VYBES');
      ledger.addTransaction('participant-1', -5, 'UNLOCK_MATCH_TOP3');

      const allTransactions = ledger.getAllTransactions();

      expect(allTransactions).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent inserts (race condition test)', () => {
      const participantId = 'participant-123';
      const transactions: LedgerEntry[] = [];

      // Simulate concurrent inserts
      for (let i = 0; i < 100; i++) {
        transactions.push(ledger.addTransaction(participantId, 1, 'PURCHASE_VYBES'));
      }

      // All transaction IDs should be unique
      const ids = new Set(transactions.map(t => t.id));
      expect(ids.size).toBe(100);

      // Balance should be accurate
      const balance = ledger.getBalance(participantId);
      expect(balance).toBe(100);
    });

    it('should handle large transaction amounts', () => {
      const participantId = 'participant-123';
      
      ledger.addTransaction(participantId, 1000000, 'PURCHASE_VYBES');
      ledger.addTransaction(participantId, -500000, 'UNLOCK_MATCH_ALL');

      const balance = ledger.getBalance(participantId);
      expect(balance).toBe(500000);
    });

    it('should handle initial Vybe grant (INITIAL_VYBES reason)', () => {
      const participantId = 'participant-new';
      
      const entry = ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');

      expect(entry.reason).toBe('INITIAL_VYBES');
      expect(entry.amount).toBe(10);
      expect(ledger.getBalance(participantId)).toBe(10);
    });

    it('should maintain transaction order with same timestamp', () => {
      const participantId = 'participant-123';
      
      // Add multiple transactions rapidly
      const entry1 = ledger.addTransaction(participantId, 10, 'INITIAL_VYBES');
      const entry2 = ledger.addTransaction(participantId, 20, 'PURCHASE_VYBES');
      const entry3 = ledger.addTransaction(participantId, 30, 'PURCHASE_VYBES');

      const history = ledger.getTransactionHistory(participantId);

      // Should maintain insertion order even if timestamps are identical
      expect(history).toHaveLength(3);
      expect(history[0].id).toBe(entry3.id);
      expect(history[1].id).toBe(entry2.id);
      expect(history[2].id).toBe(entry1.id);
    });
  });
});
