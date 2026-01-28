import type { VybeLedger } from '../models/VybeLedger';
import type { ParticipantUnlockManager } from '../models/ParticipantUnlock';
import type { QuotaManager } from '../models/QuotaManager';
import type { UnlockableFeature, TransactionReason, LedgerEntry } from '../../shared/types';

export interface PurchaseResult {
  granted: boolean;
  charged: boolean;
  balance: number;
  error?: 'INSUFFICIENT_VYBES' | 'PERMISSION_DENIED' | 'NOT_OWNER' | 'UNKNOWN';
}

/**
 * BillingService - Core monetization service
 *
 * Orchestrates purchases, balance checks, and access verification.
 * Implements idempotent purchase logic (no double-charging).
 */
export class BillingService {
  private vybeLedger: VybeLedger;
  private participantUnlock: ParticipantUnlockManager;
  private quotaManager?: QuotaManager;

  constructor(params: {
    vybeLedger: VybeLedger;
    participantUnlock: ParticipantUnlockManager;
    quotaManager?: QuotaManager;
  }) {
    this.vybeLedger = params.vybeLedger;
    this.participantUnlock = params.participantUnlock;
    this.quotaManager = params.quotaManager;
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
   * @returns PurchaseResult with grant status, charge status, and balance
   */
  purchaseOrVerifyAccess(params: {
    participantId: string;
    resourceId: string;
    feature: UnlockableFeature;
    cost: number;
    isOwner?: boolean; // Optional, required for QUESTION_LIMIT_10
  }): PurchaseResult {
    const { participantId, resourceId, feature, cost, isOwner } = params;

    // For QUESTION_LIMIT_10, validate ownership
    if (feature === 'QUESTION_LIMIT_10') {
      if (isOwner === undefined || !isOwner) {
        return {
          granted: false,
          charged: false,
          balance: this.vybeLedger.getBalance(participantId),
          error: 'NOT_OWNER',
        };
      }
    }

    // Check if already unlocked (idempotent)
    const alreadyHasAccess = this.participantUnlock.hasFeatureAccess({
      participantId,
      resourceId,
      feature,
    });

    if (alreadyHasAccess) {
      return {
        granted: true,
        charged: false,
        balance: this.vybeLedger.getBalance(participantId),
      };
    }

    // Free feature (cost = 0)
    if (cost === 0) {
      this.participantUnlock.unlockFeature({
        participantId,
        resourceId,
        feature,
      });
      return {
        granted: true,
        charged: false,
        balance: this.vybeLedger.getBalance(participantId),
      };
    }

    // Check sufficient balance
    const hasSufficientBalance = this.vybeLedger.hasSufficientBalance({
      participantId,
      amount: cost,
    });

    if (!hasSufficientBalance) {
      return {
        granted: false,
        charged: false,
        balance: this.vybeLedger.getBalance(participantId),
        error: 'INSUFFICIENT_VYBES',
      };
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

    return {
      granted: true,
      charged: true,
      balance: this.vybeLedger.getBalance(participantId),
    };
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
