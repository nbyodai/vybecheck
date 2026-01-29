import { useQuizStore } from '../store/quizStore';
import { ParticipantList } from '../components/ParticipantList';

export function LobbyPage() {
  const { sessionId, quizState } = useQuizStore();

  if (!quizState) {
    return (
      <div className="page-content">
        <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px 20px' }}>
          Loading lobby...
        </p>
      </div>
    );
  }

  // Get owner info
  const ownerInfo = quizState.participants.find(p => p.id === quizState.ownerId);
  const ownerName = ownerInfo?.username || ownerInfo?.id.slice(0, 8) || 'Unknown';

  return (
    <div className="page-content">
      <div style={{ background: 'white', padding: '20px', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>Session Info</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>Session ID</span>
            <span style={{ color: '#1F2937', fontWeight: '600', fontFamily: 'monospace' }}>{sessionId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>Owner</span>
            <span style={{ color: '#1F2937', fontWeight: '600' }}>{ownerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>Status</span>
            <span style={{
              color: quizState.status === 'live' ? '#10B981' : quizState.status === 'active' ? '#F59E0B' : '#6B7280',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {quizState.status}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280', fontWeight: '500' }}>Questions</span>
            <span style={{ color: '#1F2937', fontWeight: '600' }}>{quizState.questions.length}</span>
          </div>
        </div>
      </div>

      <ParticipantList participants={quizState.participants} />
    </div>
  );
}
