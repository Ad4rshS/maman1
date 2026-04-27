import { Match, Player } from "../types";
import { FALLBACK_MATCHES, getFallbackSquad } from "./fallbackData";
import { calculatePointsFromEvents, extractEventsFromRawJson } from "./pointService";

/**
 * Fetches match data. Uses static fallbacks.
 */
export async function fetchIPLMatches(): Promise<Match[]> {
  // Return static fallback list to avoid API costs
  return FALLBACK_MATCHES;
}

/**
 * Fetches squads. Uses static fallback data.
 */
export async function fetchSquads(matchId: string, team1: string, team2: string): Promise<Player[]> {
  return getFallbackSquad(team1, team2);
}

/**
 * Local implementation of match data analysis to avoid AI costs.
 * This function handles common cricket data structures locally.
 */
export async function analyzeBallByBallData(matchId: string, jsonData: any, currentPlayers: Player[]) {
  console.log("Analyzing match data locally using heuristic engine...");
  
  // Basic heuristic parser for common ball-by-ball formats
  // This avoids calling Gemini while still providing functionality
  try {
    // If it's already in our standard format, return it
    if (jsonData.playerUpdates && jsonData.liveScore) return jsonData;

    // 1. Extract events
    const events = extractEventsFromRawJson(jsonData);
    
    // 2. Calculate points
    const updatedPlayers = calculatePointsFromEvents(events, currentPlayers);
    const playerUpdates = updatedPlayers.map(p => ({ playerId: p.id, points: p.points }));

    // 3. Try to extract live score info
    const liveScore: any = {
      score1: "0/0",
      score2: "0/0",
      overs: "0.0",
      summary: "Live",
      batters: [],
      bowlers: []
    };

    // Try to find score in common fields
    const scoreInfo = jsonData.scoreCard || jsonData.miniscore || jsonData;
    if (scoreInfo.score1 || scoreInfo.runs) {
       liveScore.score1 = scoreInfo.score1 || `${scoreInfo.runs}/${scoreInfo.wickets || 0}`;
       liveScore.overs = scoreInfo.overs || "0.0";
       liveScore.summary = scoreInfo.status || scoreInfo.summary || "In Progress";
    }

    return { playerUpdates, liveScore };
  } catch (err) {
    console.warn("Local analysis failed:", err);
    return null;
  }
}

/**
 * Local live score simulation.
 */
export async function fetchLiveScore(matchId: string, team1: string, team2: string) {
  // Simulated Live Score for Static Publishing
  return {
    score1: `${team1} 178/4`,
    score2: `${team2} 142/3`,
    overs: "16.4 overs",
    summary: `${team2} needs 37 runs in 20 balls`,
    batters: [
      { name: "S. Yadav", runs: 54, balls: 32 },
      { name: "H. Pandya", runs: 12, balls: 8 }
    ],
    bowlers: [
      { name: "R. Jadeja", wickets: 2, overs: 4 }
    ]
  };
}
