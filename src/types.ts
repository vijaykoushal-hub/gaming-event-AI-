export interface PaymentMethod {
  id: string;
  type: "upi" | "bank" | "paypal";
  alias: string;
  details: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  accountHolder?: string;
  paypalEmail?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  role: "user" | "admin";
  avatar: string;
  verified: boolean;
  twoFactorEnabled: boolean;
  walletBalance: number;
  earnings: number;
  discordWebhook: string;
  bio: string;
  cardTagline?: string;
  cardTheme?: "cyberpunk" | "neon" | "gold" | "crimson";
  preferredGame?: string;
  preferredGames?: string[];
  badges?: string[];
  phoneNumber?: string;
  phoneVerified?: boolean;
  banned?: boolean;
  paymentMethods?: PaymentMethod[];
}

export interface TournamentEvent {
  id: string;
  title: string;
  game: string;
  description: string;
  fee: number;
  prizePool: number;
  date: string;
  status: "upcoming" | "live" | "completed";
  maxParticipants: number;
  slotsFilled: number;
  rules: string;
  winners?: string;
  firstPrize?: number;
  secondPrize?: number;
  thirdPrize?: number;
  mapPool?: string[];
  views?: number;
  shares?: number;
  duration?: string;
  createdAt?: string;
}

export interface EventRegistration {
  id: string;
  userId: string;
  eventId: string;
  username: string;
  inGameId?: string;
  teamName: string;
  status: "registered" | "checked_in";
  paid: boolean;
  createdAt: string;
  rankAchieved?: string;
  winnings?: number;
}

export interface LeaderboardRank {
  id: string;
  userId: string;
  username: string;
  points: number;
  wins: number;
  earnings: number;
  rank?: number;
  previousRank?: number;
  avatar?: string;
  kills?: number;
  mvpPoints?: number;
  platform?: "PC" | "Mobile" | "Console" | string;
  region?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  upi: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface MatchMessage {
  id: string;
  eventId: string;
  userId: string;
  username: string;
  avatar?: string;
  text: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "addition" | "deduction" | "payout" | "withdrawal";
  amount: number;
  description: string;
  createdAt: string;
  status: "completed" | "pending" | "rejected";
}


