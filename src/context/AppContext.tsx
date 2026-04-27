import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserTeam, Contest, Match, Player, AppConfig } from '../types';
import { fetchIPLMatches, fetchSquads } from '../services/geminiService';
import { MATCHES as MOCK_MATCHES, PLAYERS as MOCK_PLAYERS } from '../constants/mockData';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  where,
  getDocs,
  getDoc,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { signInWithGoogle as firebaseSignIn, logout as firebaseLogout } from '../lib/firebase';

interface AppContextType {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  matches: Match[];
  players: Record<string, Player[]>;
  masterPlayers: Player[];
  userTeams: UserTeam[];
  saveTeam: (team: UserTeam) => Promise<void>;
  contests: Contest[];
  createContest: (contest: Contest) => Promise<void>;
  joinContest: (contestId: string, teamId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  fetchMatchSquads: (matchId: string, team1: string, team2: string) => Promise<void>;
  config: AppConfig;
  updateConfig: (config: AppConfig) => Promise<void>;
  updateMatch: (id: string, updates: Partial<Match>) => Promise<void>;
  addMatch: (match: Match) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  clearAllMatches: () => Promise<void>;
  updatePlayer: (matchId: string, playerId: string, updates: Partial<Player>) => Promise<void>;
  addMasterPlayer: (player: Player) => Promise<void>;
  clearAllPlayers: () => Promise<void>;
  deleteMasterPlayer: (id: string) => Promise<void>;
  removeFromMatchSquad: (matchId: string, playerId: string) => Promise<void>;
  recalculateAllScores: (matchId: string, providedPoints?: Record<string, number>) => Promise<void>;
  batchUpdatePlayers: (matchId: string, updates: { playerId: string; updates: Partial<Player> }[]) => Promise<void>;
  deleteDuplicatePlayers: () => Promise<void>;
  deleteDuplicateMatches: () => Promise<void>;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Record<string, Player[]>>({});
  const [masterPlayers, setMasterPlayers] = useState<Player[]>([]);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [config, setConfig] = useState<AppConfig>({});

  // 1. Auth Sync
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Friend of MamanGam',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
          balance: 1000 
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const deleteDuplicatePlayers = async () => {
    try {
      const snap = await getDocs(collection(db, "players"));
      const players = snap.docs.map(d => ({ ...d.data() as Player, docId: d.id }));
      
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      players.forEach(p => {
        const key = `${p.name.toLowerCase().trim()}_${p.team.toLowerCase().trim()}`;
        if (seen.has(key)) {
          duplicates.push(p.docId);
        } else {
          seen.add(key);
        }
      });
      
      if (duplicates.length === 0) {
        alert("No duplicate players found.");
        return;
      }
      
      if (window.confirm(`Found ${duplicates.length} duplicate players. Delete them?`)) {
        const promises = duplicates.map(id => deleteDoc(doc(db, "players", id)));
        await Promise.all(promises);
        alert(`Deleted ${duplicates.length} duplicates.`);
      }
    } catch (err: any) {
      alert("Error deleting duplicates: " + err.message);
    }
  };

  const deleteDuplicateMatches = async () => {
    try {
      const snap = await getDocs(collection(db, "matches"));
      const matches = snap.docs.map(d => ({ ...d.data() as Match, docId: d.id }));
      
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      matches.forEach(m => {
        const dateStr = new Date(m.date).toDateString();
        const key = `${m.team1}_${m.team2}_${dateStr}`;
        if (seen.has(key)) {
          duplicates.push(m.docId);
        } else {
          seen.add(key);
        }
      });
      
      if (duplicates.length === 0) {
        alert("No duplicate matches found.");
        return;
      }
      
      if (window.confirm(`Found ${duplicates.length} duplicate matches. Delete them?`)) {
        const promises = duplicates.map(id => deleteDoc(doc(db, "matches", id)));
        await Promise.all(promises);
        alert(`Deleted ${duplicates.length} duplicates.`);
      }
    } catch (err: any) {
      alert("Error deleting duplicates: " + err.message);
    }
  };

  const signIn = async () => {
    await firebaseSignIn();
  };

  const logout = async () => {
    await firebaseLogout();
  };

  // 2. Data Listeners
  useEffect(() => {
    const unsubMatches = onSnapshot(collection(db, "matches"), (snapshot) => {
      const matchData = snapshot.docs.map(doc => doc.data() as Match);
      // Don't fallback to MOCK_MATCHES if we explicitly have an empty collection
      setMatches(matchData);
    });

    const unsubContests = onSnapshot(collection(db, "contests"), (snapshot) => {
      setContests(snapshot.docs.map(doc => doc.data() as Contest));
    });

    const unsubConfig = onSnapshot(doc(db, "config", "global"), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as AppConfig);
      }
    });

    return () => {
      unsubMatches();
      unsubContests();
      unsubConfig();
    };
  }, []);

  // 3. Master Players Listener
  useEffect(() => {
    return onSnapshot(collection(db, "players"), (snapshot) => {
      setMasterPlayers(snapshot.docs.map(doc => ({ 
        ...(doc.data() as Player), 
        id: doc.id 
      })));
    });
  }, []);

  // Listen for teams of current user
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "userTeams"), where("userId", "==", user.uid));
    const unsubTeams = onSnapshot(q, (snapshot) => {
      setUserTeams(snapshot.docs.map(doc => ({ 
        ...(doc.data() as UserTeam), 
        id: doc.id 
      })));
    });
    return () => unsubTeams();
  }, [user?.uid]);

  const updateConfig = async (newConfig: AppConfig) => {
    await setDoc(doc(db, "config", "global"), newConfig);
  };

  const updateMatch = async (id: string, updates: Partial<Match>) => {
    // Remove undefined values to prevent Firestore errors
    const cleanUpdates = JSON.parse(JSON.stringify(updates, (key, value) => 
      value === undefined ? null : value
    ));
    await updateDoc(doc(db, "matches", id), cleanUpdates);
  };

  const addMatch = async (match: Match) => {
    await setDoc(doc(db, "matches", match.id), match);
  };

  const deleteMatch = async (id: string) => {
    await deleteDoc(doc(db, "matches", id));
  };

  const clearAllMatches = async () => {
    if (!user) {
      alert("You must be logged in to clear data.");
      return;
    }
    try {
      const snap = await getDocs(collection(db, "matches"));
      if (snap.empty) {
        alert("No matches to clear.");
        return;
      }
      const promises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
      alert(`Successfully cleared ${snap.docs.length} matches.`);
    } catch (err: any) {
      console.error("Clear matches error:", err);
      alert("Error clearing matches: " + (err.message || "Permission denied."));
    }
  };

  const updatePlayer = async (matchId: string, playerId: string, updates: Partial<Player>) => {
    const playerDoc = doc(db, "matches", matchId, "squad", playerId);
    await setDoc(playerDoc, updates, { merge: true });
  };

  const batchUpdatePlayers = async (matchId: string, updates: { playerId: string; updates: Partial<Player> }[]) => {
    const promises = updates.map(u => {
      const playerDoc = doc(db, "matches", matchId, "squad", u.playerId);
      return setDoc(playerDoc, u.updates, { merge: true });
    });
    await Promise.all(promises);
  };

  const addMasterPlayer = async (player: Player) => {
    await setDoc(doc(db, "players", player.id), player);
  };

  const deleteMasterPlayer = async (id: string) => {
    try {
      if (!id) throw new Error("Invalid player ID");
      console.log(`Attempting to delete master player document with ID: ${id}`);
      await deleteDoc(doc(db, "players", id));
      console.log(`Successfully deleted master player: ${id}`);
      alert("Player deleted successfully!");
    } catch (err: any) {
      console.error("Delete master player error:", err);
      alert(`Failed to delete player: ${err.message || 'Unknown error'}`);
    }
  };

  const removeFromMatchSquad = async (matchId: string, playerId: string) => {
    try {
      await deleteDoc(doc(db, "matches", matchId, "squad", playerId));
    } catch (err: any) {
      console.error("Remove from squad error:", err);
      alert("Error removing player: " + (err.message || "Permission denied."));
    }
  };

  const recalculateAllScores = async (matchId: string, providedPoints?: Record<string, number>) => {
    try {
      console.log("Recalculating all team scores for match:", matchId);
      
      let playerPointsMap: Record<string, number> = {};
      
      if (providedPoints) {
        playerPointsMap = providedPoints;
      } else {
        // 1. Get latest player points for this match from DB
        const squadSnap = await getDocs(collection(db, "matches", matchId, "squad"));
        squadSnap.docs.forEach(d => {
          const p = d.data() as Player;
          playerPointsMap[p.id] = p.points || 0;
        });
      }

      // 2. Get all teams for this match
      const teamsQ = query(collection(db, "userTeams"), where("matchId", "==", matchId));
      const teamsSnap = await getDocs(teamsQ);
      
      const updatePromises = teamsSnap.docs.map(async (teamDoc) => {
        const team = teamDoc.data() as UserTeam;
        let totalPoints = 0;
        
        team.players.forEach(pid => {
          let pts = playerPointsMap[pid] || 0;
          if (pid === team.captainId) pts *= 2;
          else if (pid === team.viceCaptainId) pts *= 1.5;
          totalPoints += pts;
        });

        return updateDoc(teamDoc.ref, { totalPoints });
      });

      await Promise.all(updatePromises);
      
      // Update match document with timestamp to notify clients
      await updateDoc(doc(db, "matches", matchId), { pointsUpdatedAt: Date.now() });
      
      console.log(`Recalculated scores for ${teamsSnap.docs.length} teams.`);
    } catch (err) {
      console.error("Error recalculating scores:", err);
    }
  };

  const clearAllPlayers = async () => {
    if (!user) {
      alert("You must be logged in to clear data.");
      return;
    }
    try {
      const snap = await getDocs(collection(db, "players"));
      if (snap.empty) {
        alert("No players to clear.");
        return;
      }
      const promises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
      alert(`Successfully cleared ${snap.docs.length} players.`);
    } catch (err: any) {
      console.error("Clear players error:", err);
      alert("Error clearing players: " + (err.message || "Permission denied."));
    }
  };

  const fetchMatchSquads = async (matchId: string, team1: string, team2: string) => {
    try {
      // Return the unsubscribe directly for the caller to manage
      return onSnapshot(collection(db, "matches", matchId, "squad"), async (snapshot) => {
        if (!snapshot.empty) {
          const squad = snapshot.docs.map(d => ({
            ...(d.data() as Player),
            id: d.id
          }));
          setPlayers(prev => ({ ...prev, [matchId]: squad }));
        } else {
          // Check the latest match state to see if it has been synced
          const mSnap = await getDoc(doc(db, "matches", matchId));
          const mData = mSnap.data() as Match | undefined;
          
          if (!mData?.hasSquad) {
            const t1 = team1.toLowerCase().trim();
            const t2 = team2.toLowerCase().trim();

            const deriveSquad = (allPlayers: Player[]) => {
              return allPlayers.filter(p => {
                const pTeam = p.team?.toLowerCase().trim();
                return pTeam === t1 || pTeam === t2 || (pTeam.length <= 4 && (t1.includes(pTeam) || t2.includes(pTeam)));
              });
            };

            const matchPlayers = deriveSquad(masterPlayers).map(p => ({ ...p, isDerived: true }));
            setPlayers(prev => ({ ...prev, [matchId]: matchPlayers }));
          } else {
            setPlayers(prev => ({ ...prev, [matchId]: [] }));
          }
        }
      });
    } catch (err) {
      console.error("Error fetching match squads:", err);
      setPlayers(prev => ({ ...prev, [matchId]: prev[matchId] || [] }));
    }
  };

  const refreshData = async () => {
    // Automatic match refresh from Cricbuzz listing is removed as per request.
    // Fixtures are managed manually now.
    setLoading(false);
  };

  const saveTeam = async (team: UserTeam) => {
    if (!user) {
      alert("Please sign in to save your team!");
      return;
    }
    try {
      await setDoc(doc(db, "userTeams", team.id), {
        ...team,
        userId: user.uid,
        createdAt: team.createdAt || new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Save team error:", err);
      if (err.code === 'permission-denied') {
        alert("Permission denied. Please ensure you are logged in correctly.");
      } else {
        alert("Failed to save team: " + err.message);
      }
    }
  };

  const createContest = async (contest: Contest) => {
    if (!user) {
      alert("Please sign in to create a contest!");
      return;
    }
    try {
      await setDoc(doc(db, "contests", contest.id), {
        ...contest,
        userId: user.uid
      });
    } catch (err: any) {
      console.error("Create contest error:", err);
      alert("Failed to create contest: " + err.message);
    }
  };

  const joinContest = async (contestId: string, teamId?: string) => {
    if (!user) {
      alert("Please sign in to join a contest!");
      return;
    }
    
    // If teamId not provided, we need to ask the user to pick a team
    // This part is handled by the caller usually, but let's make it robust
    if (!teamId) {
      alert("Please select a team to join this contest.");
      return;
    }

    try {
      const contestRef = doc(db, "contests", contestId);
      const snap = await getDoc(contestRef);
      if (snap.exists()) {
        const c = snap.data() as Contest;
        if (!c.joinedUsers.includes(user.uid)) {
          await updateDoc(contestRef, {
            joinedUsers: [...c.joinedUsers, user.uid],
            joinedTeamIds: { ...(c.joinedTeamIds || {}), [user.uid]: teamId },
            filledSpots: (c.filledSpots || 0) + 1
          });
          alert("Successfully joined the contest!");
        } else {
          alert("You have already joined this contest.");
        }
      }
    } catch (err: any) {
      console.error("Join contest error:", err);
      alert("Failed to join contest: " + err.message);
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, loading, setUser, matches, players, masterPlayers, userTeams, saveTeam, contests, 
      createContest, joinContest, refreshData, fetchMatchSquads,
      config, updateConfig, updateMatch, addMatch, deleteMatch, clearAllMatches, updatePlayer,
      addMasterPlayer, clearAllPlayers, deleteMasterPlayer, removeFromMatchSquad, recalculateAllScores, batchUpdatePlayers,
      deleteDuplicatePlayers, deleteDuplicateMatches,
      signIn, logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
