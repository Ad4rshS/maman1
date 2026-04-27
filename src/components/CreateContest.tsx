import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, Users, ShieldCheck, Zap } from 'lucide-react';
import { Match, Contest, UserTeam } from '../types';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

interface CreateContestProps {
  match: Match;
  onClose: () => void;
}

export default function CreateContest({ match, onClose }: CreateContestProps) {
  const { user, createContest, userTeams } = useApp();
  const [contestName, setContestName] = useState(`${match.team1} vs ${match.team2} Friends`);
  const [capacity, setCapacity] = useState(10);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [entryFee, setEntryFee] = useState(0);

  const myTeamsForMatch = userTeams.filter(t => t.matchId === match.id);

  const handleCreate = async () => {
    if (!user || !selectedTeamId) return;
    
    const newContest: Contest = {
      id: Math.random().toString(36).substr(2, 9),
      matchId: match.id,
      creatorId: user.uid,
      name: contestName,
      capacity: capacity,
      entryFee: entryFee,
      joinedUsers: [user.uid],
      joinedTeamIds: { [user.uid]: selectedTeamId }
    };

    try {
      await createContest(newContest);
      onClose();
    } catch (err) {
      // Error handled by createContest alert
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-white">
      <header className="p-4 bg-dark-bg border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-sm">Create Private Contest</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Banner */}
        <div className="bg-brand-red/10 border border-brand-red/20 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full dream11-gradient flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
              <path d="M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z M12,7 L8,11 L8,21 L11,21 L11,15 L13,15 L13,21 L16,21 L16,11 L12,7 Z M17,5 L19,5 L19,16 L17,16 Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold">Free to Play</h3>
            <p className="text-[10px] text-gray-400">Challenge your friends for bragging rights. No real money involved.</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Contest Name</label>
            <input 
              type="text" 
              value={contestName}
              onChange={(e) => setContestName(e.target.value)}
              placeholder="e.g. Backbenchers IPL"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium focus:border-brand-red/50 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Size (Max 100)</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="number" 
                  value={capacity}
                  onChange={(e) => setCapacity(Math.min(100, parseInt(e.target.value) || 2))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm font-medium focus:border-brand-red/50 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Entry Fee</label>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-bold text-green-500 flex items-center gap-2">
                 <Zap className="w-4 h-4 fill-current" />
                 FREE
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Join With Team</label>
            <select 
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium focus:border-brand-red/50 outline-none transition-all appearance-none text-white"
            >
              <option value="" disabled className="bg-dark-bg text-gray-500">Select your team</option>
              {myTeamsForMatch.map(team => (
                <option key={team.id} value={team.id} className="bg-dark-bg text-white">
                  {team.name}
                </option>
              ))}
            </select>
            {myTeamsForMatch.length === 0 && (
              <p className="text-[10px] text-brand-red font-medium pl-1">You must create a team for this match first!</p>
            )}
          </div>
        </div>

        {/* Security Info */}
        <div className="space-y-4 pt-4">
          <div className="flex items-start gap-3">
             <div className="mt-1"><ShieldCheck className="w-4 h-4 text-gray-600" /></div>
             <p className="text-[11px] text-gray-500 leading-relaxed">
               By creating this contest, you agree that it is purely for entertainment purposes. Mamangam does not facilitate any form of gambling or financial transactions.
             </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-dark-card border-t border-dark-border">
        <button 
          onClick={handleCreate}
          disabled={!contestName || !selectedTeamId}
          className={cn(
            "w-full py-4 rounded-xl font-display font-bold text-sm uppercase tracking-wider shadow-xl transition-all",
            (contestName && selectedTeamId) ? "dream11-gradient text-white" : "bg-white/10 text-gray-500 cursor-not-allowed"
          )}
        >
          CREATE CONTEST NOW
        </button>
      </div>
    </div>
  );
}
