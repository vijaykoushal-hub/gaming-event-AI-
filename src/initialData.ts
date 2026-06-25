import { TournamentEvent, LeaderboardRank } from "./types";

export const INITIAL_TOURNAMENTS: TournamentEvent[] = [
  {
    id: "bgmi-india-classic-2026",
    title: "BGMI India Classic 2026",
    game: "BGMI (Battlegrounds Mobile India)",
    description: "The ultimate survival showdown of BGMI mobile superstars! 64 teams battle across Erangel for the supreme championship crown.",
    fee: 150,
    prizePool: 50000,
    date: "2026-06-25T18:00",
    status: "upcoming",
    maxParticipants: 64,
    slotsFilled: 48,
    rules: "1. Squad Mode (TPP).\n2. Erangel & Miramar map pool.\n3. Emulators are prohibited.\n4. Standard Esport point systems hold.",
    firstPrize: 30000,
    secondPrize: 15000,
    thirdPrize: 5000,
    duration: "4h 30m"
  },
  {
    id: "valorant-neon-strike-2026",
    title: "Valorant Neon Strike Masters",
    game: "Valorant (PC)",
    description: "An open bracket tactical 5v5 shooter fest. Climb through double elimination stages to declare the radiant champions.",
    fee: 250,
    prizePool: 75000,
    date: "2026-06-18T15:00",
    status: "live",
    maxParticipants: 32,
    slotsFilled: 31,
    rules: "1. 5v5 Competitive tournament rules.\n2. Single map veto ban-pick on Discord.\n3. Tactical timeouts: 1 per half.\n4. Screenshots of end screen required.",
    firstPrize: 45000,
    secondPrize: 22500,
    thirdPrize: 7500,
    duration: "3h 15m"
  },
  {
    id: "free-fire-ultimate-clash-2026",
    title: "Free Fire Ultimate Clash",
    game: "Free Fire",
    description: "Unleash your fast paced mechanical survival tactics in the speed round Bermuda ultimate clash.",
    fee: 0,
    prizePool: 15000,
    date: "2026-06-12T12:00",
    status: "completed",
    maxParticipants: 100,
    slotsFilled: 100,
    rules: "1. Solo Matchmaking Tournament.\n2. Strict anti-cheat monitoring active.\n3. Top 3 contenders share prizes.",
    firstPrize: 9000,
    secondPrize: 4500,
    thirdPrize: 1500,
    duration: "2h 00m"
  },
  {
    id: "cod-mobile-warzone-2026",
    title: "CODM Warzone Arena Tour",
    game: "COD Mobile",
    description: "Multiplayer 5v5 Search and Destroy. Tight coordination, instant executions, grand prizes.",
    fee: 100,
    prizePool: 30000,
    date: "2026-06-29T19:30",
    status: "upcoming",
    maxParticipants: 40,
    slotsFilled: 12,
    rules: "1. Mode: Search & Destroy.\n2. Best of 11 rounds map wins.\n3. iPad and phone players allowed.",
    firstPrize: 18000,
    secondPrize: 9000,
    thirdPrize: 3000,
    duration: "2h 45m"
  }
];

export const INITIAL_LEADERBOARD: LeaderboardRank[] = [
  { id: "rank-1", userId: "user-alpha", username: "Hydra_Soul", points: 2850, wins: 18, earnings: 14500, rank: 1, previousRank: 2, kills: 142, platform: "PC", region: "India" },
  { id: "rank-2", userId: "user-beta", username: "ViperGG", points: 2420, wins: 14, earnings: 11200, rank: 2, previousRank: 1, kills: 118, platform: "Mobile", region: "Global" },
  { id: "rank-3", userId: "user-gamma", username: "Mortal_OP", points: 2190, wins: 11, earnings: 8900, rank: 3, previousRank: 3, kills: 95, platform: "Mobile", region: "India" },
  { id: "rank-4", userId: "user-delta", username: "Alpha_Sniper", points: 1980, wins: 9, earnings: 6200, rank: 4, previousRank: 6, kills: 88, platform: "PC", region: "Global" },
  { id: "rank-5", userId: "user-epsilon", username: "Scout_Jr", points: 1750, wins: 8, earnings: 4500, rank: 5, previousRank: 4, kills: 74, platform: "Console", region: "India" },
  { id: "rank-6", userId: "user-zeta", username: "Nova_Queen", points: 1600, wins: 6, earnings: 3800, rank: 6, previousRank: 5, kills: 63, platform: "PC", region: "Global" }
];
