import type { ParticipantInfo } from '../../shared/types';

interface ParticipantListProps {
  participants: ParticipantInfo[];
}

export function ParticipantList({ participants }: ParticipantListProps) {
  return (
    <div className="participants-section">
      <h3>Participants</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.id}>
            {p.username || `${p.id.slice(0, 8)}`}
            {p.isOwner && <span className="badge">Owner</span>}
            {!p.isActive && <span className="inactive"> (offline)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
