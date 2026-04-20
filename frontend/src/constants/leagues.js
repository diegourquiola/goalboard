export const LEAGUES = [
  { code: 'PL',  label: 'Premier League',   logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { code: 'PD',  label: 'La Liga',          logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { code: 'BL1', label: 'Bundesliga',       logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { code: 'SA',  label: 'Serie A',          logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { code: 'FL1', label: 'Ligue 1',          logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { code: 'CL',  label: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
];

export const LEAGUE_ZONES = {
  PL:  { clSpots: 4, relegationStart: 18 },
  PD:  { clSpots: 4, relegationStart: 18 },
  SA:  { clSpots: 4, relegationStart: 18 },
  FL1: { clSpots: 4, relegationStart: 18 },
  BL1: { clSpots: 4, relegationStart: 17 },
  CL:  { clSpots: 0, relegationStart: null },
};
