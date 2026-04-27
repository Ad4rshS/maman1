import React from 'react';
import { Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Match } from '../types';
import MatchCard from './MatchCard';

interface MatchListProps {
  onMatchSelect: (match: Match) => void;
}

export default function MatchList({ onMatchSelect }: MatchListProps) {
  const { matches, refreshData, loading } = useApp();

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">IPL 2026 Fixtures</h2>
        <button 
          onClick={refreshData}
          className="text-xs text-brand-red font-medium flex items-center gap-1"
        >
          {loading ? 'Updating...' : 'Refresh'}
        </button>
      </div>
      
      {liveMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pl-1">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
             <h3 className="text-[10px] font-black text-brand-red uppercase tracking-[0.2em]">Live Matches</h3>
          </div>
          {liveMatches.map((match) => (
            <MatchCard key={match.id} match={match} onClick={() => onMatchSelect(match)} />
          ))}
        </div>
      )}

      {upcomingMatches.length > 0 && (
        <div className="space-y-3">
          {liveMatches.length > 0 && <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] pl-1 pt-2">Upcoming</h3>}
          {upcomingMatches.map((match) => (
            <MatchCard key={match.id} match={match} onClick={() => onMatchSelect(match)} />
          ))}
        </div>
      )}

      {matches.length === 0 && !loading && (
        <div className="p-12 text-center bg-dark-card border border-dashed border-dark-border rounded-2xl opacity-50">
          <p className="text-xs font-bold italic text-gray-600">No matches scheduled at the moment.</p>
        </div>
      )}

      {/* Banner */}
      <div className="dream11-gradient rounded-xl p-4 mt-6 overflow-hidden relative shadow-lg">
        <div className="relative z-10">
          <h3 className="font-display font-bold text-lg mb-1 italic">FREE PRIVATE LEAGUES</h3>
          <p className="text-xs text-white/80 max-w-[200px]">Create your own league and challenge your friends for free!</p>
          <button 
            onClick={() => {
              if (matches.length > 0) {
                onMatchSelect(matches[0]);
              } else {
                alert("No upcoming matches to create leagues for yet.");
              }
            }}
            className="mt-3 bg-white text-brand-red px-4 py-1.5 rounded-full text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-transform"
          >
            CREATE NOW
          </button>
        </div>
        <div className="absolute right-[-20px] top-0 bottom-0 flex items-center opacity-20">
          <svg viewBox="0 0 24 24" className="w-32 h-32 text-white fill-current">
            <path d="M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z M12,7 L8,11 L8,21 L11,21 L11,15 L13,15 L13,21 L16,21 L16,11 L12,7 Z M17,5 L19,5 L19,16 L17,16 Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
