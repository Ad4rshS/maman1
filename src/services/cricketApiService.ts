import { Player, LiveScore } from "../types";
import { calculatePointsFromEvents } from "./pointService";

export async function fetchLiveScore(externalId: string) {
  if (!externalId) throw new Error("External match ID is required");
  
  const response = await fetch(`/api/cricket/score/${externalId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Failed to fetch from Backend Proxy" }));
    throw new Error(err.details || err.error || "Failed to fetch from Backend Proxy");
  }
  return await response.json();
}

export async function findMatchIdOnRapidApi(team1: string, team2: string) {
  const matches = await searchMatchesOnRapidApi(`${team1} ${team2}`);
  const target1 = team1.toLowerCase();
  const target2 = team2.toLowerCase();

  const match = matches.find(m => {
    const t1 = m.team1.toLowerCase();
    const t2 = m.team2.toLowerCase();
    return (t1.includes(target1) && t2.includes(target2)) ||
           (t1.includes(target2) && t2.includes(target1));
  });

  return match ? match.matchId : null;
}

export async function searchMatchesOnRapidApi(query?: string) {
  const types = ['live', 'upcoming'];
  const allMatches: any[] = [];

  for (const type of types) {
    try {
      const response = await fetch(`/api/cricket/matches/${type}`);
      if (!response.ok) continue;
      
      const data = await response.json();
      const typeMatches = data.typeMatches || [];
      
      for (const group of typeMatches) {
        const seriesMatches = group.seriesMatches || [];
        for (const series of seriesMatches) {
          const matches = series.seriesAdWrapper?.matches || series.matches || [];
          for (const m of matches) {
            const mInfo = m.matchInfo || m;
            const t1 = mInfo.team1?.teamName || "TBA";
            const t2 = mInfo.team2?.teamName || "TBA";
            const sName = series.seriesName || mInfo.seriesName || "Unknown Series";
            
            // Only search for IPL matches
            const isIPL = sName.toUpperCase().includes('IPL') || sName.toUpperCase().includes('INDIAN PREMIER LEAGUE');
            if (!isIPL) continue;
            
            if (query) {
              const q = query.toLowerCase();
              if (
                !t1.toLowerCase().includes(q) && 
                !t2.toLowerCase().includes(q) && 
                !sName.toLowerCase().includes(q)
              ) continue;
            }

            allMatches.push({
              matchId: mInfo.matchId.toString(),
              team1: t1,
              team2: t2,
              series: sName,
              venue: mInfo.venueInfo?.ground || mInfo.venue || "TBA",
              date: mInfo.startDate || mInfo.date || new Date().toISOString(),
              status: type === 'live' ? 'live' : type === 'recent' ? 'completed' : 'upcoming'
            });
          }
        }
      }
    } catch (err) {
      console.error(`Error searching ${type} matches:`, err);
    }
  }

  return allMatches;
}

/**
 * Maps Cricbuzz hscard API response to our format and calculates points
 */
export function mapApiDataToMatchUpdate(apiData: any, currentPlayers: Player[]) {
  // 1. Extract Live Score
  const liveScore: LiveScore = {
    batters: [],
    bowlers: [],
    summary: apiData.status || "Match In Progress",
    score1: "0/0",
    score2: "0/0",
    overs: "0.0"
  };

  // Cricbuzz HS Card usually has scoreCard or miniscore
  const scorecard = apiData.scoreCard || apiData.scorecard || apiData.score_card || [];
  const miniscore = apiData.miniscore || apiData.mini_score || apiData.header?.miniscore;
  const matchHeader = apiData.matchHeader || apiData.header || apiData.match_header;
  
  if (scorecard.length > 0) {
    const innings1 = scorecard[0];
    const innings2 = scorecard[1];
    
    if (innings1) {
      const runs = innings1.runs || innings1.score || 0;
      const wickets = innings1.wickets || innings1.wkts || 0;
      liveScore.score1 = `${runs}/${wickets}`;
    }
    
    if (innings2) {
      const runs = innings2.runs || innings2.score || 0;
      const wickets = innings2.wickets || innings2.wkts || 0;
      liveScore.score2 = `${runs}/${wickets}`;
      liveScore.overs = String(innings2.overs || innings2.ovrs || "0.0");
    } else if (innings1) {
      liveScore.overs = String(innings1.overs || innings1.ovrs || "0.0");
    }
    
    const currentInnings = innings2 || innings1;
    // Summary
    liveScore.summary = apiData.status || apiData.matchStatus || matchHeader?.status || `${currentInnings.batTeamName || ''} vs ${currentInnings.bowlTeamName || ''}`;

    // Get current active batters
    const batCard = currentInnings.batCard || [];
    liveScore.batters = batCard
      .filter((b: any) => b.outDesc === "batting" || !b.outDesc)
      .slice(0, 2)
      .map((b: any) => ({
        name: b.name || 'Unknown',
        runs: parseInt(b.runs) || 0,
        balls: parseInt(b.balls) || 0,
        fours: parseInt(b.fours) || 0,
        sixes: parseInt(b.sixes) || 0,
        sr: b.strikeRate || '0.0',
        outDesc: b.outDesc || 'batting'
      }));

    // Get current bowlers
    const bowlCard = currentInnings.bowlCard || [];
    liveScore.bowlers = bowlCard
      .slice(-1)
      .map((b: any) => ({
        name: b.name || 'Unknown',
        wickets: parseInt(b.wickets) || 0,
        overs: parseFloat(b.overs) || 0,
        runs: parseInt(b.runs) || 0,
        maidens: parseInt(b.maidens) || 0,
        econ: b.economy || '0.0'
      }));

    // Detailed Innings for Scorecard
    liveScore.innings = scorecard.map((inn: any) => ({
      teamName: inn.batTeamName || 'Unknown',
      score: `${inn.runs || 0}/${inn.wickets || 0}`,
      overs: String(inn.overs || '0.0'),
      batters: (inn.batCard || []).map((b: any) => ({
        name: b.name || 'Unknown',
        runs: parseInt(b.runs) || 0,
        balls: parseInt(b.balls) || 0,
        fours: parseInt(b.fours) || 0,
        sixes: parseInt(b.sixes) || 0,
        sr: b.strikeRate || '0.0',
        outDesc: b.outDesc || 'not out'
      })),
      bowlers: (inn.bowlCard || []).map((b: any) => ({
        name: b.name || 'Unknown',
        wickets: parseInt(b.wickets) || 0,
        overs: parseFloat(b.overs) || 0,
        runs: parseInt(b.runs) || 0,
        maidens: parseInt(b.maidens) || 0,
        econ: b.economy || '0.0'
      }))
    }));
  } else if (miniscore) {
    // Fallback to miniscore if scorecard list is missing
    const t1 = miniscore.batTeam || miniscore.team1 || miniscore.innScore1;
    const t2 = miniscore.bowlTeam || miniscore.team2 || miniscore.innScore2;
    
    if (t1) liveScore.score1 = `${t1.score || t1.runs || 0}/${t1.wickets || t1.wkts || 0}`;
    if (t2) liveScore.score2 = `${t2.score || t2.runs || 0}/${t2.wickets || t2.wkts || 0}`;
    liveScore.overs = String(miniscore.overs || miniscore.ovrs || "0.0");
    liveScore.summary = miniscore.status || matchHeader?.status || apiData.status || "Live";
    
    liveScore.batters = [];
    liveScore.bowlers = [];
    liveScore.innings = [];
  } else if (matchHeader) {
    liveScore.summary = matchHeader.status || apiData.status || "Match Scheduled";
    liveScore.batters = [];
    liveScore.bowlers = [];
    liveScore.innings = [];
  }

  // 2. Aggregate points from across all innings
  const events: any[] = [];
  scorecard.forEach((inn: any) => {
    // Batting stats
    (inn.batCard || []).forEach((bat: any) => {
      events.push({
        batter: bat.name,
        runs: parseInt(bat.runs) || 0,
        fours: parseInt(bat.fours) || 0,
        sixes: parseInt(bat.sixes) || 0,
        isWicket: bat.outDesc && bat.outDesc !== "batting" && bat.outDesc !== "not out",
        wicketType: bat.outDesc || ""
      });
    });

    // Bowling stats
    (inn.bowlCard || []).forEach((bowl: any) => {
      events.push({
        bowler: bowl.name,
        wickets: parseInt(bowl.wickets) || 0,
        maidens: parseInt(bowl.maidens) || 0,
        runsConceded: parseInt(bowl.runs) || 0,
        overs: parseFloat(bowl.overs) || 0
      });
    });
  });

  const playerUpdates = calculatePointsFromStats(events, currentPlayers);
  console.log(`Calculated points for ${playerUpdates.length} players out of ${currentPlayers.length} in squad. Stats events: ${events.length}`);

  // Helper to remove undefined values for Firestore
  const sanitize = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => 
      value === undefined ? null : value
    ));
  };

  return {
    liveScore: sanitize(liveScore),
    playerUpdates: sanitize(playerUpdates)
  };
}

/**
 * Fallback point calculation from total stats if ball-by-ball isn't available
 */
function calculatePointsFromStats(stats: any[], currentPlayers: Player[]): { playerId: string; points: number }[] {
  const pointsMap: Record<string, number> = {};
  
  // Find player by name (fuzzy matching)
  const findP = (name: string) => {
    if (!name) return null;
    const target = name.toLowerCase().trim();
    
    // 1. Exact match
    let match = currentPlayers.find(p => p.name.toLowerCase().trim() === target);
    if (match) return match;
    
    // 2. Partial match (e.g. "V Kohli" matches "Virat Kohli")
    // Split target into parts
    const parts = target.split(' ').filter(p => p.length > 0);
    match = currentPlayers.find(p => {
      const pName = p.name.toLowerCase();
      // Check if all parts of the target are in the player name
      // e.g. "v" and "kohli" both in "virat kohli"
      return parts.every(part => pName.includes(part));
    });
    if (match) return match;

    // 3. Reverse partial match
    match = currentPlayers.find(p => {
      const pName = p.name.toLowerCase();
      const pParts = pName.split(' ').filter(pt => pt.length > 0);
      return pParts.every(pt => target.includes(pt)) || pName.includes(target) || target.includes(pName);
    });

    return match;
  };

  stats.forEach(stat => {
    if (stat.batter) {
      const p = findP(stat.batter);
      if (p) {
        let pts = stat.runs;
        pts += stat.fours * 1;
        pts += stat.sixes * 2;
        if (stat.runs >= 100) pts += 16;
        else if (stat.runs >= 50) pts += 8;
        else if (stat.runs >= 30) pts += 4;
        
        if (stat.isWicket && stat.runs === 0 && p.position !== 'BOWL') pts -= 2;
        
        pointsMap[p.id] = (pointsMap[p.id] || 0) + pts;
      }
    }
    
    if (stat.bowler) {
      const p = findP(stat.bowler);
      if (p) {
        let pts = stat.wickets * 25;
        if (stat.wickets >= 5) pts += 16;
        else if (stat.wickets >= 4) pts += 8;
        else if (stat.wickets >= 3) pts += 4;
        
        // Economy and maidens (approximate since we don't have balls)
        pts += stat.maidens * 12;
        
        pointsMap[p.id] = (pointsMap[p.id] || 0) + pts;
      }
    }
  });

  return Object.entries(pointsMap).map(([id, pts]) => ({ playerId: id, points: pts }));
}
