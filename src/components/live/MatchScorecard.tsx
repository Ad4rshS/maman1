import React from 'react';
import { LiveScore } from '../../types';

interface MatchScorecardProps {
  liveScore: LiveScore | null;
  team1: string;
  team2: string;
}

export default function MatchScorecard({ liveScore, team1, team2 }: MatchScorecardProps) {
  if (!liveScore) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
          <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Awaiting match start...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Innings Toggle/Selector if multiple innings exist */}
      {(liveScore.innings || []).map((inn, innIdx) => (
        <div key={innIdx} className="space-y-4">
          {/* Batting Section */}
          <div className="bg-black border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-4 bg-brand-red rounded-full" />
                <span className="text-[11px] font-black uppercase text-white tracking-widest">{inn.teamName} Innings</span>
              </div>
              <div className="text-right">
                <span className="text-[14px] font-black text-white mr-2">{inn.score}</span>
                <span className="text-[11px] font-black text-gray-500 italic">({inn.overs} OV)</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter">Batter</th>
                    <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase text-center w-12">R</th>
                    <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase text-center w-12">B</th>
                    <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase text-center w-8">4s</th>
                    <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase text-center w-8">6s</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase text-right w-16">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(inn.batters || []).map((b: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white uppercase tracking-tight">{b.name}</span>
                            {b.outDesc === 'batting' && <span className="text-brand-red text-xs animate-pulse font-black">*</span>}
                          </div>
                          <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest mt-0.5",
                            b.outDesc === 'batting' ? "text-green-500" : "text-gray-600"
                          )}>
                            {b.outDesc || 'Yet to Bat'}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-4 text-center text-xs font-black text-white">{b.runs}</td>
                      <td className="px-2 py-4 text-center text-xs font-bold text-gray-500">{b.balls}</td>
                      <td className="px-2 py-4 text-center text-[10px] font-bold text-gray-600">{b.fours || 0}</td>
                      <td className="px-2 py-4 text-center text-[10px] font-bold text-gray-600">{b.sixes || 0}</td>
                      <td className="px-4 py-4 text-right text-[10px] font-black text-brand-red italic">
                        {b.sr || (b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowling Section */}
          <div className="bg-black border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-4 bg-brand-orange rounded-full" />
                <span className="text-[11px] font-black uppercase text-white tracking-widest">Bowling</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter">Bowler</th>
                    <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase text-center w-12">O</th>
                    <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase text-center w-12">M</th>
                    <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase text-center w-12">R</th>
                    <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase text-center w-12">W</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase text-right w-16">ECON</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(inn.bowlers || []).map((b: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-4 text-xs font-bold text-white uppercase tracking-tight">{b.name}</td>
                      <td className="px-2 py-4 text-center text-xs font-bold text-white">{b.overs}</td>
                      <td className="px-2 py-4 text-center text-xs font-bold text-gray-600">{b.maidens || 0}</td>
                      <td className="px-2 py-4 text-center text-xs font-bold text-gray-500">{b.runs}</td>
                      <td className="px-2 py-4 text-center text-xs font-black text-white">{b.wickets}</td>
                      <td className="px-4 py-4 text-right text-[10px] font-black text-brand-red italic">
                        {b.econ || (b.overs > 0 ? (b.runs / b.overs).toFixed(1) : '0.0')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {(!liveScore.innings || liveScore.innings.length === 0) && (
        <div className="space-y-4">
          <div className="bg-black border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-4 bg-brand-red rounded-full" />
                <span className="text-[11px] font-black uppercase text-white tracking-widest text-brand-red">Active Batters</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <tbody>
                  {(liveScore.batters || []).map((b: any, i: number) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold text-white uppercase">{b.name}</span>
                        {i === 0 && <span className="text-brand-red ml-1">*</span>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-black text-white">{b.runs} ({b.balls})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Summary / Status */}
      <div className="bg-brand-red/[0.03] border border-brand-red/10 rounded-2xl p-6 text-center shadow-inner mt-4">
        <span className="text-[10px] font-black text-brand-red/60 uppercase tracking-[0.3em] block mb-2">Match Status</span>
        <p className="text-sm font-black italic text-white uppercase tracking-tight leading-relaxed">
          {liveScore.summary}
        </p>
      </div>

      {/* Recent Overs */}
      <div className="bg-black border border-white/5 rounded-2xl overflow-hidden p-4 mt-4">
         <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-3">Recent Overs</span>
         <div className="flex gap-2 items-center">
           <div className="flex gap-1.5 overflow-x-auto pb-1 pb-safe">
             {['4', '1', '0', '6', 'W', '2', '1', '1', '0', '4'].map((ball, i) => (
               <div key={i} className={cn(
                 "w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black border transition-transform hover:scale-110",
                 ball === 'W' ? "bg-brand-red border-brand-red text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]" :
                 ball === '6' ? "bg-brand-orange border-brand-orange text-white shadow-[0_0_10px_rgba(249,115,22,0.3)]" :
                 ball === '4' ? "bg-blue-600 border-blue-600 text-white" :
                 "bg-white/5 border-white/10 text-gray-400"
               )}>
                 {ball}
               </div>
             ))}
           </div>
           <div className="w-1 h-6 bg-white/10 mx-2 shrink-0" />
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter shrink-0">Over {liveScore.overs}</span>
         </div>
      </div>
    </div>
  );
}

// Minimal cn helper
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
