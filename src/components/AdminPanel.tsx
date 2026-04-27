import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Shield, Zap, ToggleLeft, ToggleRight, FileText, CheckCircle2, Users, ChevronLeft, Save, Plus, Trash2, X, Edit2, Search, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Player, MatchEvent, PlayerPosition } from '../types';
import { cn } from '../lib/utils';
import { calculatePointsFromEvents } from '../services/pointService';
import { analyzeBallByBallData } from '../services/geminiService';
import { fetchLiveScore, mapApiDataToMatchUpdate, findMatchIdOnRapidApi, searchMatchesOnRapidApi } from '../services/cricketApiService';
import { getTeamLogo } from '../services/fallbackData';

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const { 
    matches, config, updateConfig, updateMatch, addMatch, deleteMatch, clearAllMatches,
    players, updatePlayer, masterPlayers, addMasterPlayer, deleteMasterPlayer, clearAllPlayers,
    removeFromMatchSquad, recalculateAllScores, deleteDuplicatePlayers, deleteDuplicateMatches,
    batchUpdatePlayers
  } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'fixtures' | 'players' | 'lineups' | 'live-score'>('fixtures');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [isAddingNewPlayer, setIsAddingNewPlayer] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ 
    name: '', 
    team: '', 
    position: 'BAT' as PlayerPosition, 
    credits: 8.5,
    battingStyle: '',
    bowlingStyle: '',
    armDetails: ''
  });

  const { fetchMatchSquads } = useApp();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (selectedMatchId) {
      const match = matches.find(m => m.id === selectedMatchId);
      if (match) {
        fetchMatchSquads(selectedMatchId, match.team1, match.team2).then(u => {
          unsub = u;
        });
      }
    }
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [selectedMatchId, matches, fetchMatchSquads]);

  const stripJsonComments = (str: string) => {
    return str.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  };

  const handleMatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Starting fixture upload:", file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const cleanJson = stripJsonComments(text);
        const data = JSON.parse(cleanJson);
        const matchArray = data.matches || (Array.isArray(data) ? data : []);
        
        if (matchArray.length === 0) {
          alert("No matches found in JSON.");
          return;
        }

        const promises = matchArray.map((m: any) => {
          const id = m.id || `match_${Math.random().toString(36).substr(2, 9)}`;
          if (!m.team1 || !m.team2) {
            console.warn("Skipping invalid match data:", m);
            return Promise.resolve();
          }
          return addMatch({
            ...m,
            id,
            team1Logo: m.team1Logo || getTeamLogo(m.team1),
            team2Logo: m.team2Logo || getTeamLogo(m.team2),
            dataSource: 'manual',
            status: m.status || 'upcoming',
            date: m.date || new Date().toISOString(),
            venue: m.venue || 'TBA',
            series: m.series || 'Domestic League'
          });
        });
        await Promise.all(promises);
        alert(`Successfully uploaded ${matchArray.length} matches.`);
        // Reset input for same-file re-upload
        e.target.value = '';
      } catch (err) {
        console.error("Fixture upload error:", err);
        alert("Invalid JSON format for fixtures. Check console for details.");
      }
    };
    reader.readAsText(file);
  };

  const handlePlayerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Starting player upload:", file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const cleanJson = stripJsonComments(text);
        const data = JSON.parse(cleanJson);
        const playerArray = data.players || (Array.isArray(data) ? data : []);

        if (playerArray.length === 0) {
          alert("No players found in JSON.");
          return;
        }

        const promises = playerArray.map((p: any) => {
          // Normalize user-provided format
          const name = p.name || p["player name"] || "Unknown Player";
          const team = p.team || p.teamName || "TBA";
          const position = (p.position || p["batting/bowling"] || "BAT").toUpperCase() as PlayerPosition;
          const credits = parseFloat(p.credits || p.value || "8.5") || 8.5;
          const battingStyle = p.battingStyle || p["batting style"] || p["other imp details"] || "";
          const bowlingStyle = p.bowlingStyle || p["bowling style"] || "";
          const armDetails = p.armDetails || p["arm detais"] || "";

          const playerId = `p_${team.toLowerCase().replace(/\s+/g, '_')}_${name.toLowerCase().replace(/\s+/g, '_')}`;
          
          return addMasterPlayer({
            id: playerId,
            name,
            team,
            position,
            credits,
            battingStyle,
            bowlingStyle,
            armDetails,
            points: 0,
            selectedBy: 0,
            playing: false
          });
        });
        await Promise.all(promises);
        alert(`Successfully uploaded ${playerArray.length} players.`);
        e.target.value = '';
      } catch (err) {
        console.error("Player upload error:", err);
        alert("Invalid JSON format for players. Check console for details.");
      }
    };
    reader.readAsText(file);
  };

  const handleEventUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMatchId) {
      if (!selectedMatchId) alert("Please select a match in the 'Lineups' tab first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        
        // 1. Check for Standard Manual Format (No AI needed)
        if (data.type === 'standard_match_update' || data.type === 'detailed_ball_by_ball' || (data.balls && Array.isArray(data.balls))) {
          const currentPlayers = players[selectedMatchId] || [];
          let pointsMap: Record<string, number> | undefined = undefined;
          
          // If it has balls/events, calculate points
          const balls = data.balls || (data.type === 'detailed_ball_by_ball' ? data.events : null);
          if (balls && Array.isArray(balls)) {
            const updatedPlayers = calculatePointsFromEvents(balls, currentPlayers);
            pointsMap = {};
            updatedPlayers.forEach(p => pointsMap![p.id] = p.points);
            await batchUpdatePlayers(selectedMatchId, updatedPlayers.map(p => ({ playerId: p.id, updates: { points: p.points } })));
          } else if (data.playerPoints && Array.isArray(data.playerPoints)) {
            pointsMap = {};
            data.playerPoints.forEach((up: any) => pointsMap![up.playerId] = up.points);
            await batchUpdatePlayers(selectedMatchId, data.playerPoints.map((up: any) => ({ playerId: up.playerId, updates: { points: up.points } })));
          }
          
          if (data.liveScore) {
            const matchStatus = data.liveScore.summary?.toLowerCase().includes("won") ? "completed" : "live";
            await updateMatch(selectedMatchId, { 
              status: matchStatus,
              liveScore: data.liveScore 
            });
          }
          await recalculateAllScores(selectedMatchId, pointsMap);
          alert("Match data updated successfully!");
          return;
        }

        // 2. Check if it's a simple MatchEvent array
        if (Array.isArray(data) && data.length > 0 && data[0].batterId) {
          // Simple MatchEvent array
          const currentPlayers = players[selectedMatchId] || [];
          const updatedPlayers = calculatePointsFromEvents(data, currentPlayers);
          const pointsMap: Record<string, number> = {};
          updatedPlayers.forEach(p => pointsMap[p.id] = p.points);
          
          await batchUpdatePlayers(selectedMatchId, updatedPlayers.map(p => ({ playerId: p.id, updates: { points: p.points } })));
          
          const match = matches.find(m => m.id === selectedMatchId);
          if (match?.status === 'upcoming') {
            await updateMatch(selectedMatchId, { status: 'live' });
          }
          await recalculateAllScores(selectedMatchId, pointsMap);
          alert(`Synced ${data.length} events. Points updated!`);
        } else {
          // Complex Ball-by-Ball: Use Local Engine to analyze
          const currentPlayers = players[selectedMatchId] || [];
          alert("Analyzing match data locally... Please wait.");
          
          const result = await analyzeBallByBallData(selectedMatchId, data, currentPlayers);
          
          if (result) {
            console.log("Analysis Result:", result);
            
            // 1. Update Player Points
            if (result.playerUpdates) {
              const promises = result.playerUpdates.map((up: any) => 
                updatePlayer(selectedMatchId, up.playerId, { points: up.points })
              );
              await Promise.all(promises);
            }
            
            // 2. Update Match Live Score & Status
            const matchStatus = result.liveScore?.summary?.toLowerCase().includes("won") ? "completed" : "live";
            await updateMatch(selectedMatchId, { 
              status: matchStatus,
              liveScore: result.liveScore 
            });
            
            await recalculateAllScores(selectedMatchId);
            alert("Match data analyzed successfully! Scoreboard and points updated.");
          } else {
            alert("Processing failed. Please check the JSON format.");
          }
        }
      } catch (err) {
        console.error("Upload error:", err);
        alert("Invalid JSON format for match data.");
      }
    };
    reader.readAsText(file);
  };

  const handleLineupToggle = (matchId: string, current: boolean) => {
    updateMatch(matchId, { lineupsOut: !current });
  };

  const handleAddPlayerToMatch = async (player: Player) => {
    if (!selectedMatchId) return;
    await updatePlayer(selectedMatchId, player.id, { ...player, playing: true });
  };

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [isEditingMatch, setIsEditingMatch] = useState(false);
  const [apiMatches, setApiMatches] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [apiSearchQuery, setApiSearchQuery] = useState('');

  const handleSearchApiMatches = async () => {
    setIsSearchingApi(true);
    try {
      const results = await searchMatchesOnRapidApi(apiSearchQuery);
      setApiMatches(results);
    } catch (err) {
      alert("Failed to fetch matches from API");
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleSelectApiMatch = (apiMatch: any) => {
    if (editingMatch) {
      setEditingMatch({
        ...editingMatch,
        team1: (apiMatch.team1 || '').substring(0, 4).toUpperCase().trim(),
        team2: (apiMatch.team2 || '').substring(0, 4).toUpperCase().trim(),
        externalId: apiMatch.matchId,
        series: apiMatch.series,
        venue: apiMatch.venue,
        date: new Date(apiMatch.date).toISOString(),
        status: apiMatch.status === 'live' ? 'live' : apiMatch.status === 'completed' ? 'completed' : 'upcoming'
      });
    } else {
      // For new match
      setEditingMatch({
        id: `match_${Date.now()}`,
        team1: (apiMatch.team1 || '').substring(0, 4).toUpperCase().trim(),
        team2: (apiMatch.team2 || '').substring(0, 4).toUpperCase().trim(),
        externalId: apiMatch.matchId,
        series: apiMatch.series,
        venue: apiMatch.venue,
        date: new Date(apiMatch.date).toISOString(),
        status: apiMatch.status === 'live' ? 'live' : apiMatch.status === 'completed' ? 'completed' : 'upcoming',
        team1Logo: '',
        team2Logo: '',
        lineupsOut: false,
        dataSource: 'api'
      });
      setIsEditingMatch(true);
    }
    setApiMatches([]);
  };

  const handleEditMatch = (match: any) => {
    setEditingMatch(match);
    setIsEditingMatch(true);
  };

  const handleUpdateMatch = async () => {
    if (!editingMatch) return;
    try {
      await addMatch(editingMatch); // Using addMatch to overwrite/update
      setIsEditingMatch(false);
      setEditingMatch(null);
      alert("Match updated successfully!");
    } catch (err: any) {
      alert("Error updating match: " + err.message);
    }
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setNewPlayer({
      name: player.name,
      team: player.team,
      position: player.position,
      credits: player.credits,
      battingStyle: player.battingStyle || '',
      bowlingStyle: player.bowlingStyle || '',
      armDetails: player.armDetails || ''
    });
    setIsAddingNewPlayer(true);
  };

  const handleCreateNewPlayer = async () => {
    if (!newPlayer.name || !newPlayer.team) return;
    
    const playerId = editingPlayer ? editingPlayer.id : `p_${Date.now()}`;
    const p: Player = {
      id: playerId,
      name: newPlayer.name,
      team: newPlayer.team,
      position: newPlayer.position,
      credits: newPlayer.credits,
      battingStyle: newPlayer.battingStyle,
      bowlingStyle: newPlayer.bowlingStyle,
      armDetails: newPlayer.armDetails,
      points: editingPlayer?.points || 0,
      selectedBy: editingPlayer?.selectedBy || 0,
      playing: editingPlayer?.playing || false
    };

    try {
      await addMasterPlayer(p);
      setIsAddingNewPlayer(false);
      setEditingPlayer(null);
      setNewPlayer({ 
        name: '', team: '', position: 'BAT', credits: 8.5, 
        battingStyle: '', bowlingStyle: '', armDetails: '' 
      });
      alert(editingPlayer ? "Player updated successfully!" : "Player created successfully!");
    } catch (err: any) {
      alert("Error saving player: " + err.message);
    }
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId);
  const matchPlayers = selectedMatchId ? (players[selectedMatchId] || []) : [];
  const masterList = masterPlayers || [];
  const { user } = useApp();

  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    if (user?.email === 'avengers1535@gmail.com') {
      setIsAdminUser(true);
    } else {
      // Check Firestore admins collection too if needed, but email is the primary for this user
      setIsAdminUser(false);
    }
  }, [user]);

  if (selectedMatch && selectedMatchId) {
    if (activeSubTab === 'live-score') {
      return (
        <div className="min-h-screen bg-dark-bg p-6 pb-24 overflow-y-auto">
          <header className="flex items-center gap-3 mb-8">
            <button onClick={() => setSelectedMatchId(null)} className="p-2 hover:bg-white/5 rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-display font-bold italic tracking-tight uppercase">SCORE SYNC</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedMatch.team1} vs {selectedMatch.team2}</p>
            </div>
          </header>

          <div className="space-y-6">
            <div className="bg-dark-card border border-dark-border p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</h4>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                  selectedMatch.status === 'live' ? "bg-brand-red text-white" : "bg-white/10 text-gray-500"
                )}>{selectedMatch.status}</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                 <button 
                  onClick={() => updateMatch(selectedMatch.id, { status: 'upcoming' })}
                  className={cn("px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest", selectedMatch.status === 'upcoming' ? "bg-white/20" : "text-gray-500")}
                 >Upcoming</button>
                 <button 
                  onClick={() => updateMatch(selectedMatch.id, { status: 'live' })}
                  className={cn("px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest", selectedMatch.status === 'live' ? "bg-brand-red" : "text-gray-500")}
                 >Live</button>
                 <button 
                  onClick={() => updateMatch(selectedMatch.id, { status: 'completed' })}
                  className={cn("px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest", selectedMatch.status === 'completed' ? "bg-green-600" : "text-gray-500")}
                 >Finished</button>
              </div>
            </div>

            <div className="bg-dark-card border border-dark-border p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-brand-red uppercase tracking-widest">RapidAPI Control</h4>
                {selectedMatch.externalId ? (
                   <span className="text-[8px] font-black text-green-500 uppercase">Linked: {selectedMatch.externalId}</span>
                ) : (
                   <span className="text-[8px] font-black text-red-500 uppercase">Not Linked (Set ID in Fixtures)</span>
                )}
              </div>
              <button 
                onClick={async () => {
                  try {
                    if (!selectedMatch) return;
                    let extId = selectedMatch.externalId;
                    if (!extId) {
                      const foundId = await findMatchIdOnRapidApi(selectedMatch.team1, selectedMatch.team2);
                      if (foundId) {
                        extId = foundId;
                        await updateMatch(selectedMatch.id, { externalId: foundId });
                        alert(`Auto-linked Match ID: ${foundId}`);
                      } else {
                        throw new Error("Match not found on API. Set ID manually.");
                      }
                    }
                    alert(`Syncing score using ID: ${extId}...`);
                    const apiData = await fetchLiveScore(extId);
                    const currentPlayers = players[selectedMatchId] || [];
                    
                    if (currentPlayers.length === 0) {
                      console.warn("Squad is empty for this match. Score will update but player points won't.");
                    }
                    
                    const { liveScore, playerUpdates } = mapApiDataToMatchUpdate(apiData, currentPlayers);
                    
                    // 1. Update match
                    const matchStatus = apiData.status?.toLowerCase().includes("won") ? "completed" : "live";
                    await updateMatch(selectedMatchId, { 
                      status: matchStatus,
                      liveScore 
                    });

                    // 2. Update players
                    const pointsMap: Record<string, number> = {};
                    playerUpdates.forEach(u => pointsMap[u.playerId] = u.points);
                    
                    await batchUpdatePlayers(selectedMatchId, playerUpdates.map(up => ({ playerId: up.playerId, updates: { points: up.points } })));

                    // 3. Recalculate leaderboards
                    await recalculateAllScores(selectedMatchId, pointsMap);
                    
                    alert("Scorecard & points synced successfully from API!");
                  } catch (err: any) {
                    alert("API Sync failed: " + err.message);
                  }
                }}
                className={cn(
                  "w-full py-4 bg-brand-red text-white hover:bg-brand-red/90 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-red/10"
                )}
              >
                <Zap className="w-4 h-4 fill-current" />
                Sync Score with API
              </button>
            </div>

            <div className="bg-dark-card border border-dark-border p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paste Match Data</h4>
                <button 
                  onClick={() => {
                    const sample = '[\n  { "batterName": "Virat Kohli", "runs": 4, "isWicket": false },\n  { "batterName": "Faf du Plessis", "runs": 1, "isWicket": false }\n]';
                    const area = document.getElementById("match-data-paste") as HTMLTextAreaElement;
                    if (area) area.value = sample;
                  }}
                  className="text-[9px] text-brand-red font-black uppercase tracking-widest"
                >
                  Insert Sample
                </button>
              </div>
              <textarea 
                id="match-data-paste"
                placeholder="Paste ball-by-ball JSON here..."
                className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-mono focus:outline-none focus:border-brand-red resize-none"
              />
              <button 
                onClick={async () => {
                  const area = document.getElementById("match-data-paste") as HTMLTextAreaElement;
                  if (!area.value) return;
                  
                  try {
                    const data = JSON.parse(area.value);
                    const currentPlayers = players[selectedMatchId] || [];
                    
                    if (data.type === 'standard_match_update' || data.type === 'detailed_ball_by_ball' || (data.balls && Array.isArray(data.balls))) {
                      const currentPlayers = players[selectedMatchId] || [];
                      
                      let pointsMap: Record<string, number> | undefined = undefined;
                      const balls = data.balls || (data.type === 'detailed_ball_by_ball' ? data.events : null);
                      if (balls && Array.isArray(balls)) {
                        const updatedPlayers = calculatePointsFromEvents(balls, currentPlayers);
                        pointsMap = {};
                        updatedPlayers.forEach(p => pointsMap![p.id] = p.points);
                        await batchUpdatePlayers(selectedMatchId, updatedPlayers.map(p => ({ playerId: p.id, updates: { points: p.points } })));
                      } else if (data.playerPoints && Array.isArray(data.playerPoints)) {
                        pointsMap = {};
                        data.playerPoints.forEach((up: any) => pointsMap![up.playerId] = up.points);
                        await batchUpdatePlayers(selectedMatchId, data.playerPoints.map((up: any) => ({ playerId: up.playerId, updates: { points: up.points } })));
                      }

                      if (data.liveScore) {
                        const matchStatus = data.liveScore.summary?.toLowerCase().includes("won") ? "completed" : "live";
                        await updateMatch(selectedMatchId, { 
                          status: matchStatus,
                          liveScore: data.liveScore 
                        });
                      }
                      await recalculateAllScores(selectedMatchId, pointsMap);
                      alert("Manual match update applied successfully!");
                    } else if (Array.isArray(data) && data.length > 0 && data[0].batterId) {
                      const updatedPlayers = calculatePointsFromEvents(data, currentPlayers);
                      const pointsMap: Record<string, number> = {};
                      updatedPlayers.forEach(p => pointsMap[p.id] = p.points);
                      await batchUpdatePlayers(selectedMatchId, updatedPlayers.map(p => ({ playerId: p.id, updates: { points: p.points } })));
                      
                      const mStatus = selectedMatch.status === 'upcoming' ? 'live' : selectedMatch.status;
                      await updateMatch(selectedMatchId, { status: mStatus });
                      await recalculateAllScores(selectedMatchId, pointsMap);
                      alert("Pasted events processed successfully!");
                    } else {
                      alert("Processing pasted data locally... This may take a moment.");
                      const result = await analyzeBallByBallData(selectedMatchId, data, currentPlayers);
                      if (result) {
                        if (result.playerUpdates) {
                          const pointsMap: Record<string, number> = {};
                          result.playerUpdates.forEach((u: any) => pointsMap[u.playerId] = u.points);
                          await batchUpdatePlayers(selectedMatchId, result.playerUpdates.map((up: any) => ({ playerId: up.playerId, updates: { points: up.points } })));
                          
                          const matchStatus = result.liveScore?.summary?.toLowerCase().includes("won") ? "completed" : "live";
                          await updateMatch(selectedMatchId, { 
                            status: matchStatus,
                            liveScore: result.liveScore 
                          });
                          await recalculateAllScores(selectedMatchId, pointsMap);
                        } else {
                          const matchStatus = result.liveScore?.summary?.toLowerCase().includes("won") ? "completed" : "live";
                          await updateMatch(selectedMatchId, { 
                            status: matchStatus,
                            liveScore: result.liveScore 
                          });
                          await recalculateAllScores(selectedMatchId);
                        }
                        alert("Local analysis complete! Points and score updated.");
                      }
                    }
                    area.value = "";
                  } catch (err) {
                    alert("Invalid JSON format. Please check your data.");
                  }
                }}
                className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Process Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-dark-bg p-6 pb-24 overflow-y-auto">
        <header className="flex items-center gap-3 mb-8">
          <button onClick={() => { setSelectedMatchId(null); setIsAddingNewPlayer(false); }} className="p-2 hover:bg-white/5 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold italic tracking-tight uppercase">Squad Selection</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedMatch.team1} vs {selectedMatch.team2}</p>
          </div>
        </header>

        <div className="space-y-8">
          {[selectedMatch.team1, selectedMatch.team2].map(team => {
            const teamSquadForMatch = (players[selectedMatchId] || []).filter(p => p.team === team);
            const teamMasterList = masterPlayers.filter(p => {
               const pTeam = p.team?.toLowerCase().trim();
               const t = team.toLowerCase().trim();
               const isTeamMatch = pTeam === t || (pTeam.length <= 4 && t.includes(pTeam));
               return isTeamMatch && !teamSquadForMatch.some(ms => ms.id === p.id);
            });

            // Combine both for the UI
            const combinedPlayers = [...teamSquadForMatch, ...teamMasterList].sort((a, b) => a.name.localeCompare(b.name));

            return (
              <div key={team} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-red flex items-center gap-2">
                    <div className="w-1 h-3 bg-brand-red rounded-full" />
                    {team} LINEUP
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between pl-1">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Team Players ({combinedPlayers.length}) • Active: {combinedPlayers.filter(p => p.playing).length}</p>
                    <div className="flex gap-2">
                       {['WK', 'BAT', 'AR', 'BOWL'].map(pos => (
                         <span key={pos} className="text-[7px] font-black text-gray-500">{pos}:{combinedPlayers.filter(p => p.position === pos && p.playing).length}</span>
                       ))}
                    </div>
                  </div>
                  
                  {(['WK', 'BAT', 'AR', 'BOWL'] as PlayerPosition[]).map(pos => {
                    const posPlayers = combinedPlayers.filter(p => p.position === pos);
                    if (posPlayers.length === 0) return null;
                    return (
                      <div key={pos} className="space-y-1">
                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 pl-2">{pos}s</p>
                        <div className="grid grid-cols-1 gap-1">
                          {posPlayers.map(player => (
                            <SquadPlayerRow 
                              key={player.id}
                              player={player}
                              selectedMatchId={selectedMatchId}
                              isInSquad={teamSquadForMatch.some(ms => ms.id === player.id)}
                              updatePlayer={updatePlayer}
                              removeFromMatchSquad={removeFromMatchSquad}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      setNewPlayer({ ...newPlayer, team: team });
                      setIsAddingNewPlayer(true);
                    }}
                    className="w-full py-3 bg-white/5 border border-dashed border-white/10 rounded-xl text-[9px] font-black text-gray-500 uppercase flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-brand-red"
                  >
                    <Plus className="w-3 h-3" /> Add Custom Player to {team}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => setSelectedMatchId(null)}
          className="fixed bottom-6 left-6 right-6 bg-brand-red p-4 rounded-2xl flex items-center justify-center gap-2 font-display font-bold italic tracking-tight shadow-xl shadow-brand-red/20 z-[350]"
        >
          <Save className="w-5 h-5" /> CONFIRM LINEUPS
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-6 pb-24">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-black tracking-tighter italic">
              ADMIN <span className="text-brand-red">CONSOLE</span>
            </h1>
            {!isAdminUser && (
              <span className="text-[8px] font-black text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full uppercase">Restricted Mode</span>
            )}
            {isAdminUser && (
              <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">Terminal Access Granted</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-dark-card border border-dark-border p-1 rounded-full px-3 py-1">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black uppercase text-gray-500">Firebase Auth</span>
            <span className={cn(
              "text-[9px] font-bold tracking-tighter truncate max-w-[100px]",
              user?.email === 'avengers1535@gmail.com' ? "text-green-500" : "text-brand-red"
            )}>
              {user ? user.email : 'NOT LOGGED IN'}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <TabButton 
          active={activeSubTab === 'fixtures'} 
          onClick={() => setActiveSubTab('fixtures')} 
          icon={<FileText />} 
          label="Fixtures" 
        />
        <TabButton 
          active={activeSubTab === 'players'} 
          onClick={() => setActiveSubTab('players')} 
          icon={<Users />} 
          label="Players" 
        />
        <TabButton 
          active={activeSubTab === 'lineups'} 
          onClick={() => setActiveSubTab('lineups')} 
          icon={<Shield />} 
          label="Lineups" 
        />
        <TabButton 
          active={activeSubTab === 'live-score'} 
          onClick={() => setActiveSubTab('live-score')} 
          icon={<Zap />} 
          label="Score" 
        />
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'fixtures' && (
          <motion.div 
            key="fixtures"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-dark-card border-2 border-dashed border-dark-border p-8 rounded-2xl flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-brand-red">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Create New Match</h3>
                <p className="text-[10px] text-gray-500">Add manually or fetch from API</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingMatch({
                      id: `match_${Date.now()}`,
                      team1: '',
                      team2: '',
                      externalId: '',
                      series: 'TATA IPL 2024',
                      venue: '',
                      date: new Date().toISOString(),
                      status: 'upcoming',
                      team1Logo: '',
                      team2Logo: '',
                      lineupsOut: false,
                      dataSource: 'manual'
                    });
                    setIsEditingMatch(true);
                  }}
                  className="bg-white/5 px-4 py-2 rounded-full text-[10px] font-black uppercase hover:bg-white/10 transition-all border border-white/10"
                >
                  Manual Entry
                </button>
                <button 
                  onClick={() => {
                    setApiSearchQuery('');
                    handleSearchApiMatches();
                  }}
                  className="bg-brand-red px-4 py-2 rounded-full text-[10px] font-black uppercase hover:bg-brand-red/80 transition-all shadow-lg shadow-brand-red/20"
                >
                  IPL Search
                </button>
              </div>
            </div>

            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-widest text-brand-red px-1">Bulk Paste Fixtures</h3>
              <textarea 
                placeholder='Paste JSON here... { "matches": [...] }'
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-mono focus:outline-none focus:border-brand-red resize-none"
                id="bulk-match-paste"
              />
              <button 
                onClick={async () => {
                  const area = document.getElementById('bulk-match-paste') as HTMLTextAreaElement;
                  if (!area.value) return;
                  try {
                    const cleanJson = stripJsonComments(area.value);
                    const data = JSON.parse(cleanJson);
                    const matchArray = data.matches || (Array.isArray(data) ? data : []);
                    if (matchArray.length === 0) {
                      alert("No matches found in string.");
                      return;
                    }
                    const promises = matchArray.map((m: any) => {
                      const id = m.id || `match_${Math.random().toString(36).substr(2, 9)}`;
                      return addMatch({
                        ...m,
                        id,
                        team1Logo: m.team1Logo || getTeamLogo(m.team1),
                        team2Logo: m.team2Logo || getTeamLogo(m.team2),
                        dataSource: 'manual',
                        status: m.status || 'upcoming',
                        date: m.date || new Date().toISOString(),
                        venue: m.venue || 'TBA',
                        series: m.series || 'TATA IPL 2026'
                      });
                    });
                    await Promise.all(promises);
                    alert(`Successfully added ${matchArray.length} matches.`);
                    area.value = '';
                  } catch (err: any) {
                    console.error("Paste error:", err);
                    const errorMessage = err.message || "Invalid JSON format";
                    alert(`${errorMessage}\n\nTip: Check for missing commas between objects or extra commas at the end of lists.`);
                  }
                }}
                className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Process Paste
              </button>
              
              {/* Sync buttons removed as per request */}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Manage Matches</h4>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={deleteDuplicateMatches}
                    className="text-[8px] font-black text-brand-red uppercase hover:underline"
                  >
                    Delete Duplicates
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete ALL matches?")) {
                        clearAllMatches();
                      }
                    }}
                    className="text-[8px] font-black text-red-500 uppercase hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              {matches.filter(m => m.status !== 'completed').map(match => (
                <div key={match.id} className="bg-dark-card p-4 rounded-xl border border-dark-border group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] font-black text-brand-red uppercase">{match.series}</p>
                      <span className={cn(
                        "text-[7px] px-1 py-0.5 rounded font-black uppercase",
                        match.dataSource === 'manual' ? "bg-white/10 text-gray-400" : "bg-brand-red/10 text-brand-red"
                      )}>{match.dataSource === 'manual' ? 'MANUAL' : 'API'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={() => handleEditMatch(match)}
                        className="text-gray-500 hover:text-white transition-all p-1.5 hover:bg-white/10 rounded-full"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete match ${match.team1} vs ${match.team2}?`)) {
                            deleteMatch(match.id);
                          }
                        }}
                        className="text-red-500/50 hover:text-red-500 transition-all p-1.5 hover:bg-red-500/10 rounded-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                         <img src={getTeamLogo(match.team1, match.team1Logo)} className="w-full h-full object-contain" alt={match.team1} referrerPolicy="no-referrer" crossOrigin="anonymous" />
                      </div>
                      <span className="font-bold text-sm tracking-tight">{match.team1}</span>
                    </div>
                    <span className="text-[10px] text-gray-700 font-bold italic">VS</span>
                    <div className="flex-1 flex items-center gap-3 justify-end text-right">
                      <span className="font-bold text-sm tracking-tight">{match.team2}</span>
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                        <img src={getTeamLogo(match.team2, match.team2Logo)} className="w-full h-full object-contain" alt={match.team2} referrerPolicy="no-referrer" crossOrigin="anonymous" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[9px] text-gray-500 italic">{match.venue} • {new Date(match.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] font-black text-gray-600 uppercase">External ID:</span>
                      <input 
                        type="text"
                        placeholder="e.g. 40381"
                        value={match.externalId || ''}
                        onChange={(e) => updateMatch(match.id, { externalId: e.target.value })}
                        className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[8px] font-mono focus:outline-none focus:border-brand-red w-16"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {matches.filter(m => m.status !== 'completed').length === 0 && (
                <div className="p-12 text-center border border-dashed border-dark-border rounded-2xl">
                  <p className="text-xs text-gray-600 font-bold italic">No active matches uploaded yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'players' && (
          <motion.div 
            key="players"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex gap-4">
              <div className="flex-1 bg-dark-card border-2 border-dashed border-dark-border p-6 rounded-2xl flex flex-col items-center gap-3 text-center">
                <Upload className="w-6 h-6 text-brand-red" />
                <div className="space-y-1">
                  <h3 className="font-bold text-xs">Bulk Players</h3>
                  <p className="text-[9px] text-gray-500">{"{ \"players\": [...] }"}</p>
                </div>
                <input type="file" id="player-upload" className="hidden" onChange={handlePlayerUpload} accept=".json" />
                <label htmlFor="player-upload" className="bg-white/5 px-4 py-2 rounded-full text-[9px] font-black uppercase cursor-pointer hover:bg-white/10 transition-all">Upload</label>
              </div>
              <button 
                onClick={() => setIsAddingNewPlayer(true)}
                className="flex-1 bg-brand-red/10 border-2 border-dashed border-brand-red/30 p-6 rounded-2xl flex flex-col items-center gap-3 text-center group"
              >
                <Plus className="w-6 h-6 text-brand-red transition-transform group-hover:scale-110" />
                <div className="space-y-1">
                  <h3 className="font-bold text-xs">Add Player</h3>
                  <p className="text-[9px] text-brand-red/60 uppercase font-black">Manual Entry</p>
                </div>
              </button>
            </div>

            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-widest text-brand-red px-1">Bulk Paste Players</h3>
              <textarea 
                placeholder='Paste JSON here... { "players": [...] }'
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-mono focus:outline-none focus:border-brand-red resize-none"
                id="bulk-player-paste"
              />
              <button 
                onClick={async () => {
                  const area = document.getElementById('bulk-player-paste') as HTMLTextAreaElement;
                  if (!area.value) return;
                  try {
                    const cleanJson = stripJsonComments(area.value);
                    const data = JSON.parse(cleanJson);
                    const playerArray = data.players || (Array.isArray(data) ? data : []);
                    if (playerArray.length === 0) {
                      alert("No players found in string.");
                      return;
                    }
                    const promises = playerArray.map((p: any) => {
                      const name = p.name || p["player name"] || "Unknown Player";
                      const team = p.team || p.teamName || "TBA";
                      const position = (p.position || p["batting/bowling"] || "BAT").toUpperCase() as PlayerPosition;
                      const credits = parseFloat(p.credits || p.value || "8.5") || 8.5;
                      const battingStyle = p.battingStyle || p["batting style"] || p["other imp details"] || "";
                      const bowlingStyle = p.bowlingStyle || p["bowling style"] || "";
                      const armDetails = p.armDetails || p["arm detais"] || "";
                      const playerId = `p_${team.toLowerCase().replace(/\s+/g, '_')}_${name.toLowerCase().replace(/\s+/g, '_')}`;
                      
                      return addMasterPlayer({
                        id: playerId,
                        name,
                        team,
                        position,
                        credits,
                        battingStyle,
                        bowlingStyle,
                        armDetails,
                        points: 0,
                        selectedBy: 0,
                        playing: false
                      });
                    });
                    await Promise.all(promises);
                    alert(`Successfully added ${playerArray.length} players.`);
                    area.value = '';
                  } catch (err: any) {
                    console.error("Paste error:", err);
                    const errorMessage = err.message || "Invalid JSON format";
                    alert(`${errorMessage}\n\nTip: Check player position value or missing commas.`);
                  }
                }}
                className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Process Paste
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Master Player List</h4>
                 <div className="flex items-center gap-3">
                   <input 
                     type="text"
                     placeholder="Search..."
                     value={playerSearch}
                     onChange={(e) => setPlayerSearch(e.target.value)}
                     className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold focus:outline-none focus:border-brand-red w-32"
                   />
                   <button 
                     type="button"
                     onClick={deleteDuplicatePlayers}
                     className="text-[8px] font-black text-brand-red uppercase hover:underline"
                   >
                     Delete Duplicates
                   </button>
                   <button 
                     type="button"
                     onClick={() => {
                        if (window.confirm("Are you sure you want to delete ALL master players?")) {
                          clearAllPlayers();
                        }
                     }}
                     className="text-[8px] font-black text-red-500 uppercase hover:underline"
                   >
                     Clear All
                   </button>
                   <span className="text-[9px] font-black text-brand-red">{masterList.length} TOTAL</span>
                 </div>
              </div>

              {(['WK', 'BAT', 'AR', 'BOWL'] as PlayerPosition[]).map(pos => {
                const posPlayers = masterList.filter(p => {
                  const matchPos = p.position === pos;
                  const matchSearch = !playerSearch || 
                                     p.name.toLowerCase().includes(playerSearch.toLowerCase()) || 
                                     p.team.toLowerCase().includes(playerSearch.toLowerCase()) ||
                                     p.id.toLowerCase().includes(playerSearch.toLowerCase());
                  return matchPos && matchSearch;
                });
                if (posPlayers.length === 0) return null;
                return (
                  <div key={pos} className="space-y-2">
                    <h5 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-2">{pos}s ({posPlayers.length})</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {posPlayers.map(player => (
                        <div key={player.id} className="bg-dark-card p-3 rounded-xl border border-dark-border flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center overflow-hidden border border-white/5">
                               <img src={getTeamLogo(player.team)} className="w-full h-full object-contain" alt={player.team} referrerPolicy="no-referrer" crossOrigin="anonymous" />
                             </div>
                             <div>
                               <p className="font-bold text-sm tracking-tight">{player.name}</p>
                               <p className="text-[9px] text-gray-500 font-bold uppercase">{player.position} • {player.battingStyle || 'BAT'} • {player.credits} Cr</p>
                               <p className="text-[7px] text-gray-700 font-mono mt-0.5">ID: {player.id}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPlayer(player);
                              }}
                              className="text-gray-500 transition-all p-2 hover:bg-white/5 rounded-full"
                              title="Edit Player"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("Attempting to delete master player:", player.id, player.name);
                                if (window.confirm(`Permanently delete ${player.name} from master player list?`)) {
                                  deleteMasterPlayer(player.id);
                                }
                              }}
                              className="text-red-500/50 hover:text-red-500 transition-all p-2 hover:bg-red-500/10 rounded-full"
                              title="Delete Player"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'lineups' && (
          <motion.div 
            key="lineups"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {matches.filter(m => m.status !== 'completed').map(match => (
              <div key={match.id} className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 flex items-center justify-between bg-white/5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <img src={getTeamLogo(match.team1, match.team1Logo)} className="w-5 h-5 object-contain" alt="" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                      <span className="font-bold text-xs italic uppercase italic tracking-tighter">{match.team1}</span>
                    </div>
                    <span className="text-[8px] text-gray-600 font-black">VS</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs italic uppercase italic tracking-tighter">{match.team2}</span>
                      <img src={getTeamLogo(match.team2, match.team2Logo)} className="w-5 h-5 object-contain" alt="" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                    </div>
                    {match.lineupsOut && (
                      <span className="bg-green-500/20 text-green-500 text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ml-2">
                        <CheckCircle2 className="w-2.5 h-2.5" /> LINEUPS OUT
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => handleLineupToggle(match.id, !!match.lineupsOut)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      match.lineupsOut ? "bg-green-500 text-white" : "bg-white/5 text-gray-600 border border-white/10"
                    )}
                  >
                    {match.lineupsOut ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    {match.lineupsOut ? "OUT" : "ANNOUNCE"}
                  </button>
                </div>

                {/* Toss Details Section */}
                <div className="px-4 pb-4 border-b border-white/5">
                  <div className="bg-white/5 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Toss Details</p>
                      {match.toss?.winner && (
                        <p className="text-[9px] font-bold text-brand-red italic">
                          {match.toss.winner} won & chose to {match.toss.decision}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select 
                        value={match.toss?.winner || ''}
                        onChange={(e) => updateMatch(match.id, { 
                          toss: { 
                            winner: e.target.value, 
                            decision: match.toss?.decision || 'bat' 
                          } 
                        })}
                        className="bg-dark-bg border border-white/10 rounded-lg p-2.5 text-[10px] font-bold outline-none focus:border-brand-red appearance-none cursor-pointer"
                      >
                        <option value="">Who won toss?</option>
                        <option value={match.team1}>{match.team1}</option>
                        <option value={match.team2}>{match.team2}</option>
                      </select>
                      <select 
                        value={match.toss?.decision || ''}
                        onChange={(e) => updateMatch(match.id, { 
                          toss: { 
                            winner: match.toss?.winner || '', 
                            decision: e.target.value as 'bat' | 'bowl' 
                          } 
                        })}
                        className="bg-dark-bg border border-white/10 rounded-lg p-2.5 text-[10px] font-bold outline-none focus:border-brand-red appearance-none cursor-pointer"
                      >
                        <option value="">Chose to?</option>
                        <option value="bat">Bat First</option>
                        <option value="bowl">Bowl First</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <button 
                    onClick={() => setSelectedMatchId(match.id)}
                    className="w-full bg-brand-red/5 hover:bg-brand-red/10 border border-brand-red/20 p-4 rounded-xl flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-brand-red" />
                      <div className="text-left">
                        <p className="text-[11px] font-black uppercase tracking-widest">Select XI for both teams</p>
                        <p className="text-[9px] text-gray-500 font-bold italic tracking-tight">{match.venue}</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-brand-red rotate-180" />
                  </button>
                </div>
              </div>
            ))}
            {matches.filter(m => m.status !== 'completed').length === 0 && (
              <div className="p-12 text-center border border-dashed border-dark-border rounded-2xl">
                <p className="text-xs text-gray-600 font-bold italic">No active matches to manage lineups.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'live-score' && (
          <motion.div 
            key="score"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-3">
               <div className="px-1 mb-2">
                 <h3 className="text-xs font-black uppercase tracking-widest text-brand-red">Active Fixtures</h3>
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Select a match to update scores and points</p>
               </div>
               {matches.filter(m => m.status === 'live' || m.status === 'upcoming').map(m => (
                 <div key={m.id} className="bg-brand-red/5 border border-brand-red/20 p-4 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                       <div className={cn("w-2 h-2 rounded-full", m.status === 'live' ? "bg-brand-red animate-pulse" : "bg-gray-700")} />
                       <div>
                         <p className="font-black italic text-sm">{m.team1} vs {m.team2}</p>
                         <p className="text-[9px] text-gray-500 font-bold">{m.series}</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setSelectedMatchId(m.id)}
                      className="text-[9px] font-black uppercase tracking-widest bg-brand-red text-white px-3 py-1.5 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      Update
                    </button>
                 </div>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Add Player Modal */}
      <AnimatePresence>
        {isAddingNewPlayer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-dark-bg/95 flex items-center justify-center p-6 backdrop-blur-md"
          >
            <div className="w-full max-w-sm bg-dark-card border border-dark-border p-6 rounded-3xl space-y-6 shadow-2xl relative">
              <button 
                onClick={() => { setIsAddingNewPlayer(false); setEditingPlayer(null); }}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-display font-bold italic tracking-tighter uppercase">
                {editingPlayer ? 'EDIT PLAYER' : 'NEW PLAYER ENTRY'}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Full Name</label>
                    <input 
                      type="text" 
                      value={newPlayer.name}
                      onChange={e => setNewPlayer({...newPlayer, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-xl focus:outline-none focus:border-brand-red text-xs font-bold"
                      placeholder="e.g. Virat Kohli"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Team</label>
                    <select 
                      value={newPlayer.team}
                      onChange={e => setNewPlayer({...newPlayer, team: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-xl focus:outline-none focus:border-brand-red text-xs font-bold appearance-none"
                    >
                      <option value="">Select Team</option>
                      {Array.from(new Set(matches.flatMap(m => [m.team1, m.team2]))).sort().map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                      <option value="CUSTOM">Custom...</option>
                    </select>
                    {newPlayer.team === 'CUSTOM' && (
                      <input 
                        type="text" 
                        placeholder="Team Code"
                        className="w-full mt-2 bg-white/5 border border-white/10 p-2 rounded text-[10px] font-bold"
                        onChange={e => setNewPlayer({...newPlayer, team: e.target.value.toUpperCase()})}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Position</label>
                    <select 
                      value={newPlayer.position}
                      onChange={e => setNewPlayer({...newPlayer, position: e.target.value as PlayerPosition})}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold appearance-none"
                    >
                      <option value="WK">WK - Wicketkeeper</option>
                      <option value="BAT">BAT - Batsman</option>
                      <option value="AR">AR - All-rounder</option>
                      <option value="BOWL">BOWL - Bowler</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Credits</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={newPlayer.credits}
                      onChange={e => setNewPlayer({...newPlayer, credits: parseFloat(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Styles</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={newPlayer.battingStyle}
                      onChange={e => setNewPlayer({...newPlayer, battingStyle: e.target.value})}
                      className="bg-white/5 border border-white/10 p-2 rounded text-[10px] font-bold appearance-none"
                    >
                      <option value="">Batting Style</option>
                      <option value="Right Hand Bat">Right Handed</option>
                      <option value="Left Hand Bat">Left Handed</option>
                    </select>
                    <select 
                      value={newPlayer.bowlingStyle}
                      onChange={e => setNewPlayer({...newPlayer, bowlingStyle: e.target.value})}
                      className="bg-white/5 border border-white/10 p-2 rounded text-[10px] font-bold appearance-none"
                    >
                      <option value="">Bowling Style</option>
                      <option value="Right-arm fast">Right-arm fast</option>
                      <option value="Right-arm medium">Right-arm medium</option>
                      <option value="Right-arm offbreak">Right-arm offbreak</option>
                      <option value="Right-arm legbreak">Right-arm legbreak</option>
                      <option value="Left-arm fast">Left-arm fast</option>
                      <option value="Left-arm orthodox">Left-arm orthodox</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => { setIsAddingNewPlayer(false); setEditingPlayer(null); }}
                  className="flex-1 bg-white/5 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateNewPlayer}
                  disabled={!newPlayer.name || !newPlayer.team || newPlayer.team === 'CUSTOM'}
                  className="flex-1 bg-brand-red p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-red/20 disabled:opacity-50"
                >
                  {editingPlayer ? 'UPDATE' : 'SAVE MASTER'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Match Modal */}
      <AnimatePresence>
        {isEditingMatch && editingMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-dark-bg/95 flex items-center justify-center p-6 backdrop-blur-md"
          >
            <div className="w-full max-w-sm bg-dark-card border border-dark-border p-6 rounded-3xl space-y-6 shadow-2xl relative">
              <button 
                onClick={() => { setIsEditingMatch(false); setEditingMatch(null); }}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-display font-bold italic tracking-tighter uppercase">EDIT MATCH DETAILS</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 block mb-1 uppercase">Team 1</label>
                    <input 
                      type="text"
                      value={editingMatch.team1}
                      onChange={(e) => setEditingMatch({ ...editingMatch, team1: e.target.value.toUpperCase() })}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-600 block mb-1 uppercase">Team 2</label>
                    <input 
                      type="text"
                      value={editingMatch.team2}
                      onChange={(e) => setEditingMatch({ ...editingMatch, team2: e.target.value.toUpperCase() })}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black text-gray-600 uppercase">External Match ID (RapidAPI)</label>
                    <div className="flex items-center gap-3">
                      {editingMatch.externalId && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(editingMatch.externalId);
                            alert('Match ID copied');
                          }}
                          className="text-[9px] font-black text-gray-400 uppercase hover:text-white flex items-center gap-1"
                        >
                          <Copy className="w-2.5 h-2.5" /> Copy ID
                        </button>
                      )}
                      <button 
                        onClick={() => handleSearchApiMatches()}
                        className="text-[9px] font-black text-brand-red uppercase hover:underline flex items-center gap-1"
                      >
                        <Search className="w-2.5 h-2.5" /> Find IPL Match
                      </button>
                    </div>
                  </div>
                  <input 
                    type="text"
                    placeholder="e.g., 108342"
                    value={editingMatch.externalId || ''}
                    onChange={(e) => setEditingMatch({ ...editingMatch, externalId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-red"
                  />
                  <div className="mt-2 p-3 bg-brand-red/5 border border-brand-red/10 rounded-xl">
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Quick Link:</p>
                    <p className="text-[8px] text-gray-500 font-medium">Use "Find ID" to auto-fetch or enter manually from Cricbuzz URL.</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-600 block mb-1 uppercase">Venue</label>
                  <input 
                    type="text"
                    value={editingMatch.venue || ''}
                    onChange={(e) => setEditingMatch({ ...editingMatch, venue: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-600 block mb-1 uppercase">Status</label>
                  <select 
                    value={editingMatch.status}
                    onChange={(e) => setEditingMatch({ ...editingMatch, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-red"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => { setIsEditingMatch(false); setEditingMatch(null); }}
                  className="flex-1 bg-white/5 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateMatch}
                  className="flex-1 bg-brand-red p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-red/20"
                >
                  UPDATE MATCH
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* API Match Search Results Drawer */}
      <AnimatePresence>
        {apiMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[500] bg-dark-bg/95 flex flex-col p-6 backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-display font-black italic tracking-tight uppercase">SELECT IPL MATCH</h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{apiMatches.length} IPL Matches Found</p>
              </div>
              <button 
                onClick={() => setApiMatches([])}
                className="p-2 bg-white/5 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input 
                type="text"
                placeholder="Search series or team..."
                value={apiSearchQuery}
                onChange={(e) => setApiSearchQuery(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-bold focus:outline-none focus:border-brand-red"
              />
              <button 
                onClick={handleSearchApiMatches}
                disabled={isSearchingApi}
                className="bg-brand-red px-6 rounded-2xl flex items-center justify-center disabled:opacity-50"
              >
                {isSearchingApi ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {apiMatches.map(m => (
                <div
                  key={m.matchId}
                  onClick={() => handleSelectApiMatch(m)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelectApiMatch(m);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full bg-dark-card border border-dark-border p-4 rounded-2xl text-left hover:border-brand-red/50 transition-all active:scale-[0.98] group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black text-brand-red uppercase tracking-widest">{m.series}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                      m.status === 'live' ? "bg-brand-red text-white" : "bg-white/10 text-gray-500"
                    )}>{m.status}</span>
                  </div>
                  <div className="flex items-center gap-4 font-display font-bold italic text-lg uppercase tracking-tight text-white mb-1">
                    <span>{m.team1}</span>
                    <span className="text-[10px] text-gray-700">VS</span>
                    <span>{m.team2}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-gray-500 font-bold">{m.venue}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-mono text-brand-red">{m.matchId}</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(m.matchId);
                          alert('Match ID copied to clipboard');
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[8px] text-gray-600 mt-1 uppercase font-black tracking-tighter">
                    {new Date(m.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all",
        active 
          ? "bg-brand-red border-brand-red text-white shadow-lg shadow-brand-red/20" 
          : "bg-dark-card border-dark-border text-gray-600 hover:border-white/20"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: cn("w-5 h-5", active ? "text-white" : "text-gray-500") })}
      <span className="text-[8px] font-black uppercase tracking-[0.1em]">{label}</span>
    </button>
  );
}

const SquadPlayerRow = React.memo<{
  player: Player;
  selectedMatchId: string;
  isInSquad: boolean;
  updatePlayer: (matchId: string, playerId: string, updates: Partial<Player>) => Promise<void>;
  removeFromMatchSquad: (matchId: string, playerId: string) => Promise<void>;
}>(({ player, selectedMatchId, isInSquad, updatePlayer, removeFromMatchSquad }) => {
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-2 rounded-lg border bg-dark-card border-dark-border transition-all group",
        player.playing ? "border-green-500/30 bg-green-500/5 shadow-[0_0_15px_-5px_rgba(34,197,94,0.1)] opacity-100" : "opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        <button 
          onClick={async () => {
            if (!isInSquad) {
              await updatePlayer(selectedMatchId, player.id, { ...player, playing: true });
            } else {
              await updatePlayer(selectedMatchId, player.id, { playing: !player.playing });
            }
          }}
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center transition-all",
            player.playing ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "bg-white/5 text-transparent border border-white/10"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
        <div>
          <p className={cn("text-xs font-bold leading-none mb-0.5", player.playing ? "text-white" : "text-gray-400")}>{player.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black bg-white/5 px-1 py-0.2 rounded text-gray-500 tracking-widest">{player.position}</span>
            {player.playing && <span className="text-[7px] font-black text-green-500 uppercase tracking-tighter animate-pulse">Playing</span>}
          </div>
        </div>
      </div>
      {isInSquad && !player.isDerived && (
        <button 
          onClick={() => {
            if (window.confirm(`Remove ${player.name} from match?`)) {
              removeFromMatchSquad(selectedMatchId, player.id);
            }
          }}
          className="p-1.5 text-red-500 mb-1 transition-all hover:bg-red-500/10 rounded-full shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});
