import { MatchEvent, Player } from "../types";

/**
 * Calculates points for a set of match events and updates player stats.
 * Uses standard T20 fantasy points logic.
 */
export function calculatePointsFromEvents(events: any[], currentPlayers: Player[]): Player[] {
  const playerPoints: Record<string, number> = {};

  // Initialize all players with 0 points (recalculate from scratch)
  currentPlayers.forEach(p => {
    playerPoints[p.id] = 0;
  });

  // Helper to find player by name or ID
  const findId = (idOrName: string) => {
    if (!idOrName) return null;
    const p = currentPlayers.find(p => p.id === idOrName || p.name.toLowerCase() === idOrName.toLowerCase());
    return p ? p.id : null;
  };

  events.forEach(event => {
    const batterId = findId(event.batterId || event.batsman || event.batter);
    const bowlerId = findId(event.bowlerId || event.bowler);
    const fielderId = findId(event.fielderId || event.fielder);

    // 1. Batting Points
    if (batterId) {
      playerPoints[batterId] = (playerPoints[batterId] || 0) + (event.runs || 0);
      
      if (event.runs === 4) playerPoints[batterId] += 1;
      if (event.runs === 6) playerPoints[batterId] += 2;
      
      // Duck out penalty (except bowlers)
      if ((event.wicket || event.isWicket) && (event.batsman === event.wicketPlayer || !event.wicketPlayer) && (event.runs === 0)) {
         const p = currentPlayers.find(p => p.id === batterId);
         if (p && p.position !== 'BOWL') {
           playerPoints[batterId] -= 2;
         }
      }
    }

    // 2. Bowling Points
    if (bowlerId) {
      const isWicket = event.wicket || event.isWicket;
      const wicketType = event.wicketType || (event.wicket && event.wicket.type) || "";
      
      if (isWicket && !wicketType.toLowerCase().includes('run out')) {
        playerPoints[bowlerId] = (playerPoints[bowlerId] || 0) + 25;
        
        // LBW / Bowled bonus
        if (wicketType.toLowerCase().includes('lbw') || wicketType.toLowerCase().includes('bowled')) {
          playerPoints[bowlerId] += 8;
        }
      }

      // Dot ball
      if ((event.runs === 0 || event.result === 'DOT') && !event.extras && !event.isExtra) {
        playerPoints[bowlerId] += 1;
      }
    }

    // 3. Fielding Points
    if (fielderId) {
      const wicketType = event.wicketType || (event.wicket && event.wicket.type) || "";
      if (wicketType.toLowerCase().includes('catch')) {
        playerPoints[fielderId] = (playerPoints[fielderId] || 0) + 8;
      } else if (wicketType.toLowerCase().includes('stumping')) {
        playerPoints[fielderId] = (playerPoints[fielderId] || 0) + 12;
      } else if (wicketType.toLowerCase().includes('run out')) {
        playerPoints[fielderId] = (playerPoints[fielderId] || 0) + 6;
      }
    }
  });

  return currentPlayers.map(p => ({
    ...p,
    points: playerPoints[p.id] || 0
  }));
}

/**
 * Attempts to extract ball-by-ball events from a generic JSON structure
 * to avoid using AI for analysis.
 */
export function extractEventsFromRawJson(jsonData: any): any[] {
  const events: any[] = [];
  
  try {
    // 1. If it's already an array, assume these are the events
    if (Array.isArray(jsonData)) return jsonData;

    // 2. Look for common nested arrays
    const possibleArrays = [
      jsonData.balls,
      jsonData.events,
      jsonData.deliveries,
      jsonData.innings?.[0]?.overs?.flatMap((o: any) => o.deliveries || o.balls || []),
      jsonData.scoreCard?.[0]?.balls // Some custom formats
    ];

    for (const arr of possibleArrays) {
      if (arr && Array.isArray(arr)) {
        return arr;
      }
    }

    // 3. Deep search for any key named 'balls' or 'deliveries' that is an array
    const findArray = (obj: any): any[] | null => {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) return obj;
      
      for (const key in obj) {
        if (key === 'balls' || key === 'deliveries' || key === 'events') {
          if (Array.isArray(obj[key])) return obj[key];
        }
        const found = findArray(obj[key]);
        if (found) return found;
      }
      return null;
    };

    const deepFound = findArray(jsonData);
    if (deepFound) return deepFound;

  } catch (err) {
    console.warn("Failed to extract events from raw JSON:", err);
  }

  return events;
}
