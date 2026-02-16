import { useEffect, useState } from 'react';
import { useWebSocketStore } from '../store/websocketStore';

interface VerifyResult {
  paid: boolean;
  vybes?: number;
  credited?: boolean;
}

export function PurchaseSuccess() {
  const { send } = useWebSocketStore();
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Get session_id from URL
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
      verifyPurchase(sessionId);
    } else {
      setIsVerifying(false);
    }
  }, []);

  const verifyPurchase = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
      const data = await response.json();
      setVerifyResult(data);
      
      // If credited, refresh balance via WebSocket
      if (data.credited) {
        send({ type: 'credits:balance' });
      }
    } catch (err) {
      console.error('Verify error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = () => {
    // Navigate back to app (remove query params)
    window.location.href = '/';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#1F2937' }}>
          Purchase Successful!
        </h1>
        
        {isVerifying ? (
          <p style={{ color: '#6B7280', fontSize: '16px', marginBottom: '24px' }}>
            Verifying your purchase...
          </p>
        ) : verifyResult?.paid ? (
          <p style={{ color: '#6B7280', fontSize: '16px', marginBottom: '24px' }}>
            {verifyResult.vybes ? `${verifyResult.vybes} Vybes` : 'Your Vybes'} have been added to your account.
          </p>
        ) : (
          <p style={{ color: '#6B7280', fontSize: '16px', marginBottom: '24px' }}>
            Your payment was received. Vybes will be credited shortly.
          </p>
        )}

        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Continue to App
        </button>
      </div>
    </div>
  );
}
