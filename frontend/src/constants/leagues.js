export const LEAGUES = [
  { code: 'PL',  id: 39,  label: 'Premier League',   logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { code: 'PD',  id: 140, label: 'La Liga',          logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { code: 'BL1', id: 78,  label: 'Bundesliga',       logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { code: 'SA',  id: 135, label: 'Serie A',          logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { code: 'FL1', id: 61,  label: 'Ligue 1',          logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { code: 'CL',  id: 2,   label: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
];

export const LEAGUE_ZONES = {
  PL:  { clSpots: 4, relegationStart: 18 },
  PD:  { clSpots: 4, relegationStart: 18 },
  SA:  { clSpots: 4, relegationStart: 18 },
  FL1: { clSpots: 4, relegationStart: 18 },
  BL1: { clSpots: 4, relegationStart: 17 },
  CL:  { clSpots: 8, playoffSpots: 24, relegationStart: null },
};
