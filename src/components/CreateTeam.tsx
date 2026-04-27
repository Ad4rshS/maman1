import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, Info, Search, Filter, HelpCircle, Users, User, Plus, Check, Zap, Save } from 'lucide-react';
import { Match, Player, PlayerPosition, UserTeam } from '../types';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import TeamPreview from './TeamPreview';

interface CreateTeamProps {
  match: Match;
  onClose: () => void;
  editTeam?: UserTeam;
}

export default function CreateTeam({ match, onClose, editTeam }: CreateTeamProps) {
  const { user, saveTeam, players, fetchMatchSquads, userTeams } = useApp();
  const matchPlayers = useMemo(() => players[match.id] || [], [match.id, players]);
  
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState<PlayerPosition>('WK');
  const [step, setStep] = useState<'selection' | 'preview' | 'captain'>('selection');
  const [showPreview, setShowPreview] = useState(false);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isLocked = match.status === 'live' || match.status === 'completed' || (new Date(match.date).getTime() - Date.now() <= 0);

  // Initialize if editing
  useEffect(() => {
    if (editTeam && matchPlayers.length > 0) {
      const selected = matchPlayers.filter(p => editTeam.players.includes(p.id));
      setSelectedPlayers(selected);
      setCaptainId(editTeam.captainId);
      setViceCaptainId(editTeam.viceCaptainId);
    }
  }, [editTeam, matchPlayers]);

  const matchTeamsCount = useMemo(() => {
    return userTeams.filter(t => t.matchId === match.id).length;
  }, [userTeams, match.id]);

  useEffect(() => {
    if (matchPlayers.length === 0 && !isSyncing) {
      setIsSyncing(true);
      fetchMatchSquads(match.id, match.team1, match.team2).finally(() => setIsSyncing(false));
    }
  }, [match.id, matchPlayers.length, isSyncing]);

  const stats = useMemo(() => {
    const roles = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
    const teamsCount: Record<string, number> = {};

    selectedPlayers.forEach(p => {
      roles[p.position]++;
      // Use uppercase and trim to ensure matching
      const t = p.team.toUpperCase().trim();
      teamsCount[t] = (teamsCount[t] || 0) + 1;
    });

    return { roles, teamsCount, total: selectedPlayers.length };
  }, [selectedPlayers]);

  const togglePlayer = (player: Player) => {
    if (isLocked) return;
    const isAlreadySelected = !!selectedPlayers.find(p => p.id === player.id);
    
    if (isAlreadySelected) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      if (selectedPlayers.length >= 11) {
        alert("Team already has 11 players!");
        return;
      }
      if ((stats.teamsCount[player.team] || 0) >= 7) {
        alert("Maximum 7 players allowed from one team!");
        return;
      }

      // Check role constraints before adding (simple upper bounds)
      const limits = { WK: 4, BAT: 6, AR: 4, BOWL: 6 };
      if (stats.roles[player.position] >= limits[player.position]) {
        alert(`You can select maximum ${limits[player.position]} ${player.position}s`);
        return;
      }

      setSelectedPlayers(prev => [...prev, player]);
    }
  };

  const validationError = useMemo(() => {
    if (selectedPlayers.length === 0) return null;
    if (selectedPlayers.length < 11) return `Select ${11 - selectedPlayers.length} more players`;
    
    const { roles } = stats;
    if (roles.WK < 1) return "Pick at least 1 Wicketkeeper";
    if (roles.BAT < 2) return "Pick at least 2 Batsmen";
    if (roles.AR < 1) return "Pick at least 1 All-rounder";
    if (roles.BOWL < 2) return "Pick at least 2 Bowlers";
    
    return null;
  }, [selectedPlayers, stats]);

  const nextStep = () => {
    if (selectedPlayers.length === 11 && !validationError) {
      setStep('captain');
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-white">
      {/* Creation Header */}
      <header className="p-4 dream11-gradient flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-bold text-sm tracking-tight">{isLocked ? 'View Team' : 'Create Team'}</h2>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[9px] font-bold text-white/70 uppercase">{isLocked ? 'Match Started - No further edits' : 'Max 7 from one team'}</span>
            </div>
          </div>
        </div>
        {!isLocked && (
          <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full border border-white/20">
            <HelpCircle className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Help</span>
          </div>
        )}
      </header>

      {/* Lineup Notification Banner */}
      {match.lineupsOut && !isLocked && step === 'selection' && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-green-600 px-4 py-2 flex items-center justify-between shadow-lg"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current animate-pulse">
                <path d="M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z M12,7 L8,11 L8,21 L11,21 L11,15 L13,15 L13,21 L16,21 L16,11 L12,7 Z M17,5 L19,5 L19,16 L17,16 Z" />
              </svg>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Lineups are out! Fix your squad now.</span>
            </div>
            {match.toss && (
              <p className="text-[9px] font-bold text-white/90 mt-0.5 ml-5 italic leading-none">
                {match.toss.winner} won toss & chose to {match.toss.decision}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-[8px] font-bold text-white uppercase">Live</span>
          </div>
        </motion.div>
      )}

      {/* Progress Stats */}
      <div className="bg-dark-card/50 px-4 py-4 border-b border-dark-border flex items-center justify-between relative overflow-hidden">
        <div className="flex-1 space-y-1 z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Players</span>
            <span className={cn("text-xs font-bold", stats.total === 11 ? "text-green-500" : "text-white")}>
              {stats.total} / 11
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
             {Array.from({ length: 11 }).map((_, i) => (
               <div key={i} className={cn("flex-1 h-full transition-all", i < stats.total ? "bg-brand-red" : "bg-white/10")} />
             ))}
          </div>
        </div>

        <div className="w-[1px] h-10 bg-dark-border mx-6" />

        <div className="flex items-center gap-6 z-10">
          <div className="flex items-center gap-4">
            <TeamAvatar team={match.team1} count={stats.teamsCount[match.team1.toUpperCase().trim()] || 0} />
            <span className="text-gray-600 font-black text-sm italic">VS</span>
            <TeamAvatar team={match.team2} count={stats.teamsCount[match.team2.toUpperCase().trim()] || 0} />
          </div>
        </div>
        
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl rounded-full" />
      </div>

      {/* Role Tabs */}
      <div className="flex border-b border-dark-border bg-dark-card/30">
        {(['WK', 'BAT', 'AR', 'BOWL'] as PlayerPosition[]).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest relative transition-all",
              activeTab === tab ? "text-brand-red" : "text-gray-400"
            )}
          >
            {tab} <span className="text-[9px] font-medium opacity-60">({stats.roles[tab]})</span>
            {activeTab === tab && <motion.div layoutId="selection-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-red" />}
          </button>
        ))}
      </div>

      {/* Rules Prompt */}
      <div className="px-4 py-2 bg-brand-red/5 border-b border-brand-red/10 text-center">
        <span className="text-[9px] font-bold text-brand-red uppercase tracking-tighter">
          Pick {activeTab === 'WK' ? '1-4 WK' : activeTab === 'BAT' ? '2-6 BAT' : activeTab === 'AR' ? '1-4 AR' : '2-6 BOWL'}
        </span>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 bg-black/20 flex justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider">
           <span>Select Player</span>
           <div className="flex gap-8">
             <span>Points</span>
           </div>
        </div>
        
        {isSyncing ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
             <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Syncing Squads...</p>
          </div>
        ) : matchPlayers.filter(p => p.position === activeTab).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 opacity-50 px-10 text-center">
             <Search className="w-10 h-10 text-gray-700" />
             <p className="text-xs font-bold text-gray-400">No {activeTab}s found for this match</p>
          </div>
        ) : matchPlayers.filter(p => p.position === activeTab).map(player => (
          <PlayerRow 
            key={player.id} 
            player={player} 
            selected={!!selectedPlayers.find(p => p.id === player.id)}
            onClick={() => togglePlayer(player)}
            lineupsOut={!!match.lineupsOut}
          />
        ))}
      </div>

      {/* Preview/Next Footer */}
      <div className="p-4 bg-dark-card border-t border-dark-border flex gap-3">
        <button 
          onClick={() => setShowPreview(true)}
          className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider"
        >
          Team Preview
        </button>
        {!isLocked && (
          <button 
            onClick={nextStep}
            disabled={!!validationError}
            className={cn(
              "flex-[1.5] py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider shadow-lg transition-all",
              !validationError ? "dream11-gradient text-white shadow-brand-red/20 active:scale-95" : "bg-white/10 text-gray-500 cursor-not-allowed"
            )}
          >
            {validationError || 'CONTINUE'}
          </button>
        )}
        {isLocked && (
          <button 
            onClick={() => setStep('captain')}
            className="flex-[1.5] bg-white/10 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest"
          >
            Show C/VC
          </button>
        )}
      </div>

      {/* Team Preview Overlay */}
      <AnimatePresence>
        {showPreview && (
          <TeamPreview 
            players={selectedPlayers}
            captainId={captainId}
            viceCaptainId={viceCaptainId}
            onClose={() => setShowPreview(false)}
            team1={match.team1}
            team2={match.team2}
          />
        )}
      </AnimatePresence>

      {/* Captain Selection Overlay */}
      <AnimatePresence>
        {step === 'captain' && (
          <CaptainSelection 
            players={selectedPlayers} 
            isLocked={isLocked}
            onBack={() => setStep('selection')} 
            onSave={async (c, vc) => {
              setCaptainId(c);
              setViceCaptainId(vc);
              try {
                await saveTeam({
                  id: editTeam?.id || Math.random().toString(36).substr(2, 9),
                  matchId: match.id,
                  userId: user?.uid || 'anon',
                  name: editTeam?.name || `Team ${matchTeamsCount + 1}`,
                  players: selectedPlayers.map(p => p.id),
                  captainId: c,
                  viceCaptainId: vc,
                  createdAt: editTeam?.createdAt || Date.now()
                });
                onClose();
              } catch (err) {
                // Error already handled by saveTeam with an alert
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamAvatar({ team, count }: { team: string, count: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
       <span className="text-[10px] font-black text-white uppercase tracking-tighter">{team}</span>
       <div className={cn(
         "w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all shadow-lg", 
         count > 0 ? "bg-white text-black border-white scale-110" : "border-white/10 text-gray-700"
       )}>
         {count}
       </div>
    </div>
  );
}

const PlayerRow = React.memo<{ player: Player, selected: boolean, onClick: () => void, lineupsOut: boolean }>(({ player, selected, onClick, lineupsOut }) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "px-4 py-3 flex items-center justify-between border-b border-dark-border transition-colors cursor-pointer",
        selected ? "bg-brand-red/5" : "hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
            {player.image ? (
              <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-gray-600" />
            )}
          </div>
          {lineupsOut && player.playing && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-bg" />
          )}
        </div>
        <div>
          <h4 className="text-[13px] font-bold leading-none mb-1">{player.name}</h4>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-gray-500 uppercase">{player.team} • {player.position}</span>
            {lineupsOut && player.playing && (
              <>
                <div className="w-1 h-1 rounded-full bg-green-500" />
                <span className="text-[9px] text-green-500 font-bold uppercase tracking-tighter">Announced</span>
              </>
            )}
            <div className="w-1 h-1 rounded-full bg-gray-700" />
            <span className="text-[9px] text-gray-400 font-medium">Sel by {player.selectedBy}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <span className="text-xs font-medium text-gray-400">{player.points}</span>
        <div className="flex items-center gap-3">
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border transition-all", selected ? "bg-green-500 border-green-500 shadow-lg scale-110" : "border-white/20")}>
            {selected && <Check className="w-4 h-4 text-black font-black" />}
            {!selected && <Plus className="w-4 h-4 text-white/40" />}
          </div>
        </div>
      </div>
    </div>
  );
});

function CaptainSelection({ players, onBack, onSave, isLocked }: { players: Player[], onBack: () => void, onSave: (c: string, vc: string) => void, isLocked: boolean }) {
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);

  const handleSelect = (playerId: string, type: 'C' | 'VC') => {
    if (isLocked) return;
    if (type === 'C') {
      if (viceCaptainId === playerId) setViceCaptainId(null);
      setCaptainId(playerId);
    } else {
      if (captainId === playerId) setCaptainId(null);
      setViceCaptainId(playerId);
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="absolute inset-0 bg-dark-bg z-20 flex flex-col"
    >
       <header className="p-4 dream11-gradient flex items-center gap-3">
         <button onClick={onBack} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
         <div>
           <h2 className="font-bold text-sm">Choose Captain & VC</h2>
           <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">C gets 2x points, VC gets 1.5x</p>
         </div>
       </header>

       <div className="flex-1 overflow-y-auto">
         <div className="px-4 py-2 bg-black/20 flex justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider sticky top-0">
            <span>Player</span>
            <div className="flex gap-4">
               <span className="w-10 text-center">% C BY</span>
               <span className="w-10 text-center">% VC BY</span>
               <span className="w-20"></span>
            </div>
         </div>

         {players.map(p => (
           <div key={p.id} className="px-4 py-3 flex items-center justify-between border-b border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                   <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-[12px] font-bold mb-0.5">{p.name}</h4>
                  <span className="text-[9px] font-bold text-gray-500 uppercase">{p.team} • {p.position}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-[10px] font-medium text-gray-600 w-10 text-center">{(Math.random() * 15).toFixed(1)}</div>
                <div className="text-[10px] font-medium text-gray-600 w-10 text-center">{(Math.random() * 12).toFixed(1)}</div>
                <div className="flex gap-2 w-20 justify-end">
                   <button 
                     onClick={() => handleSelect(p.id, 'C')}
                     className={cn(
                       "w-8 h-8 rounded-full border-2 font-black text-xs flex items-center justify-center transition-all",
                       captainId === p.id ? "bg-white border-white text-black scale-110 shadow-lg" : "border-white/10 text-gray-600"
                     )}
                   >
                     C
                   </button>
                   <button 
                     onClick={() => handleSelect(p.id, 'VC')}
                     className={cn(
                       "w-8 h-8 rounded-full border-2 font-black text-xs flex items-center justify-center transition-all",
                       viceCaptainId === p.id ? "bg-white border-white text-black scale-110 shadow-lg" : "border-white/10 text-gray-600"
                     )}
                   >
                     VC
                   </button>
                </div>
              </div>
           </div>
         ))}
       </div>

       <div className="p-4 bg-dark-card border-t border-dark-border">
          <button 
            disabled={!captainId || !viceCaptainId || isLocked}
            onClick={() => onSave(captainId!, viceCaptainId!)}
            className={cn(
              "w-full py-4 rounded-xl font-display font-bold text-sm uppercase tracking-wider shadow-lg transition-all",
              (captainId && viceCaptainId && !isLocked) ? "dream11-gradient text-white shadow-brand-red/20 active:scale-95" : "bg-white/10 text-gray-500 cursor-not-allowed"
            )}
          >
            {isLocked ? 'ENTRY CLOSED' : 'SAVE TEAM'}
          </button>
       </div>
    </motion.div>
  );
}
