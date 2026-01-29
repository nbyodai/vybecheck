import type { MatchResult } from '../../shared/types';

interface MatchCardProps {
  match: MatchResult;
  rank: number;
}

export function MatchCard({ match, rank }: MatchCardProps) {
  return (
    <div className="match-card">
      <span className="match-rank">#{rank}</span>
      <span className="match-name">
        {match.username || `${match.participantId.slice(0, 8)}`}
      </span>
      <span className="match-percentage">
        {match.matchPercentage.toFixed(1)}%
      </span>
    </div>
  );
}
