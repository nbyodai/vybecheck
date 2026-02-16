import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWebSocketStore } from '../store/websocketStore';
import { useQuizStore } from '../store/quizStore';
import type { LedgerEntry } from '../../shared/types';

// Transaction reason display names
const REASON_LABELS: Record<string, string> = {
  INITIAL_VYBES: 'Welcome Bonus',
  PURCHASE_VYBES: 'Purchased',
  UNLOCK_MATCH_TOP3: 'Unlocked Top 3 Matches',
  UNLOCK_MATCH_ALL: 'Unlocked All Matches',
  UNLOCK_QUESTION_LIMIT: 'Upgraded Question Limit',
};

// Pack IDs must match server-side StripeService VYBE_PACKS
const VYBE_PACKS = [
  { id: 'starter', name: 'Starter Pack', vybes: 20, price: 5, popular: false },
  { id: 'pro', name: 'Pro Pack', vybes: 50, price: 10, popular: true },
  { id: 'ultimate', name: 'Ultimate Pack', vybes: 120, price: 20, popular: false },
];

export function VybesPage() {
  const { vybesBalance, transactionHistory } = useAuthStore();
  const { send } = useWebSocketStore();
  const { participantId } = useQuizStore();
  const [showHistory, setShowHistory] = useState(false);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Request transaction history when showing
  useEffect(() => {
    if (showHistory) {
      send({ type: 'credits:history' });
    }
  }, [showHistory, send]);

  const handlePurchase = async (packId: string) => {
    if (!participantId) {
      setPurchaseError('Please join a session first to purchase Vybes');
      return;
    }

    setPurchasingPackId(packId);
    setPurchaseError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, participantId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Purchase error:', err);
      setPurchaseError(err.message || 'Failed to start checkout');
      setPurchasingPackId(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-content">
      {/* Balance Card */}
      <div style={{
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        padding: '24px',
        borderRadius: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
        color: 'white'
      }}>
        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Your Balance</div>
        <div style={{ fontSize: '36px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✨</span>
          <span>{vybesBalance}</span>
          <span style={{ fontSize: '20px', opacity: 0.8 }}>Vybes</span>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            marginTop: '12px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {/* TODO: Transaction History Component */}
      {showHistory && (
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '16px',
          marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>
            Transaction History
          </h3>
          {transactionHistory.length === 0 ? (
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>No transactions yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {transactionHistory.map((txn: LedgerEntry) => (
                <div
                  key={txn.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                      {REASON_LABELS[txn.reason] || txn.reason}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {formatDate(txn.createdAt)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: txn.amount > 0 ? '#10B981' : '#EF4444',
                  }}>
                    {txn.amount > 0 ? '+' : ''}{txn.amount} ✨
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Purchase Error */}
      {purchaseError && (
        <div style={{
          background: '#FEE2E2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#991B1B',
          fontSize: '14px',
        }}>
          {purchaseError}
        </div>
      )}

      {/* Vybe Packs */}
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>Buy Vybe Packs</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {VYBE_PACKS.map(pack => {
          const isPurchasing = purchasingPackId === pack.id;
          return (
            <div
              key={pack.id}
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '16px',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                border: pack.popular ? '2px solid #6366F1' : 'none',
                position: 'relative',
                opacity: isPurchasing ? 0.7 : 1,
              }}
            >
              {pack.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '20px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700'
                }}>
                  POPULAR
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', marginBottom: '4px' }}>
                    {pack.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>
                    ✨ {pack.vybes} Vybes
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', fontSize: '15px' }}
                  onClick={() => handlePurchase(pack.id)}
                  disabled={isPurchasing || purchasingPackId !== null}
                >
                  {isPurchasing ? 'Loading...' : `$${pack.price}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pricing Info */}
      <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>
          Unlock Pricing
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
            <span>Preview Matches</span>
            <span style={{ color: '#10B981', fontWeight: '600' }}>Free</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
            <span>Top 3 Matches</span>
            <span style={{ fontWeight: '600' }}>2 ✨</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
            <span>All Matches</span>
            <span style={{ fontWeight: '600' }}>5 ✨</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
            <span>Extended Questions (10)</span>
            <span style={{ fontWeight: '600' }}>3 ✨</span>
          </div>
        </div>
      </div>

      {/* What are Vybes? */}
      <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>
          What are Vybes?
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
          Vybes are used to unlock premium features like viewing detailed match results,
          accessing exclusive visualizations, and more. New participants receive 10 free Vybes!
        </p>
      </div>
    </div>
  );
}
