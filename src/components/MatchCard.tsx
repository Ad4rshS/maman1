import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Clock, Info } from 'lucide-react';
import { Match } from '../types';
import { cn } from '../lib/utils';
import { fetchLiveScore } from '../services/geminiService';
import { getTeamLogo } from '../services/fallbackData';

interface MatchCardProps {
  match: Match;
  onClick: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onClick }) => {
  const formatMatchDate = (dateStr: string) => {
    if (!dateStr) return "TBD";
    const matchDate = new Date(dateStr);
    
    if (isNaN(matchDate.getTime())) {
      // Try parsing common formats if simple New Date fails
      return "Upcoming";
    }

    const now = new Date();
    const isToday = matchDate.toDateString() === now.toDateString();
    
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = matchDate.toDateString() === tomorrow.toDateString();
    
    const timeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    
    return matchDate.toLocaleDateString([], { day: 'numeric', month: 'short' }) + `, ${timeStr}`;
  };

  const [timeLeft, setTimeLeft] = React.useState<string>("Scheduled");
  const [showCountdown, setShowCountdown] = React.useState<boolean>(false);
  const [liveScore, setLiveScore] = React.useState<any>(null);
  const [isMatchStarted, setIsMatchStarted] = React.useState<boolean>(false);
  const [isTossVisible, setIsTossVisible] = React.useState<boolean>(false);
  const ONE_HOUR = 60 * 60 * 1000;
  const FIVE_MINUTES = 5 * 60 * 1000;

  React.useEffect(() => {
    // Only call fetchLiveScore if match.liveScore is missing and match is live
    if ((match.status === 'live' || isMatchStarted) && !match.liveScore) {
      const getScore = async () => {
        const score = await fetchLiveScore(match.id, match.team1, match.team2);
        if (score) setLiveScore(score);
      };
      getScore();
      const interval = setInterval(getScore, 30000);
      return () => clearInterval(interval);
    } else if (match.liveScore) {
      setLiveScore(match.liveScore);
    }
  }, [match.id, match.status, match.team1, match.team2, match.liveScore, isMatchStarted]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (!match.date) {
        setTimeLeft("Scheduled");
        setIsMatchStarted(false);
        setIsTossVisible(false);
        return;
      }
      const matchTime = new Date(match.date).getTime();
      const now = new Date().getTime();
      
      if (isNaN(matchTime)) {
        setTimeLeft("Scheduled");
        setIsMatchStarted(false);
        setIsTossVisible(false);
        return;
      }

      const diff = matchTime - now;
      
      // Toss visible before match AND up to 5 mins after match start
      const tossVisibilityEnd = matchTime + FIVE_MINUTES;
      setIsTossVisible(now < tossVisibilityEnd && !!match.toss);

      if (diff <= 0) {
        setTimeLeft("LIVE");
        setShowCountdown(false);
        setIsMatchStarted(true);
        return;
      }
      
      setIsMatchStarted(false);
      setShowCountdown(diff <= ONE_HOUR);

      const totalMins = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const secs = Math.floor((diff / 1000) % 60);
      
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      } else {
        setTimeLeft(`${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [match.date, match.toss]);

  const matchDateFormatted = formatMatchDate(match.date);

  const displayStatus = match.status === 'live' || isMatchStarted ? 'live' : match.status;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-dark-card border border-dark-border rounded-xl overflow-hidden card-shadow cursor-pointer hover:border-brand-red/50 transition-colors"
    >
      {/* Match Header */}
      <div className="px-4 py-2 bg-white/5 border-b border-dark-border flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{match.series}</span>
        <div className="flex items-center gap-2">
           <Info className="w-3.5 h-3.5 text-gray-500" />
        </div>
      </div>

      {/* Match Body */}
      <div className="p-4 py-6 flex items-center justify-between">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
             <img src={getTeamLogo(match.team1, match.team1Logo)} alt={match.team1} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" />
          </div>
          <span className="font-bold text-sm tracking-tighter">{match.team1}</span>
        </div>

        <div className="flex flex-col items-center gap-1 min-w-[110px]">
          {displayStatus === 'live' ? (
            <div className="flex flex-col items-center gap-1">
              <div className="bg-brand-red/10 border border-brand-red/20 px-3 py-1 rounded-full mt-1">
                <span className="text-brand-red text-[10px] font-black uppercase tracking-tight">
                  {liveScore ? (liveScore.score1 || liveScore.score2 || 'In Progress') : 'In Progress'}
                </span>
              </div>
              {isTossVisible && match.toss && (
                <p className="text-[7px] font-bold text-brand-red italic text-center mt-2 px-2 py-0.5 rounded-full border border-brand-red/10 bg-brand-red/5">
                  {match.toss.winner} CHOSE TO {match.toss.decision}
                </p>
              )}
            </div>
          ) : match.status === 'completed' ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-gray-500 text-xs font-black uppercase tracking-tighter text-center">Finished</span>
              <span className="text-gray-700 text-[8px] font-bold tracking-widest uppercase mt-1">Final Result</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {showCountdown && (
                <div className="flex items-center gap-1.5 mb-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                   <span className="text-brand-red font-black text-[9px] uppercase tracking-wider">Starts in</span>
                </div>
              )}
              <span className="text-white text-xs font-black uppercase tracking-tighter text-center font-mono">{showCountdown ? timeLeft : "UPCOMING"}</span>
              <span className="text-gray-500 text-[8px] font-bold tracking-widest uppercase mt-0.5">{matchDateFormatted}</span>
              {isTossVisible && match.toss && (
                <div className="mt-1.5 flex flex-col items-center">
                  <div className="h-px w-8 bg-white/10 mb-1" />
                  <p className="text-[7px] font-bold text-brand-red italic text-center leading-tight uppercase tracking-tighter bg-brand-red/5 px-2 py-0.5 rounded-full border border-brand-red/10">
                    {match.toss.winner} CHOSE TO {match.toss.decision}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 flex-1">
           <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
             <img src={getTeamLogo(match.team2, match.team2Logo)} alt={match.team2} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" />
          </div>
          <span className="font-bold text-sm">{match.team2}</span>
        </div>
      </div>

      {/* Match Footer */}
      <div className="px-4 py-2.5 bg-black/20 flex items-center justify-between text-[10px] text-gray-400 font-medium">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{match.venue.split(',')[0]}</span>
        </div>
        <div className="flex items-center gap-4">
          {match.lineupsOut && !isMatchStarted && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-500 font-bold uppercase tracking-tighter">Lineups Out</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MatchCard;
