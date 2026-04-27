export type PlayerPosition = 'WK' | 'BAT' | 'AR' | 'BOWL';

export interface Player {
  id: string;
  name: string;
  team: string;
  position: PlayerPosition;
  credits: number;
  points: number;
  selectedBy: number; // percentage
  image?: string;
  playing?: boolean; // confirmed XI
  battingStyle?: string;
  bowlingStyle?: string;
  armDetails?: string;
  isDerived?: boolean;
}

export interface LiveScore {
  score1?: string;
  score2?: string;
  overs?: string;
  summary?: string;
  batters?: { 
    name: string; 
    runs: number; 
    balls: number; 
    fours?: number; 
    sixes?: number; 
    sr?: string; 
    outDesc?: string;
    team?: string;
  }[];
  bowlers?: { 
    name: string; 
    wickets: number; 
    overs: number; 
    runs?: number; 
    maidens?: number; 
    econ?: string;
    team?: string;
  }[];
  innings?: {
    teamName: string;
    score: string;
    overs: string;
    batters: any[];
    bowlers: any[];
  }[];
}

export interface Match {
  id: string;
  team1: string;
  team1Logo: string;
  team2: string;
  team2Logo: string;
  date: string;
  venue: string;
  status: 'upcoming' | 'live' | 'completed';
  series: string;
  pitchReport?: string;
  weather?: string;
  lineupsOut?: boolean;
  toss?: {
    winner: string;
    decision: 'bat' | 'bowl';
  };
  hasSquad?: boolean;
  dataSource?: 'api' | 'manual';
  externalId?: string; // Cricbuzz match ID
  pointsUpdatedAt?: number;
  liveScore?: LiveScore;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  over: number;
  ball: number;
  batterId: string;
  bowlerId: string;
  runs: number;
  extras: number;
  wicket?: {
    type: string;
    playerDismissedId: string;
  };
  timestamp: number;
}

export interface AppConfig {
  adminPin?: string;
}

export interface UserTeam {
  id: string;
  matchId: string;
  userId: string;
  name: string;
  players: string[]; // player IDs
  captainId: string;
  viceCaptainId: string;
  totalPoints?: number;
  createdAt: number;
}

export interface Contest {
  id: string;
  matchId: string;
  creatorId: string;
  name: string;
  entryFee: number;
  capacity: number;
  joinedUsers: string[];
  joinedTeamIds?: Record<string, string>; // userId -> teamId
  filledSpots?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  photoURL?: string;
  whatsapp?: string;
  balance: number;
}
