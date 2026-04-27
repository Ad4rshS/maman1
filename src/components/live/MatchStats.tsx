import React, { useState } from 'react';
import { Player } from '../../types';
import { ArrowUp, ArrowDown, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MatchStatsProps {
  players: Player[];
}

type SortKey = 'points' | 'selectedBy' | 'credits' | 'team';

export default function MatchStats({ players }: MatchStatsProps) {
  const [sortKey, setSortKey] = useState<SortKey>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterTeam, setFilterTeam] = useState<string | 'all'>('all');
  const [showPlayingOnly, setShowPlayingOnly] = useState(true);

  // Teams should be derived from all available players for this match
  const teams = Array.from(new Set(players.map(p => p.team))).filter(Boolean).sort();

  const sortedPlayers = [...players]
    .filter(p => filterTeam === 'all' || p.team === filterTeam)
    .filter(p => !showPlayingOnly || p.playing)
    .sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      const numA = (valA as number) || 0;
      const numB = (valB as number) || 0;
      
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Filters & Sorting Controls */}
      <div className="bg-dark-card border border-white/5 rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-lg">
        <div className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-lg border border-white/5">
          <Filter className="w-3 h-3 text-gray-500" />
          <select 
            value={filterTeam} 
            onChange={(e) => setFilterTeam(e.target.value)}
            className="bg-transparent text-[10px] font-bold outline-none uppercase tracking-tighter cursor-pointer text-white"
          >
            <option value="all" className="bg-[#1a1a1a]">All Teams</option>
            {teams.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
          </select>
        </div>

        <button
          onClick={() => setShowPlayingOnly(!showPlayingOnly)}
          className={cn(
            "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
            showPlayingOnly 
              ? "bg-green-600 border-green-600 text-white" 
              : "bg-white/5 border-white/10 text-gray-500"
          )}
        >
          Lineup Only
        </button>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {(['points', 'selectedBy', 'credits'] as const).map(key => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={cn(
                "whitespace-nowrap px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                sortKey === key 
                  ? "bg-brand-red border-brand-red text-white" 
                  : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
              )}
            >
              {key === 'selectedBy' ? 'SEL %' : key}
            </button>
          ))}
        </div>
      </div>

      {/* Players List Table */}
      <div className="bg-dark-card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.05] border-b border-white/10">
              <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Player Info</th>
              <th 
                className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-white"
                onClick={() => toggleSort('points')}
              >
                <div className="flex items-center justify-end gap-1">
                  Points
                  {sortKey === 'points' && (
                    sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedPlayers.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02] group transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                       {p.image ? (
                         <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-700 font-bold uppercase text-[10px]">
                            {p.name.substring(0, 2)}
                         </div>
                       )}
                       {p.playing && (
                         <div className="absolute bottom-0 inset-x-0 bg-green-500 h-1" />
                       )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white group-hover:text-brand-red transition-colors">{p.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">{p.team}</span>
                        <span className="text-[9px] text-gray-700">•</span>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">{p.position}</span>
                        <span className="text-[9px] text-gray-700">•</span>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">{p.credits} Cr</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-display font-black italic text-brand-red">{p.points || 0}</span>
                    <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">
                      Sel by {p.selectedBy}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {sortedPlayers.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest italic">No matching players</p>
          </div>
        )}
      </div>
    </div>
  );
}
