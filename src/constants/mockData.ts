import { Player } from '../types';

export const MATCHES: any[] = [
  {
    id: 'ipl-2026-01',
    team1: 'CSK',
    team1Logo: 'https://bkt-sports-prod.s3.amazonaws.com/teams/csk.png',
    team2: 'MI',
    team2Logo: '/mi_logo.png',
    date: '2026-04-24T19:30:00Z',
    venue: 'MA Chidambaram Stadium, Chennai',
    status: 'upcoming',
    series: 'TATA IPL 2026',
    pitchReport: 'Batting friendly, slight turn for spinners. Dew expected in second half.',
    weather: 'Clear, 28°C'
  },
  {
    id: 'ipl-2026-02',
    team1: 'RCB',
    team2: 'KKR',
    date: '2026-04-25T19:30:00Z',
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    status: 'upcoming',
    series: 'TATA IPL 2026',
    pitchReport: 'High scoring pitch, short boundaries. Fast bowlers will get some swing early.',
    weather: 'Mainly Cloudy, 24°C'
  }
];

export const PLAYERS: Record<string, Player[]> = {
  'ipl-2026-01': [
    // CSK
    { id: 'csk-1', name: 'MS Dhoni', team: 'CSK', position: 'WK', credits: 9.5, points: 0, selectedBy: 85, playing: true },
    { id: 'csk-2', name: 'Ruturaj Gaikwad', team: 'CSK', position: 'BAT', credits: 10.5, points: 0, selectedBy: 92, playing: true },
    { id: 'csk-3', name: 'Shivam Dube', team: 'CSK', position: 'AR', credits: 9.0, points: 0, selectedBy: 78, playing: true },
    { id: 'csk-4', name: 'Ravindra Jadeja', team: 'CSK', position: 'AR', credits: 10.0, points: 0, selectedBy: 88, playing: true },
    { id: 'csk-5', name: 'Matheesha Pathirana', team: 'CSK', position: 'BOWL', credits: 9.0, points: 0, selectedBy: 65, playing: true },
    { id: 'csk-6', name: 'Deepak Chahar', team: 'CSK', position: 'BOWL', credits: 8.5, points: 0, selectedBy: 45, playing: true },
    { id: 'csk-7', name: 'Daryl Mitchell', team: 'CSK', position: 'BAT', credits: 8.5, points: 0, selectedBy: 40, playing: true },
    { id: 'csk-8', name: 'Ajinkya Rahane', team: 'CSK', position: 'BAT', credits: 8.0, points: 0, selectedBy: 30, playing: true },
    { id: 'csk-9', name: 'Tushar Deshpande', team: 'CSK', position: 'BOWL', credits: 7.5, points: 0, selectedBy: 25, playing: true },
    { id: 'csk-10', name: 'Shardul Thakur', team: 'CSK', position: 'BOWL', credits: 8.0, points: 0, selectedBy: 20, playing: true },
    { id: 'csk-11', name: 'Maheesh Theekshana', team: 'CSK', position: 'BOWL', credits: 8.5, points: 0, selectedBy: 15, playing: true },
    { id: 'csk-12', name: 'Sameer Rizvi', team: 'CSK', position: 'BAT', credits: 7.0, points: 0, selectedBy: 5, playing: true },
    { id: 'csk-13', name: 'Devon Conway', team: 'CSK', position: 'BAT', credits: 9.5, points: 0, selectedBy: 12, playing: false },
    // MI
    { id: 'mi-1', name: 'Ishan Kishan', team: 'MI', position: 'WK', credits: 9.0, points: 0, selectedBy: 70, playing: true },
    { id: 'mi-2', name: 'Rohit Sharma', team: 'MI', position: 'BAT', credits: 10.5, points: 0, selectedBy: 90, playing: true },
    { id: 'mi-3', name: 'Suryakumar Yadav', team: 'MI', position: 'BAT', credits: 11.0, points: 0, selectedBy: 95, playing: true },
    { id: 'mi-4', name: 'Hardik Pandya', team: 'MI', position: 'AR', credits: 9.5, points: 0, selectedBy: 80, playing: true },
    { id: 'mi-5', name: 'Jasprit Bumrah', team: 'MI', position: 'BOWL', credits: 11.0, points: 0, selectedBy: 98, playing: true },
    { id: 'mi-6', name: 'Gerald Coetzee', team: 'MI', position: 'BOWL', credits: 8.5, points: 0, selectedBy: 50, playing: true },
    { id: 'mi-7', name: 'Tilak Varma', team: 'MI', position: 'BAT', credits: 8.5, points: 0, selectedBy: 60, playing: true },
    { id: 'mi-8', name: 'Tim David', team: 'MI', position: 'BAT', credits: 8.0, points: 0, selectedBy: 40, playing: true },
    { id: 'mi-9', name: 'Romario Shepherd', team: 'MI', position: 'AR', credits: 8.0, points: 0, selectedBy: 35, playing: true },
    { id: 'mi-10', name: 'Akash Madhwal', team: 'MI', position: 'BOWL', credits: 7.5, points: 0, selectedBy: 20, playing: true },
    { id: 'mi-11', name: 'Piyush Chawla', team: 'MI', position: 'BOWL', credits: 8.0, points: 0, selectedBy: 15, playing: true },
    { id: 'mi-12', name: 'Nehal Wadhera', team: 'MI', position: 'BAT', credits: 7.5, points: 0, selectedBy: 8, playing: true },
  ],
  'ipl-2026-02': [
    // RCB
    { id: 'rcb-1', name: 'Virat Kohli', team: 'RCB', position: 'BAT', credits: 11.0, points: 0, selectedBy: 99, playing: true },
    { id: 'rcb-2', name: 'Faf du Plessis', team: 'RCB', position: 'BAT', credits: 10.0, points: 0, selectedBy: 85, playing: true },
    { id: 'rcb-3', name: 'Glenn Maxwell', team: 'RCB', position: 'AR', credits: 10.0, points: 0, selectedBy: 80, playing: true },
    { id: 'rcb-4', name: 'Mohammed Siraj', team: 'RCB', position: 'BOWL', credits: 9.0, points: 0, selectedBy: 75, playing: true },
    { id: 'rcb-5', name: 'Dinesh Karthik', team: 'RCB', position: 'WK', credits: 8.5, points: 0, selectedBy: 60, playing: true },
    { id: 'rcb-6', name: 'Cameron Green', team: 'RCB', position: 'AR', credits: 9.0, points: 0, selectedBy: 55, playing: true },
    { id: 'rcb-7', name: 'Rajat Patidar', team: 'RCB', position: 'BAT', credits: 8.5, points: 0, selectedBy: 45, playing: true },
    { id: 'rcb-8', name: 'Will Jacks', team: 'RCB', position: 'AR', credits: 8.0, points: 0, selectedBy: 30, playing: true },
    { id: 'rcb-9', name: 'Yash Dayal', team: 'RCB', position: 'BOWL', credits: 7.5, points: 0, selectedBy: 20, playing: true },
    { id: 'rcb-10', name: 'Lockie Ferguson', team: 'RCB', position: 'BOWL', credits: 8.5, points: 0, selectedBy: 25, playing: true },
    { id: 'rcb-11', name: 'Karn Sharma', team: 'RCB', position: 'BOWL', credits: 8.0, points: 0, selectedBy: 15, playing: true },
    // KKR
    { id: 'kkr-1', name: 'Shreyas Iyer', team: 'KKR', position: 'BAT', credits: 9.5, points: 0, selectedBy: 75, playing: true },
    { id: 'kkr-2', name: 'Sunil Narine', team: 'KKR', position: 'AR', credits: 10.5, points: 0, selectedBy: 92, playing: true },
    { id: 'kkr-3', name: 'Andre Russell', team: 'KKR', position: 'AR', credits: 10.5, points: 0, selectedBy: 90, playing: true },
    { id: 'kkr-4', name: 'Rinku Singh', team: 'KKR', position: 'BAT', credits: 9.5, points: 0, selectedBy: 85, playing: true },
    { id: 'kkr-5', name: 'Mitchell Starc', team: 'KKR', position: 'BOWL', credits: 10.5, points: 0, selectedBy: 88, playing: true },
    { id: 'kkr-6', name: 'Phil Salt', team: 'KKR', position: 'WK', credits: 9.0, points: 0, selectedBy: 70, playing: true },
    { id: 'kkr-7', name: 'Varun Chakaravarthy', team: 'KKR', position: 'BOWL', credits: 9.0, points: 0, selectedBy: 65, playing: true },
    { id: 'kkr-8', name: 'Venkatesh Iyer', team: 'KKR', position: 'BAT', credits: 8.5, points: 0, selectedBy: 50, playing: true },
    { id: 'kkr-9', name: 'Harshit Rana', team: 'KKR', position: 'BOWL', credits: 8.0, points: 0, selectedBy: 40, playing: true },
    { id: 'kkr-10', name: 'Nitish Rana', team: 'KKR', position: 'BAT', credits: 8.5, points: 0, selectedBy: 35, playing: true },
    { id: 'kkr-11', name: 'Vaibhav Arora', team: 'KKR', position: 'BOWL', credits: 7.5, points: 0, selectedBy: 10, playing: true },
  ]
};
