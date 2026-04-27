import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Share2, Info, Trophy, Users, Plus, Zap, Star } from 'lucide-react';
import { Match, UserTeam, Contest, Player } from '../types';
import { useApp } from '../context/AppContext';
import { fetchLiveScore as fetchGeminiScore } from '../services/geminiService';
import { fetchLiveScore as fetchApiScore, mapApiDataToMatchUpdate } from '../services/cricketApiService';
import { cn } from '../lib/utils';
import { getTeamLogo } from '../services/fallbackData';
import MatchScorecard from './live/MatchScorecard';
import MatchStats from './live/MatchStats';
import TeamPreview from './TeamPreview';

interface MatchDetailsProps {
  match: Match;
  onBack: () => void;
  onCreateTeam: () => void;
  onCreateContest: () => void;
  onEditTeam: (team: UserTeam) => void;
}

export default function MatchDetails({ match, onBack, onCreateTeam, onCreateContest, onEditTeam }: MatchDetailsProps) {
  const { contests, userTeams, user, joinContest, players, updateMatch, recalculateAllScores, updatePlayer, fetchMatchSquads, batchUpdatePlayers } = useApp();
  const [activeTab, setActiveTab] = useState<'contests' | 'my contests' | 'my teams' | 'stats' | 'leaderboard' | 'scorecard'>(
    match.status === 'live' || match.status === 'completed' ? 'leaderboard' : 'contests'
  );

  useEffect(() => {
    const unsub = fetchMatchSquads(match.id, match.team1, match.team2);
    return () => {
      unsub.then(fn => fn?.());
    };
  }, [match.id]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [previewTeam, setPreviewTeam] = useState<UserTeam | null>(null);
  const [showPointsNotify, setShowPointsNotify] = useState(false);

  const matchContests = contests.filter(c => c.matchId === match.id);
  const myContests = matchContests.filter(c => c.joinedUsers.includes(user?.uid || ''));
  const myTeams = userTeams.filter(t => t.matchId === match.id);
  const [liveScore, setLiveScore] = useState<any>(null);

  useEffect(() => {
    if (showPointsNotify) {
      const timer = setTimeout(() => setShowPointsNotify(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showPointsNotify]);

  const handleEditTeam = (team: UserTeam) => {
    if (isLocked) {
      setPreviewTeam(team);
    } else {
      onEditTeam(team);
    }
  };

  useEffect(() => {
    // Only call fetchLiveScore if match.status is live
    if (match.status === 'live') {
      const getScore = async () => {
        try {
          if (match.externalId) {
            const apiData = await fetchApiScore(match.externalId);
            const currentPlayers = players[match.id] || [];
            const { liveScore: updatedScore } = mapApiDataToMatchUpdate(apiData, currentPlayers);
            setLiveScore(updatedScore);
          } else {
            const score = await fetchGeminiScore(match.id, match.team1, match.team2);
            if (score) setLiveScore(score);
          }
        } catch (err) {
          console.error("Live score update failed:", err);
        }
      };
      
      getScore();
      const interval = setInterval(getScore, 60000); // UI local update every minute
      return () => clearInterval(interval);
    } else if (match.liveScore) {
      setLiveScore(match.liveScore);
    }
  }, [match.id, match.status, match.externalId]);

  // Handle cross-device "Points Updated" notification
  const [lastSeenPointsUpdate, setLastSeenPointsUpdate] = useState<number>(match.pointsUpdatedAt || 0);
  
  useEffect(() => {
    if (match.pointsUpdatedAt && match.pointsUpdatedAt > lastSeenPointsUpdate) {
      setLastSeenPointsUpdate(match.pointsUpdatedAt);
      setShowPointsNotify(true);
    }
  }, [match.pointsUpdatedAt, lastSeenPointsUpdate]);

  const handleCreateTeam = () => {
    if (!user) {
      alert("Please sign in to create a team!");
      return;
    }
    onCreateTeam();
  };

  const handleCreateContest = () => {
    if (!user) {
      alert("Please sign in to create a contest!");
      return;
    }
    onCreateContest();
  };

  const handleJoinContest = (contestId: string) => {
    if (!user) {
      alert("Please sign in to join a contest!");
      return;
    }
    if (myTeams.length === 0) {
      alert("You need to create a team first!");
      setActiveTab('my teams');
      return;
    }
    // Logic to select a team and then join
    // For now, let's just pick the first team if available, or ask the user
    if (myTeams.length === 1) {
      joinContest(contestId, myTeams[0].id);
    } else {
      // In a real app we'd show a modal to pick a team
      // For now let's just use the first one and inform
      alert("Joining with your first team: " + myTeams[0].name);
      joinContest(contestId, myTeams[0].id);
    }
  };

  const handleShareContest = (contest: Contest) => {
    const shareText = `Join my contest "${contest.name}" on MamanGam for the ${match.team1} vs ${match.team2} match! Code: ${contest.id}`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: 'MamanGam Contest Invitation',
        text: shareText,
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert("Contest invite copied to clipboard!");
    }
  };

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [isTossVisible, setIsTossVisible] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const matchTime = new Date(match.date).getTime();
      const now = Date.now();
      const diff = matchTime - now;
      const ONE_HOUR = 3600000;
      const FIVE_MINUTES = 300000;

      // Toss visibility: before match AND 5 mins after start
      const tossVisibilityEnd = matchTime + FIVE_MINUTES;
      setIsTossVisible(now < tossVisibilityEnd && !!match.toss);

      if (diff <= 0 || match.status === 'live' || match.status === 'completed') {
        setTimeLeft('LIVE');
        setIsLocked(true);
        setShowCountdown(false);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
        setIsLocked(false);
        setShowCountdown(diff <= ONE_HOUR);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [match.date, match.status, match.toss]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'contests':
        return (
          <div className="space-y-4">
            {/* Action Button Section */}
            {!isLocked && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button onClick={handleCreateTeam} className="bg-white/5 border border-white/10 hover:border-brand-red/50 p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                  <div className="w-10 h-10 rounded-full dream11-gradient flex items-center justify-center shadow-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Create Team</span>
                </button>
                <button onClick={handleCreateContest} className="bg-white/5 border border-white/10 hover:border-brand-red/50 p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Create Contest</span>
                </button>
              </div>
            )}

            {/* Private Contests Header */}
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {isLocked ? "Contest Leaderboards" : "Available Contests"}
              </h3>
            </div>

            {matchContests.length === 0 ? (
              <div className="bg-dark-card border border-dashed border-dark-border rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 opacity-80">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-600 fill-current">
                    <path d="M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z M12,7 L8,11 L8,21 L11,21 L11,15 L13,15 L13,21 L16,21 L16,11 L12,7 Z M17,5 L19,5 L19,16 L17,16 Z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold">No Private Contests Yet</h4>
                  <p className="text-[11px] text-gray-500 max-w-[200px]">Create a contest and invite your friends to start competing!</p>
                </div>
                <button onClick={handleCreateContest} className="bg-brand-red text-white text-[11px] font-bold px-6 py-2 rounded-full shadow-lg shadow-brand-red/20 uppercase tracking-wider mt-2">
                  CREATE CONTEST
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {matchContests.map(c => (
                  <div key={c.id} className="bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between">
                       <h4 className="font-bold text-xs text-white uppercase tracking-tight">{c.name}</h4>
                       <div className="flex items-center gap-2">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             handleShareContest(c);
                           }}
                           className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                         >
                           <Share2 className="w-3.5 h-3.5" />
                         </button>
                         <div className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded text-[9px] font-black uppercase">Free</div>
                       </div>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-[9px] text-gray-500 font-bold uppercase">Prize Pool</span>
                          <span className="text-[10px] font-bold text-white tracking-widest">BRAGGING RIGHTS</span>
                       </div>
                       <div className="flex flex-col text-right">
                          <span className="text-[9px] text-gray-400 font-bold uppercase">Spots</span>
                          <span className="text-[10px] font-bold text-white">{c.joinedUsers.length} / {c.capacity}</span>
                       </div>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-brand-red" style={{ width: `${(c.joinedUsers.length / c.capacity) * 100}%` }} />
                    </div>
                    {user && c.joinedUsers.includes(user.uid) ? (
                      <button 
                        onClick={() => setSelectedContest(c)}
                        className="w-full border border-green-500/30 bg-green-500/10 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-green-500"
                      >
                        {isLocked ? "View Leaderboard" : "Joined"}
                      </button>
                    ) : (
                      <button 
                        disabled={isLocked}
                        onClick={() => handleJoinContest(c.id)}
                        className={cn(
                          "w-full border border-white/10 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          isLocked ? "opacity-50 cursor-not-allowed bg-white/5" : "hover:border-brand-red bg-white/5"
                        )}
                      >
                        {isLocked ? "Entry Closed" : "Join with Team"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'my contests':
        return (
          <div className="space-y-4">
            {myContests.length === 0 ? (
              <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center flex flex-col items-center gap-3">
                 <svg viewBox="0 0 24 24" className="w-12 h-12 text-gray-700 fill-current">
                   <path d="M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z M12,7 L8,11 L8,21 L11,21 L11,15 L13,15 L13,21 L16,21 L16,11 L12,7 Z M17,5 L19,5 L19,16 L17,16 Z" />
                 </svg>
                 <p className="text-sm font-bold text-white">No joined contests</p>
                 <p className="text-[10px] text-gray-500 mb-2">Join a contest to see it here!</p>
                 <button onClick={() => setActiveTab('contests')} className="dream11-gradient px-6 py-2 rounded-full text-[10px] font-bold uppercase">View Contests</button>
              </div>
            ) : (
              myContests.map(c => (
                <div key={c.id} 
                  onClick={() => setSelectedContest(c)}
                  className="bg-dark-card border border-dark-border rounded-xl p-4 shadow-lg flex flex-col gap-2 cursor-pointer hover:border-white/20 transition-all"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold">{c.name}</span>
                    <span className="text-[9px] bg-green-500/20 text-green-500 px-1.5 rounded uppercase font-black tracking-tighter">Joined</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500 font-bold uppercase italic">Leaderboard Rank</span>
                    <span className="font-bold text-white tracking-widest">#1</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full mt-1">
                    <div className="h-full bg-brand-red w-full" />
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'my teams':
        return (
          <div className="space-y-4">
            {myTeams.length === 0 ? (
              <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center flex flex-col items-center gap-3">
                 <Plus className="w-10 h-10 text-gray-700" />
                 <p className="text-sm font-bold text-white">No teams created</p>
                 <p className="text-[10px] text-gray-500 mb-2">Create a team to participate in contents!</p>
                 <button onClick={handleCreateTeam} className="dream11-gradient px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-xl shadow-brand-red/20">Create Team</button>
              </div>
            ) : (
              myTeams.map(t => (
                <div key={t.id} className="bg-dark-card border border-dark-border rounded-xl overflow-hidden shadow-lg group active:scale-[0.99] transition-transform">
                  <div className="p-4 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex flex-col gap-1">
                       <h4 className="font-bold text-xs uppercase tracking-tight">{t.name}</h4>
                       <span className="text-[9px] text-gray-500 font-black tracking-widest">Created at {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-brand-orange/20 border-2 border-dark-bg flex items-center justify-center text-[10px] font-bold">C</div>
                      <div className="w-7 h-7 rounded-full bg-brand-red/20 border-2 border-dark-bg flex items-center justify-center text-[10px] font-bold">VC</div>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-white/[0.05] flex justify-between items-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase italic">Players in squad: {t.players.length} • Total Pts: {t.totalPoints || 0}</span>
                    <button 
                      onClick={() => handleEditTeam(t)}
                      className="text-[9px] font-black text-brand-red uppercase tracking-widest hover:underline px-2 py-1"
                    >
                      {isLocked ? 'View Team' : 'View/Edit'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'scorecard':
        return <MatchScorecard liveScore={liveScore} team1={match.team1} team2={match.team2} />;
      case 'stats':
        return <MatchStats players={players[match.id] || []} />;
      case 'leaderboard':
        const displayContest = matchContests[0];
        const participants = displayContest ? displayContest.joinedUsers : [];
        
        return (
          <div className="space-y-4 pb-24 text-white">
            <AnimatePresence>
              {showPointsNotify && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-green-600/10 border border-green-600/20 p-3 rounded-lg flex items-center justify-center gap-2 overflow-hidden"
                >
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-[10px] font-black text-green-500 uppercase tracking-widest text-center">Latest points available!</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center justify-between px-2 mb-2">
               <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none">Global Contest</span>
                  <span className="text-[11px] font-black italic mt-1 uppercase text-white">{displayContest?.name || 'Live Battle'}</span>
               </div>
               <div className="flex gap-4 items-center">
                  <div className="flex gap-12 items-end">
                     <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Points</span>
                     <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Rank</span>
                  </div>
               </div>
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden shadow-2xl divide-y divide-white/5">
              {participants.length > 0 ? (
                participants.sort((a, b) => {
                  const teamA = userTeams.find(t => t.id === displayContest.joinedTeamIds?.[a]);
                  const teamB = userTeams.find(t => t.id === displayContest.joinedTeamIds?.[b]);
                  return (teamB?.totalPoints || 0) - (teamA?.totalPoints || 0);
                }).map((uid, i) => {
                  const teamId = displayContest.joinedTeamIds?.[uid];
                  const team = userTeams.find(t => t.id === teamId);
                  const isMe = uid === user?.uid;
                  
                  return (
                    <div key={uid} className={cn(
                      "p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors relative",
                      isMe && "bg-brand-red/[0.05]"
                    )}>
                      {isMe && <div className="absolute left-0 inset-y-0 w-1 bg-brand-red" />}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                           {isMe && user?.photoURL ? (
                             <img src={user.photoURL} className="w-full h-full object-cover" alt="Me" />
                           ) : (
                             <Users className="w-6 h-6 text-gray-700" />
                           )}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-xs font-bold",
                            isMe ? "text-brand-red" : "text-white/90"
                          )}>
                            {isMe ? "YOU" : `Player_${uid.substring(0, 5).toUpperCase()}`}
                          </span>
                          <span className="text-[9px] text-gray-500 font-black tracking-tighter uppercase mt-0.5">
                            {team?.name || `TEAM T${i+1}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-12 text-right items-center">
                        <span className="text-sm font-display font-black italic text-white/90">
                          {team?.totalPoints?.toFixed(1) || "0.0"}
                        </span>
                        <span className={cn(
                          "text-xs font-black italic min-w-[30px]",
                          i === 0 ? "text-brand-orange" : i === 1 ? "text-gray-400" : i === 2 ? "text-brand-red" : "text-white/50"
                        )}>
                          #{i + 1}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                  <Trophy className="w-12 h-12 text-gray-800" />
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">No participants joined this contest yet</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      {/* Team Preview Overlay */}
      <AnimatePresence>
        {previewTeam && (
          <TeamPreview 
            players={(players[match.id] || []).filter(p => previewTeam.players.includes(p.id))}
            captainId={previewTeam.captainId}
            viceCaptainId={previewTeam.viceCaptainId}
            onClose={() => setPreviewTeam(null)}
            team1={match.team1}
            team2={match.team2}
          />
        )}
      </AnimatePresence>
      {/* Sticky Header */}
      <header className="p-4 px-3 flex items-center justify-between bg-black border-b border-white/5">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <h2 className="font-bold text-sm leading-tight text-white uppercase tracking-tight">
              {match.team1} <span className="text-gray-500 font-medium italic">vs</span> {match.team2}
            </h2>
            <div className="flex items-center gap-2">
               <span className="text-[9px] text-brand-red font-black tracking-widest uppercase">
                 {match.status === 'live' ? 'LIVE NOW' : 'UPCOMING'}
               </span>
               <span className="text-[10px] text-gray-500 font-bold">• {match.venue.split(',')[0]}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Share2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Professional Scoreboard Header */}
      <div className="bg-[#121212] p-6 py-8 relative overflow-hidden flex flex-col items-center justify-center">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-brand-red/10 blur-[60px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand-orange/10 blur-[60px] rounded-full translate-x-1/2 translate-y-1/2" />

        <div className="w-full flex items-center justify-between relative z-10 max-w-sm mx-auto">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 p-2 shadow-2xl overflow-hidden">
               <img src={getTeamLogo(match.team1, match.team1Logo)} className="w-full h-full object-contain" alt={match.team1} referrerPolicy="no-referrer" crossOrigin="anonymous" />
            </div>
            <span className="text-[11px] font-black text-white uppercase tracking-wider">{match.team1}</span>
            <span className="text-[10px] font-black text-brand-red italic">
              {liveScore?.score1 && liveScore.score1 !== '0/0' ? liveScore.score1 : (match.status === 'live' ? 'Batting' : 'Yet to Bat')}
            </span>
            {match.status === 'live' && liveScore?.batters && liveScore.batters.length > 0 && (
              <div className="flex flex-col items-center mt-1">
                {liveScore.batters.map((b: any, i: number) => (
                  <span key={i} className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter whitespace-nowrap">
                    {b.name.split(' ').pop()} {b.runs}({b.balls}){i === 0 ? '*' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Match Score/Status Center */}
          <div className="flex flex-col items-center gap-1 flex-1 px-2">
            {match.status === 'live' ? (
              <>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-display font-black italic text-white tracking-tighter">
                    {liveScore?.score2 && liveScore.score2 !== '0/0' ? liveScore.score2 : (liveScore?.score1 || '0/0')}
                  </span>
                  {liveScore?.score2 && liveScore.score2 !== '0/0' && (
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Target: {parseInt(liveScore.score1.split('/')[0]) + 1}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-gray-500 italic mt-0.5 opacity-80">
                    ({liveScore?.overs || '0.0'} OV)
                  </span>
                </div>
                {liveScore?.summary && (
                  <p className="text-[8px] font-bold text-gray-400 mt-2 uppercase text-center max-w-[120px] leading-tight">
                    {liveScore.summary}
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 font-mono">VS</span>
                <span className="text-xl font-display font-black italic text-white/50 tracking-tighter">
                  {timeLeft || 'UPCOMING'}
                </span>
                <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 mt-3">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{match.date.split('T')[0]}</span>
                </div>
              </>
            )}
          </div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-2 text-right">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 p-2 shadow-2xl overflow-hidden">
               <img src={getTeamLogo(match.team2, match.team2Logo)} className="w-full h-full object-contain" alt={match.team2} referrerPolicy="no-referrer" crossOrigin="anonymous" />
            </div>
            <span className="text-[11px] font-black text-white uppercase tracking-wider">{match.team2}</span>
            <span className="text-[10px] font-black text-brand-red italic">
              {liveScore?.score2 && liveScore.score2 !== '0/0' ? liveScore.score2 : (match.status === 'live' ? 'Innings' : 'Yet to Bat')}
            </span>
            {match.status === 'live' && liveScore?.bowlers && liveScore.bowlers.length > 0 && (
              <div className="flex flex-col items-end mt-1">
                {liveScore.bowlers.map((b: any, i: number) => (
                  <span key={i} className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter whitespace-nowrap">
                    {b.name.split(' ').pop()} {b.wickets}/{Math.floor(b.overs*6 + (b.overs%1)*10)} Balls?
                    {/* Actually better to show O and W */}
                    {b.wickets}W ({b.overs} Over)
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lineup Notification Banner */}
      {match.lineupsOut && !isLocked && match.status !== 'completed' && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-green-600 px-4 py-2.5 flex items-center justify-between shadow-lg"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current animate-pulse">
                <path d="M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z M12,7 L8,11 L8,21 L11,21 L11,15 L13,15 L13,21 L16,21 L16,11 L12,7 Z M17,5 L19,5 L19,16 L17,16 Z" />
              </svg>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Official Lineups are out!</span>
            </div>
            {match.toss && (
              <p className="text-[9px] font-bold text-white/90 mt-1 ml-5 italic leading-none">
                {match.toss.winner} won toss & chose to {match.toss.decision} first
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Live XI</span>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-dark-bg sticky top-0 z-50 overflow-x-auto no-scrollbar">
        {(match.status === 'live' || match.status === 'completed' 
          ? ['Leaderboard', 'Scorecard', 'Stats', 'My Teams'] 
          : ['Contests', 'My Contests', 'My Teams', 'Stats']
        ).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab.toLowerCase() as any)}
            className={cn(
              "flex-1 min-w-[100px] py-4 text-[10px] font-black uppercase tracking-wider transition-all relative",
              activeTab === tab.toLowerCase() ? "text-brand-red" : "text-gray-500 opacity-60"
            )}
          >
            {tab}
            {activeTab === tab.toLowerCase() && (
              <motion.div 
                layoutId="tab-indicator"
                className="absolute bottom-0 inset-x-4 h-0.5 bg-brand-red rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {renderTabContent()}
      </div>

      {/* Contest Details Overlay */}
      <AnimatePresence>
        {selectedContest && (
          <div className="fixed inset-0 z-[150] bg-dark-bg flex flex-col">
            <header className="p-4 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedContest(null)} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
                <h2 className="font-bold text-sm uppercase">{selectedContest.name}</h2>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-white/5 p-4 rounded-xl mb-6">
                <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-2">
                  <span>Leaderboard</span>
                  <span>{selectedContest.joinedUsers.length} Teams</span>
                </div>
                <div className="space-y-3">
                  {selectedContest.joinedUsers.map((uid, idx) => (
                    <div key={uid} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black italic text-brand-red w-4">#{idx + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-xs font-bold">{uid === user?.uid ? 'You' : `Player ${uid.substr(0, 4)}`}</span>
                      </div>
                      <span className="text-xs font-black">
                        {(() => {
                          const teamId = selectedContest.joinedTeamIds?.[uid];
                          const team = userTeams.find(t => t.id === teamId);
                          if (!team) return 0;
                          
                          // Calculate team points based on current player points
                          const matchPlayers = players[match.id] || [];
                          const total = team.players.reduce((sum, pid) => {
                            const p = matchPlayers.find(mp => mp.id === pid);
                            let pts = p?.points || 0;
                            if (pid === team.captainId) pts *= 2;
                            if (pid === team.viceCaptainId) pts *= 1.5;
                            return sum + pts;
                          }, 0);
                          return Math.floor(total);
                        })()} Pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {!isLocked && (
        <div className="p-4 sticky bottom-0 bg-gradient-to-t from-dark-bg via-dark-bg to-transparent">
          {activeTab === 'my contests' ? (
            <button 
              onClick={handleCreateContest}
              className="w-full bg-green-600 border border-green-500/30 py-4 rounded-xl font-display font-black text-xs uppercase tracking-widest shadow-2xl shadow-green-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 fill-current" />
              CREATE CONTEST NOW
            </button>
          ) : (
            <button 
              onClick={handleCreateTeam}
              className="w-full dream11-gradient py-4 rounded-xl font-display font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-red/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              CREATE TEAM NOW
            </button>
          )}
        </div>
      )}
    </div>
  );
}
