import { Match, Player } from "../types";

export const FALLBACK_MATCHES: Match[] = [
  {
    id: "ipl-2026-01",
    team1: "CSK",
    team1Logo: "",
    team2: "MI",
    team2Logo: "",
    date: new Date().toISOString(),
    venue: "MA Chidambaram Stadium, Chennai",
    status: "live",
    series: "TATA IPL 2026",
    lineupsOut: true
  },
  {
    id: "ipl-2026-02",
    team1: "RCB",
    team1Logo: "",
    team2: "KKR",
    team2Logo: "",
    date: new Date(Date.now() + 86400000).toISOString(),
    venue: "M. Chinnaswamy Stadium, Bengaluru",
    status: "upcoming",
    series: "TATA IPL 2026",
    lineupsOut: false
  },
  {
    id: "ipl-2026-03",
    team1: "GT",
    team1Logo: "",
    team2: "RR",
    team2Logo: "",
    date: new Date(Date.now() + 172800000).toISOString(),
    venue: "Narendra Modi Stadium, Ahmedabad",
    status: "upcoming",
    series: "TATA IPL 2026",
    lineupsOut: false
  },
  {
    id: "ipl-2026-04",
    team1: "LSG",
    team1Logo: "",
    team2: "PBKS",
    team2Logo: "",
    date: new Date(Date.now() + 259200000).toISOString(),
    venue: "Ekana Cricket Stadium, Lucknow",
    status: "upcoming",
    series: "TATA IPL 2026",
    lineupsOut: false
  },
  {
    id: "ipl-2026-05",
    team1: "DC",
    team1Logo: "",
    team2: "SRH",
    team2Logo: "",
    date: new Date(Date.now() + 345600000).toISOString(),
    venue: "Arun Jaitley Stadium, Delhi",
    status: "upcoming",
    series: "TATA IPL 2026",
    lineupsOut: false
  }
];

import { TEAM_LOGOS } from "../constants/teamLogos";

export const getTeamLogo = (teamName: string, currentUrl?: string) => {
  if (!teamName) return "https://placehold.co/100x100/1e293b/white?text=TBA";
  
  const t = teamName.toUpperCase().trim();
  
  // 1. Exact match in TEAM_LOGOS
  if (TEAM_LOGOS[t]) return TEAM_LOGOS[t];
  
  // 2. Fuzzy match in TEAM_LOGOS
  const logoKey = Object.keys(TEAM_LOGOS).find(key => {
    const k = key.toUpperCase();
    return t === k || 
           t.includes(k) || 
           k.includes(t) ||
           (t.length > 2 && k.startsWith(t)) ||
           (k.length > 2 && t.startsWith(k));
  });
  
  if (logoKey) return TEAM_LOGOS[logoKey];

  // 3. Use current URL if it looks like a real external URL or local path and isn't a placeholder
  if (currentUrl && (currentUrl.startsWith('http') || currentUrl.startsWith('/')) && !currentUrl.includes('placehold.co')) {
    return currentUrl;
  }

  // 4. Final fallback to placeholder
  const initials = teamName.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase() || teamName.substring(0, 3).toUpperCase();
  return `https://placehold.co/100x100/1e293b/white?text=${initials}`;
};

export const getFallbackSquad = (team1: string, team2: string): Player[] => {
  const players: Player[] = [];
  const teams = [team1, team2];
  
  teams.forEach(team => {
    const isCSK = team === 'CSK';
    const isMI = team === 'MI';
    
    // Add some realistic players if it's CSK or MI
    if (isCSK) {
       players.push(
         { id: 'csk-1', name: 'Ruturaj Gaikwad', team: 'CSK', position: 'BAT', credits: 10.5, playing: true, points: 45, selectedBy: 85 },
         { id: 'csk-2', name: 'MS Dhoni', team: 'CSK', position: 'WK', credits: 9.0, playing: true, points: 20, selectedBy: 92 },
         { id: 'csk-3', name: 'Ravindra Jadeja', team: 'CSK', position: 'AR', credits: 10.0, playing: true, points: 60, selectedBy: 88 },
         { id: 'csk-4', name: 'Matheesha Pathirana', team: 'CSK', position: 'BOWL', credits: 9.5, playing: true, points: 30, selectedBy: 75 },
         { id: 'csk-5', name: 'Shivam Dube', team: 'CSK', position: 'BAT', credits: 9.0, playing: true, points: 40, selectedBy: 70 }
       );
    } else if (isMI) {
        players.push(
          { id: 'mi-1', name: 'Hardik Pandya', team: 'MI', position: 'AR', credits: 10.5, playing: true, points: 50, selectedBy: 80 },
          { id: 'mi-2', name: 'Rohit Sharma', team: 'MI', position: 'BAT', credits: 10.0, playing: true, points: 35, selectedBy: 85 },
          { id: 'mi-3', name: 'Jasprit Bumrah', team: 'MI', position: 'BOWL', credits: 11.0, playing: true, points: 70, selectedBy: 95 },
          { id: 'mi-4', name: 'Suryakumar Yadav', team: 'MI', position: 'BAT', credits: 10.5, playing: true, points: 55, selectedBy: 90 },
          { id: 'mi-5', name: 'Ishan Kishan', team: 'MI', position: 'WK', credits: 9.0, playing: true, points: 25, selectedBy: 65 }
        );
    }
    
    // Fill the rest with generic high quality names for the demo
    const roles: ('WK' | 'BAT' | 'AR' | 'BOWL')[] = ['WK', 'BAT', 'BAT', 'BAT', 'AR', 'AR', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL'];
    roles.forEach((role, i) => {
       if (players.filter(p => p.team === team).length < 11) {
          players.push({
            id: `${team.toLowerCase()}-p-${i}`,
            name: `${team} Player ${i + 1}`,
            team: team,
            position: role,
            credits: 8.0 + Math.random() * 2,
            playing: Math.random() > 0.3,
            points: Math.floor(Math.random() * 50),
            selectedBy: Math.floor(Math.random() * 40) + 10
          });
       }
    });
  });
  
  return players;
};
