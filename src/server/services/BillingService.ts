import type { VybeLedger } from '../models/VybeLedger';
import type { ParticipantUnlockManager } from '../models/ParticipantUnlock';
import type { UnlockableFeature, TransactionReason, LedgerEntry } from '../../shared/types';

/**
 * BillingService - Core monetization service
 *
 * Orchestrates purchases, balance checks, and access verification.
 * Implements idempotent purchase logic (no double-charging).
 */
export class BillingService {
  private vybeLedger: VybeLedger;
  private participantUnlock: ParticipantUnlockManager;

  constructor(
    vybeLedger: VybeLedger,
    participantUnlock: ParticipantUnlockManager
  ) {
    this.vybeLedger = vybeLedger;
    this.participantUnlock = participantUnlock;
  }

  /**
   * Add Vybes to a participant's balance (convenience method)
   * @param params - Transaction parameters
   */
  addVybes(params: {
    participantId: string;
    amount: number;
    reason: TransactionReason;
  }): LedgerEntry {
    return this.vybeLedger.addVybes(params);
  }

  /**
   * Get transaction history for a participant
   * @param participantId - Participant ID
   * @returns Array of ledger entries
   */
  getTransactionHistory(participantId: string): LedgerEntry[] {
    return this.vybeLedger.getTransactionHistory(participantId);
  }

  /**
   * Check if participant has access to a feature
   * @param params - Access check parameters
   * @returns True if participant has access
   */
  hasFeatureAccess(params: {
    participantId: string;
    resourceId: string;
    feature: UnlockableFeature;
  }): boolean {
    return this.participantUnlock.hasFeatureAccess(params);
  }

  /**
   * Purchase or verify access to a feature
   * Idempotent: Will not charge twice for the same feature
   *
   * @param params - Purchase parameters
   * @returns Promise<true> if access granted (purchased or already owned)
   * @throws Error if insufficient balance
   */
  async purchaseOrVerifyAccess(params: {
    participantId: string;
    resourceId: string;
    feature: UnlockableFeature;
    cost: number;
  }): Promise<boolean> {
    const { participantId, resourceId, feature, cost } = params;

    // Check if already unlocked (idempotent)
    const alreadyHasAccess = this.participantUnlock.hasFeatureAccess({
      participantId,
      resourceId,
      feature,
    });

    if (alreadyHasAccess) {
      return true; // Already have access
    }

    // Free feature (cost = 0)
    if (cost === 0) {
      this.participantUnlock.unlockFeature({
        participantId,
        resourceId,
        feature,
      });
      return true;
    }

    // Check sufficient balance
    const hasSufficientBalance = this.vybeLedger.hasSufficientBalance({
      participantId,
      amount: cost,
    });

    if (!hasSufficientBalance) {
      throw new Error('Insufficient Vybes');
    }

    // Deduct Vybes
    const reason = this.getTransactionReason(feature);
    this.vybeLedger.deductVybes({
      participantId,
      amount: cost,
      reason,
    });

    // Unlock feature
    this.participantUnlock.unlockFeature({
      participantId,
      resourceId,
      feature,
    });

    return true; // Purchase successful
  }

  /**
   * Get transaction reason based on feature
   */
  private getTransactionReason(
    feature: UnlockableFeature
  ): TransactionReason {
    switch (feature) {
      case 'MATCH_TOP3':
        return 'UNLOCK_MATCH_TOP3';
      case 'MATCH_ALL':
        return 'UNLOCK_MATCH_ALL';
      case 'QUESTION_LIMIT_10':
        return 'UNLOCK_QUESTION_LIMIT';
      default:
        return 'UNLOCK_MATCH_TOP3'; // Default fallback
    }
  }

  /**
   * Get current balance for a participant
   */
  getBalance(participantId: string): number {
    return this.vybeLedger.getBalance(participantId);
  }
}
