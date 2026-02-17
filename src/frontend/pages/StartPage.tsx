import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWebSocketStore } from '../store/websocketStore';
import { useUIStore } from '../store/uiStore';
import logo from '../assets/logo.png';

export function StartPage() {
  const { isSigningIn, signInWithTwitter } = useAuthStore();
  const { send } = useWebSocketStore();
  const { error, notification, showError, setActivePage } = useUIStore();

  const [joinSessionId, setJoinSessionId] = useState('');

  const handleSignIn = () => {
    signInWithTwitter();
    // After sign-in completes, user will be redirected to Lab via App.tsx routing
    // The activePage will default to 'lab' after sign-in
    setTimeout(() => {
      setActivePage('lab');
    }, 2100); // Slightly after the 2000ms mock sign-in delay
  };

  const joinSession = () => {
    if (!joinSessionId.trim()) {
      showError('Please enter a session ID');
      return;
    }
    send({ type: 'session:join', data: { sessionId: joinSessionId } });
  };

  return (
    <div className="start-screen">
      <img src={logo} alt="VybeCheck Logo" style={{ width: '120px', height: '120px', borderRadius: '24px' }} />
      <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#1F2937', marginBottom: '8px' }}>VybeCheck</h1>
      <p style={{ color: '#6B7280', marginBottom: '40px', fontSize: '16px' }}>Your vibes on real-time debates</p>
      {error && <div className="error">{error}</div>}
      {notification && <div className="notification">{notification}</div>}

      {/* Sign in section */}
      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="btn btn-twitter"
        style={{ width: '100%', maxWidth: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        {isSigningIn ? (
          <>
            <div className="spinner-small"></div>
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>Sign in with Twitter</span>
          </>
        )}
      </button>
      <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '12px', maxWidth: '320px', textAlign: 'center' }}>
        Sign in to create quizzes and view matches
      </p>

      <div className="separator">or join existing session</div>
      <div className="join-form" style={{ width: '100%', maxWidth: '320px' }}>
        <input
          type="text"
          placeholder="Enter Session ID"
          value={joinSessionId}
          onChange={(e) => setJoinSessionId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && joinSession()}
        />
        <button onClick={joinSession} className="btn btn-secondary">
          Join Session
        </button>
      </div>
      <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '12px', maxWidth: '320px', textAlign: 'center' }}>
        Join as a participant to answer questions
      </p>
    </div>
  );
}
