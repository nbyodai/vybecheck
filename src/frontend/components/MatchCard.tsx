import type { MatchResult } from '../../shared/types';

interface MatchCardProps {
  match: MatchResult;
  rank: number;
}

export function MatchCard({ match, rank }: MatchCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 mb-3 flex items-center gap-4 shadow-card-sm transition-all active:scale-[0.98]">
      <span className="font-bold text-vybe-blue min-w-[32px] text-lg">#{rank}</span>
      <span className="flex-1 text-gray-800 font-medium">
        {match.username || `${match.participantId.slice(0, 8)}`}
      </span>
      <span className="font-bold text-emerald-500 text-[15px]">
        {match.matchPercentage.toFixed(1)}%
      </span>
    </div>
  );
}
