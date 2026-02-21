import type { ParticipantInfo } from '../../shared/types';

interface ParticipantListProps {
  participants: ParticipantInfo[];
}

export function ParticipantList({ participants }: ParticipantListProps) {
  return (
    <div className="bg-white p-5 rounded-[20px] shadow-card mb-5">
      <h3 className="mt-0 mb-4 text-gray-800 text-lg font-bold">Participants</h3>
      <ul className="list-none p-0 m-0">
        {participants.map((p) => (
          <li key={p.id} className="py-3 border-b border-gray-100 text-gray-600 font-medium text-[15px] last:border-b-0">
            {p.username || `${p.id.slice(0, 8)}`}
            {p.isOwner && (
              <span className="ml-2 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white py-1.5 px-3 rounded-xl text-xs font-semibold shadow-emerald">
                Owner
              </span>
            )}
            {!p.isActive && <span className="text-gray-400 italic"> (offline)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
