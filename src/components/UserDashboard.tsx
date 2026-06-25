import React, { useState, useEffect } from "react";
import { UserProfile, EventRegistration, WithdrawalRequest, TournamentEvent, WalletTransaction, PaymentMethod } from "../types";
import { User, Wallet, Shield, History, MailCheck, QrCode, ClipboardPaste, ArrowRight, Loader2, AlertTriangle, ArrowDownToLine, Settings, Check, Trophy, Hourglass, Medal, Calendar, Award, Zap, Sparkles, Coins, Share2, Plus, Minus, ArrowUpRight, TrendingUp, Target, Swords, ShieldAlert, Star, Skull, Flame, ShieldCheck, X, Volume2, VolumeX, Copy, CreditCard, Trash2 } from "lucide-react";
import { dbSubmitWithdrawal, dbSaveUserProfile, dbSubscribeWalletTransactions, dbRecordWalletTransaction, dbAdminUpdateUserProfile } from "../firebaseService";
import PaymentSettings from "./PaymentSettings";
import OnboardingOverlay from "./OnboardingOverlay";
import PaymentGatewayModal from "./PaymentGatewayModal";
import { LeaderboardRank } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

// Custom Tooltip component for the Performance Insights chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0b0f17]/95 border border-[#162235] p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px] font-mono space-y-1.5">
        <p className="font-sans font-black text-white text-xs border-b border-[#162235] pb-1 mb-1 max-w-[200px] truncate">
          {data.fullTitle}
        </p>
        <div className="flex items-center justify-between gap-6 text-gray-300">
          <span className="text-gray-400">PLACEMENT:</span>
          <span className="text-amber-400 font-bold">#{data.placement}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-gray-300">
          <span className="text-gray-400">MATCH PRIZE:</span>
          <span className="text-gaming-neon font-black">🪙 {data.earnings.toLocaleString()} Coins</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-gray-300">
          <span className="text-gray-400">AVG PLACEMENT:</span>
          <span className="text-gaming-blue font-bold">#{data.averagePlacement}</span>
        </div>
      </div>
    );
  }
  return null;
};

export interface SavedPaymentMethod {
  id: string;
  type: "upi" | "card";
  alias: string;
  details: string; // UPI ID or masked card number
  cardHolderName?: string;
  cardExpiry?: string;
  cardType?: "visa" | "mastercard" | "rupay";
}

interface UserProps {
  user: UserProfile | null;
  registrations: EventRegistration[];
  tournaments: TournamentEvent[];
  withdrawals: WithdrawalRequest[];
  onRefreshWithdrawals: () => Promise<void>;
  onRefreshProfile: () => Promise<void>;
  leaderboard?: LeaderboardRank[];
  isDarkMode?: boolean;
  setIsDarkMode?: (val: boolean) => void;
  isAutoTheme?: boolean;
  setIsAutoTheme?: (val: boolean) => void;
  sunsetHour?: number;
  setSunsetHour?: (val: number) => void;
  sunriseHour?: number;
  setSunriseHour?: (val: number) => void;
  simulatedHour?: number | null;
  setSimulatedHour?: (val: number | null) => void;
  isSoundMuted?: boolean;
  setIsSoundMuted?: (val: boolean) => void;
}

export default function UserDashboard({ 
  user, 
  registrations, 
  tournaments, 
  withdrawals, 
  onRefreshWithdrawals, 
  onRefreshProfile, 
  leaderboard = [],
  isDarkMode,
  setIsDarkMode,
  isAutoTheme,
  setIsAutoTheme,
  sunsetHour = 18,
  setSunsetHour,
  sunriseHour = 6,
  setSunriseHour,
  simulatedHour = null,
  setSimulatedHour,
  isSoundMuted = false,
  setIsSoundMuted
}: UserProps) {
  // Current screen segment
  const [activeTab, setActiveTab] = useState<"profile" | "history" | "wallet" | "transactions" | "security" | "payment">("profile");
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState<boolean>(false);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("onboardingCompleted");
      return saved !== "true";
    } catch {
      return true;
    }
  });

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
    try {
      localStorage.setItem("onboardingCompleted", "true");
    } catch (err) {
      console.error("Failed to save onboarding completed status", err);
    }
  };

  const handleReplayOnboarding = () => {
    setIsOnboardingOpen(true);
  };

  // Wallet Transaction History list
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Filter and search states for Transaction History view
  const [txFilter, setTxFilter] = useState<"all" | "addition" | "deduction" | "payout" | "withdrawal">("all");
  const [txSearch, setTxSearch] = useState("");

  // Deposit simulator states
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [depositing, setDepositing] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState("");

  // Subscribe to real-time wallet transactions
  useEffect(() => {
    if (!user?.uid) return;
    setLoadingTransactions(true);
    const unsubscribe = dbSubscribeWalletTransactions(user.uid, (data) => {
      setTransactions(data);
      setLoadingTransactions(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Profile Edit fields
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editBio, setEditBio] = useState(user?.bio || "Casual Mobile Esports Champ.");
  const [cardTagline, setCardTagline] = useState(user?.cardTagline || "Ready to Dominate!");
  const [cardTheme, setCardTheme] = useState<"cyberpunk" | "neon" | "gold" | "crimson">(user?.cardTheme || "cyberpunk");
  const [preferredGames, setPreferredGames] = useState<string[]>(
    user?.preferredGames || (user?.preferredGame ? [user.preferredGame] : ["BGMI"])
  );
  const [editAvatar, setEditAvatar] = useState(user?.avatar || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [discordWebhookInput, setDiscordWebhookInput] = useState(user?.discordWebhook || "");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState(false);

  // Email verification simulator state
  const [retractedCode, setRetractedCode] = useState("");
  const [retractedCodeUrl, setRetractedCodeUrl] = useState("");
  const [userEnteredCode, setUserEnteredCode] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  // 2FA Simulator state
  const [is2faExpanded, setIs2faExpanded] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");

  // Withdrawal cashouts
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(100);
  const [withdrawalUpi, setWithdrawalUpi] = useState("");
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState("");
  const [withdrawalSuccess, setWithdrawalSuccess] = useState("");

  // Saved Payment Methods state
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedTopUpMethodId, setSelectedTopUpMethodId] = useState<string>("");
  const [newMethodType, setNewMethodType] = useState<"upi" | "card">("upi");
  const [newMethodAlias, setNewMethodAlias] = useState("");
  const [newMethodDetails, setNewMethodDetails] = useState("");
  const [newCardHolderName, setNewCardHolderName] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardType, setNewCardType] = useState<"visa" | "mastercard" | "rupay">("visa");
  const [addMethodError, setAddMethodError] = useState("");
  const [addMethodSuccess, setAddMethodSuccess] = useState("");

  // Load payment methods on user load or change
  useEffect(() => {
    if (!user?.uid) return;
    const storageKey = `saved_payment_methods_${user.uid}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SavedPaymentMethod[];
        setSavedPaymentMethods(parsed);
        if (parsed.length > 0) {
          setSelectedTopUpMethodId(parsed[0].id);
        }
      } catch (e) {
        console.error("Error parsing saved payment methods", e);
      }
    } else {
      // Default initial payment methods for excellent sandbox UX
      const defaults: SavedPaymentMethod[] = [
        {
          id: "pm_default_upi",
          type: "upi",
          alias: "Google Pay (Personal)",
          details: `${user.username.toLowerCase()}@okaxis`,
          cardType: "gpay" as any
        },
        {
          id: "pm_default_card",
          type: "card",
          alias: "Primary HDFC Card",
          details: "4532 •••• •••• 8824",
          cardHolderName: user.username.toUpperCase(),
          cardExpiry: "12/29",
          cardType: "visa"
        }
      ];
      setSavedPaymentMethods(defaults);
      setSelectedTopUpMethodId(defaults[0].id);
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    }
  }, [user?.uid, user?.username]);

  // Timeline & active-tab states
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "active">("all");
  const [selectedCompletedEvent, setSelectedCompletedEvent] = useState<any | null>(null);

  // Build entire list of timeline elements from Seeded Historic + Real Live Db Registrations
  const getTimelineItems = () => {
    // 1. Seeded Legendary past participation
    const seededList: Array<{
      id: string;
      title: string;
      game: string;
      teamName: string;
      username: string;
      inGameId?: string;
      date: string;
      status: "completed" | "upcoming" | "live";
      fee: number;
      paid: boolean;
      rankAchieved: string;
      winnings: number;
      isSeeded: boolean;
    }> = [
      {
        id: "seeded-hist-1",
        title: "BGMI India Classic Masters",
        game: "BGMI",
        teamName: "Soul Reapers",
        username: user?.username || "GuestGamer",
        date: "2026-05-15T18:00:00Z",
        status: "completed" as const,
        fee: 150,
        paid: true,
        rankAchieved: "1st Place (Champion)",
        winnings: 15000,
        isSeeded: true
      },
      {
        id: "seeded-hist-2",
        title: "Free Fire Ultimate Clash",
        game: "Free Fire",
        teamName: "Soul Reapers",
        username: user?.username || "GuestGamer",
        date: "2026-06-12T12:00:00Z",
        status: "completed" as const,
        fee: 0,
        paid: true,
        rankAchieved: "3rd Place",
        winnings: 1500,
        isSeeded: true
      },
      {
        id: "seeded-hist-3",
        title: "GTA V Speed Run Cup",
        game: "GTA V",
        teamName: "NoSquad Solo",
        username: user?.username || "GuestGamer",
        date: "2026-04-10T14:30:00Z",
        status: "completed" as const,
        fee: 50,
        paid: true,
        rankAchieved: "Participant (Top 25)",
        winnings: 0,
        isSeeded: true
      }
    ];

    // 2. Real database registrations mapped to tournament details
    const dbList = registrations.map((reg) => {
      const match = tournaments.find((t) => t.id === reg.eventId);
      
      // Determine rank & winnings dynamically
      let rank = reg.rankAchieved;
      let cash = reg.winnings;

      if (match?.status === "completed") {
        if (!rank) {
          // Check if user is listed in winners string (case insensitive search)
          const isWinnerMatch = match.winners && (
            match.winners.toLowerCase().includes(reg.username.toLowerCase()) ||
            match.winners.toLowerCase().includes((user?.username || "").toLowerCase()) ||
            match.winners.toLowerCase().includes((reg.teamName || "").toLowerCase())
          );
          rank = isWinnerMatch ? "1st Place (Champion)" : "Participant";
          cash = isWinnerMatch ? Math.floor(match.prizePool * 0.5) : 0;
        }
      }

      return {
        id: reg.id,
        title: match?.title || "Tournament " + reg.eventId,
        game: match?.game || "Battle Royale",
        teamName: reg.teamName,
        username: reg.username,
        inGameId: reg.inGameId,
        date: match?.date || reg.createdAt,
        status: match?.status || "upcoming",
        fee: match?.fee || 0,
        paid: reg.paid,
        rankAchieved: rank,
        winnings: cash,
        isSeeded: false
      };
    });

    // Combine both
    const combined = [...dbList, ...seededList];

    // Sort by date (descending, newest first)
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Dynamic automatically calculated badges
  const getDynamicBadges = () => {
    // 1. Find user's leaderboard stats
    const boardEntry = leaderboard.find((entry) => entry.userId === user?.uid);
    const userKills = boardEntry?.kills || 0;
    const userWins = boardEntry?.wins || 0;
    const maxKillsOnBoard = leaderboard.length > 0 ? Math.max(...leaderboard.map((r) => r.kills ?? 0)) : 0;

    const completedMatches = getTimelineItems().filter((item) => item.status === "completed");

    return [
      {
        id: "rookie",
        name: "Rookie Recruit",
        description: "Registered successfully as a verified contender on the platform.",
        unlocked: true,
        icon: <Award className="h-4 w-4" />,
        colorClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        borderColorClass: "border-blue-500/30",
      },
      {
        id: "first_blood",
        name: "First Blood",
        description: "Successfully secured your first tournament registration.",
        unlocked: registrations.length >= 1,
        icon: <Target className="h-4 w-4" />,
        colorClass: "bg-gaming-pink/10 text-gaming-pink border border-gaming-pink/20",
        borderColorClass: "border-gaming-pink/30",
      },
      {
        id: "veteran",
        name: "Tournament Veteran",
        description: "Enrolled in 3 or more high-stakes esports tournaments.",
        unlocked: registrations.length >= 3,
        icon: <Swords className="h-4 w-4" />,
        colorClass: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
        borderColorClass: "border-purple-500/30",
      },
      {
        id: "deadeye",
        name: "Sharp Shooter",
        description: "Accumulated 10 or more kills on the master leaderboards.",
        unlocked: userKills >= 10,
        icon: <Skull className="h-4 w-4" />,
        colorClass: "bg-red-500/10 text-red-400 border border-red-500/20",
        borderColorClass: "border-red-500/30",
      },
      {
        id: "top_frag",
        name: "Top Frag",
        description: "Held the highest kill record across the entire platform's active seasons.",
        unlocked: userKills > 0 && userKills === maxKillsOnBoard,
        icon: <Flame className="h-4 w-4" />,
        colorClass: "bg-gaming-neon/15 text-gaming-neon border border-gaming-neon/20 shadow-[0_0_12px_rgba(20,184,166,0.25)]",
        borderColorClass: "border-gaming-neon/45",
      },
      {
        id: "conqueror",
        name: "Apex Predator",
        description: "Clinched 3 or more custom lobby wins or 1st place finishes.",
        unlocked: userWins >= 3 || (completedMatches.some(item => item.rankAchieved?.toLowerCase().includes("1st"))),
        icon: <Trophy className="h-4 w-4" />,
        colorClass: "bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
        borderColorClass: "border-amber-500/40",
      },
      {
        id: "high_roller",
        name: "High Roller",
        description: "Hold 1,000 Coins or more in your virtual wallet balance.",
        unlocked: (user?.walletBalance || 0) >= 1000,
        icon: <Coins className="h-4 w-4" />,
        colorClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        borderColorClass: "border-emerald-500/30",
      },
      {
        id: "prize_winner",
        name: "Prize Winner",
        description: "Accumulated 100 Coins or more in total tournament earnings payouts.",
        unlocked: (user?.earnings || 0) >= 100,
        icon: <Sparkles className="h-4 w-4" />,
        colorClass: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
        borderColorClass: "border-yellow-500/30",
      },
      {
        id: "otp_verified",
        name: "OTP Verified",
        description: "Successfully secured account safety with mobile device OTP verification.",
        unlocked: !!user?.phoneVerified,
        icon: <ShieldCheck className="h-4 w-4" />,
        colorClass: "bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_12px_rgba(20,184,166,0.2)]",
        borderColorClass: "border-teal-500/30",
      },
    ];
  };

  // Initialize form fields once user is loaded
  useEffect(() => {
    if (user) {
      setEditUsername(user.username);
      setEditBio(user.bio || "Esports Enthusiast!");
      setCardTagline(user.cardTagline || "Ready to Dominate!");
      setCardTheme(user.cardTheme || "cyberpunk");
      setPreferredGames(user.preferredGames || (user.preferredGame ? [user.preferredGame] : ["BGMI"]));
      setEditAvatar(user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`);
      setDiscordWebhookInput(user.discordWebhook || "");
    }
  }, [user]);

  // Submit profile details
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg("");

    try {
      const updatedProfile: UserProfile = {
        ...user,
        username: editUsername,
        bio: editBio,
        cardTagline: cardTagline,
        cardTheme: cardTheme,
        preferredGame: preferredGames[0] || "",
        preferredGames: preferredGames,
        avatar: editAvatar
      };
      await dbSaveUserProfile(updatedProfile);
      setProfileMsg("🎉 Profile passport details updated successfully!");
      await onRefreshProfile();
    } catch (err: any) {
      setProfileMsg(`⚠️ Failed: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // Dispatch mock email verification
  const handleRequestVerificationCode = async () => {
    if (!user) return;
    setVerificationLoading(true);
    setVerificationError("");
    setRetractedCode("");

    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (res.ok) {
        setRetractedCode(data.code); // Store code so user sees and uses it inside mockup
        setRetractedCodeUrl(data.testMailboxUrl || "");
        setVerificationError("");
      } else {
        setVerificationError(data.error);
      }
    } catch (err: any) {
      setVerificationError("Network failure");
    } finally {
      setVerificationLoading(false);
    }
  };

  // Confirm verification code
  const handleConfirmVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (userEnteredCode !== retractedCode) {
      setVerificationError("Invalid 6-digit code. Please enter the code shown above.");
      return;
    }

    setVerificationLoading(true);
    try {
      const updatedProfile: UserProfile = {
        ...user,
        verified: true
      };
      await dbSaveUserProfile(updatedProfile);
      setVerificationSuccess(true);
      await onRefreshProfile();
    } catch (err: any) {
      setVerificationError("Firestore error saving status");
    } finally {
      setVerificationLoading(false);
    }
  };

  // Enable 2FA
  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (twoFactorCode !== "123456" && twoFactorCode !== "123 456") {
      setTwoFactorError("Please type '123456' to confirm the authenticator pairing.");
      return;
    }

    setVerificationLoading(true);
    setTwoFactorError("");
    try {
      const updatedProfile: UserProfile = {
        ...user,
        twoFactorEnabled: true
      };
      await dbSaveUserProfile(updatedProfile);
      setIs2faExpanded(false);
      await onRefreshProfile();
    } catch (err: any) {
      setTwoFactorError("Error saving 2FA settings");
    } finally {
      setVerificationLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!user) return;
    try {
      const updatedProfile: UserProfile = {
        ...user,
        twoFactorEnabled: false
      };
      await dbSaveUserProfile(updatedProfile);
      await onRefreshProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePaymentMethods = async (methods: PaymentMethod[]) => {
    if (!user) return;
    try {
      const updatedProfile: UserProfile = {
        ...user,
        paymentMethods: methods
      };
      await dbSaveUserProfile(updatedProfile);
      await onRefreshProfile();
    } catch (err) {
      console.error("Error updating payment methods:", err);
      throw err;
    }
  };

  const handleSaveDiscordWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingWebhook(true);
    setWebhookSuccess(false);
    try {
      const updatedProfile: UserProfile = {
        ...user,
        discordWebhook: discordWebhookInput.trim()
      };
      await dbSaveUserProfile(updatedProfile);
      await onRefreshProfile();
      setWebhookSuccess(true);
      setTimeout(() => setWebhookSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving webhook:", err);
    } finally {
      setSavingWebhook(false);
    }
  };

  // Submit withdrawal request
  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setWithdrawalError("");
    setWithdrawalSuccess("");

    if (withdrawalUpi.trim().length < 5) {
      setWithdrawalError("Please enter a valid UPI address, PayPal email, or Bank account details.");
      return;
    }
    if (withdrawalAmount < 50) {
      setWithdrawalError("Minimum cashout is 50 Coins");
      return;
    }
    if (withdrawalAmount > user.walletBalance) {
      setWithdrawalError("Requested amount exceeds current wallet balance!");
      return;
    }

    setWithdrawalLoading(true);
    try {
      const wId = "WTH-" + Math.floor(100000 + Math.random() * 900000);
      const newRequest: WithdrawalRequest = {
        id: wId,
        userId: user.uid,
        username: user.username,
        amount: Number(withdrawalAmount),
        upi: withdrawalUpi,
        status: "pending",
        createdAt: new Date().toISOString()
      };

      await dbSubmitWithdrawal(newRequest);
      setWithdrawalSuccess(`🎉 Cashout requested! 🪙 ${withdrawalAmount} Coins is frozen pending approval.`);
      setWithdrawalAmount(100);
      await onRefreshWithdrawals();
      await onRefreshProfile();
    } catch (err: any) {
      setWithdrawalError(err.message || "Failed to submit withdrawal request.");
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const [copiedWithdrawalIds, setCopiedWithdrawalIds] = useState<Record<string, boolean>>({});

  const handleCopyWithdrawal = async (w: WithdrawalRequest) => {
    const shareText = `🏆 EARNINGS CASHOUT RECORD 🏆
-----------------------------
ID: ${w.id}
Amount: 🪙 ${w.amount.toLocaleString("en-IN")} Coins
UPI Handle: ${w.upi}
Status: ${w.status.toUpperCase()}
Date: ${new Date(w.createdAt).toLocaleDateString()}
-----------------------------
Shared via Esports Portal`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedWithdrawalIds((prev) => ({ ...prev, [w.id]: true }));
      setTimeout(() => {
        setCopiedWithdrawalIds((prev) => ({ ...prev, [w.id]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy withdrawal record:", err);
    }
  };

  // Submit deposit simulator action
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setDepositSuccessMsg("");

    if (depositAmount <= 0) {
      return;
    }

    // Open the Secure Payment Gateway Modal instead of directly depositing
    setIsPaymentGatewayOpen(true);
  };

  // Called when payment is successfully authorized in the PaymentGatewayModal
  const handlePaymentGatewaySuccess = async () => {
    if (!user) return;
    setIsPaymentGatewayOpen(false);
    setDepositing(true);
    try {
      const newBalance = (user.walletBalance || 0) + depositAmount;
      await dbAdminUpdateUserProfile(user.uid, { walletBalance: newBalance });
      
      // Log wallet transaction
      await dbRecordWalletTransaction(
        user.uid,
        "addition",
        depositAmount,
        `Credit card / UPI wallet addition`,
        "completed"
      );

      // Select the payment method used
      const activeMethod = savedPaymentMethods.find(m => m.id === selectedTopUpMethodId);
      const methodLabel = activeMethod 
        ? `${activeMethod.alias} (${activeMethod.details})`
        : "Credit card / UPI";

      setDepositSuccessMsg(`🎉 Wallet added successfully! 🪙 ${depositAmount} Coins has been purchased & credited via ${methodLabel}.`);
      setDepositAmount(500);
      await onRefreshProfile();
    } catch (err) {
      console.error("Deposit error:", err);
    } finally {
      setDepositing(false);
    }
  };

  // Saved payment methods action handlers
  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setAddMethodError("");
    setAddMethodSuccess("");

    if (!newMethodAlias.trim()) {
      setAddMethodError("Please enter an alias/name for this payment method.");
      return;
    }

    let detailsToSave = newMethodDetails.trim();
    let detectedCardType: "visa" | "mastercard" | "rupay" | undefined;

    if (newMethodType === "upi") {
      if (!detailsToSave.includes("@")) {
        setAddMethodError("Please enter a valid UPI ID (e.g. name@upi).");
        return;
      }
    } else {
      // Card type validation and masking
      const digits = detailsToSave.replace(/\s+/g, "");
      if (digits.length < 12 || digits.length > 19 || isNaN(Number(digits))) {
        setAddMethodError("Please enter a valid 12-19 digit card number.");
        return;
      }
      if (!newCardHolderName.trim()) {
        setAddMethodError("Please enter the cardholder's name.");
        return;
      }
      if (!newCardExpiry.trim() || !newCardExpiry.includes("/")) {
        setAddMethodError("Please enter a valid expiry date (MM/YY).");
        return;
      }

      // Detect card type based on digits
      if (digits.startsWith("4")) {
        detectedCardType = "visa";
      } else if (/^5[1-5]/.test(digits)) {
        detectedCardType = "mastercard";
      } else {
        detectedCardType = "rupay";
      }

      const last4 = digits.slice(-4);
      const firstDigit = digits[0];
      detailsToSave = `${firstDigit}••• •••• •••• ${last4}`;
    }

    const newMethod: SavedPaymentMethod = {
      id: `pm_${Date.now()}`,
      type: newMethodType,
      alias: newMethodAlias.trim(),
      details: detailsToSave,
      cardHolderName: newMethodType === "card" ? newCardHolderName.trim().toUpperCase() : undefined,
      cardExpiry: newMethodType === "card" ? newCardExpiry.trim() : undefined,
      cardType: newMethodType === "card" ? (detectedCardType || newCardType) : undefined,
    };

    const updated = [...savedPaymentMethods, newMethod];
    setSavedPaymentMethods(updated);
    
    const storageKey = `saved_payment_methods_${user.uid}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));

    if (!selectedTopUpMethodId) {
      setSelectedTopUpMethodId(newMethod.id);
    }

    setAddMethodSuccess(`🎉 Added "${newMethod.alias}" successfully!`);
    
    // Reset form fields
    setNewMethodAlias("");
    setNewMethodDetails("");
    setNewCardHolderName("");
    setNewCardExpiry("");
  };

  const handleDeletePaymentMethod = (id: string) => {
    if (!user?.uid) return;
    const updated = savedPaymentMethods.filter((m) => m.id !== id);
    setSavedPaymentMethods(updated);

    const storageKey = `saved_payment_methods_${user.uid}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));

    if (selectedTopUpMethodId === id) {
      if (updated.length > 0) {
        setSelectedTopUpMethodId(updated[0].id);
      } else {
        setSelectedTopUpMethodId("");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Sidebar navigation */}
      <div className="md:col-span-3 space-y-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wide transition border text-left cursor-pointer ${
            activeTab === "profile"
              ? "bg-gaming-blue text-white border-gaming-blue/30 shadow-lg"
              : "border-gaming-border text-gray-400 hover:text-white hover:bg-gaming-border/40"
          }`}
        >
          <User className="h-4 w-4" /> PROFILE CONFIGS
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wide transition border text-left cursor-pointer ${
            activeTab === "history"
              ? "bg-gaming-blue text-white border-gaming-blue/30 shadow-lg"
              : "border-gaming-border text-gray-400 hover:text-white hover:bg-gaming-border/40"
          }`}
        >
          <Trophy className="h-4 w-4" /> TOURNAMENT HISTORY
        </button>

        <button
          onClick={() => setActiveTab("wallet")}
          className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wide transition border text-left cursor-pointer ${
            activeTab === "wallet"
              ? "bg-gaming-blue text-white border-gaming-blue/30 shadow-lg"
              : "border-gaming-border text-gray-400 hover:text-white hover:bg-gaming-border/40"
          }`}
        >
          <Wallet className="h-4 w-4" /> WALLET & CASHOUT
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wide transition border text-left cursor-pointer ${
            activeTab === "transactions"
              ? "bg-gaming-blue text-white border-gaming-blue/30 shadow-lg"
              : "border-gaming-border text-gray-400 hover:text-white hover:bg-gaming-border/40"
          }`}
        >
          <History className="h-4 w-4" /> TRANSACTION HISTORY
        </button>

        <button
          onClick={() => setActiveTab("payment")}
          className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wide transition border text-left cursor-pointer ${
            activeTab === "payment"
              ? "bg-gaming-blue text-white border-gaming-blue/30 shadow-lg"
              : "border-gaming-border text-gray-400 hover:text-white hover:bg-gaming-border/40"
          }`}
        >
          <CreditCard className="h-4 w-4 text-gaming-neon" /> PAYMENT METHODS
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wide transition border text-left cursor-pointer ${
            activeTab === "security"
              ? "bg-gaming-blue text-white border-gaming-blue/30 shadow-lg"
              : "border-gaming-border text-gray-400 hover:text-white hover:bg-gaming-border/40"
          }`}
        >
          <Settings className="h-4 w-4 text-gaming-neon" /> SETTINGS & SECURITY
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="md:col-span-9 bg-gaming-card border border-gaming-border rounded-2xl p-6 shadow-xl">
        {/* TAB 1: Edit profile & Gamer ID Card */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="border-b border-gaming-border/60 pb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-display font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-gaming-blue" /> ESPORTS PASSPORT SECRETS
                </h3>
                <p className="text-xs text-gray-400">Design your personalized Gamer card and handle credentials</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReplayOnboarding}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gaming-neon/10 border border-gaming-neon/30 text-gaming-neon text-[10px] font-mono hover:bg-gaming-neon/20 transition cursor-pointer select-none active:scale-95"
                  title="Replay Gamer Guide"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Replay Guide
                </button>
                <Settings className="h-5 w-5 text-gaming-blue animate-spin shrink-0" style={{ animationDuration: '6s' }} />
              </div>
            </div>

            {/* Subtle Discord Webhook Prompt */}
            {!user?.discordWebhook && (
              <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#5865F2]/20 text-[#5865F2]">
                      <svg className="h-4 w-4 fill-current text-indigo-400" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53a105.73,105.73,0,0,0,32,16.29,80.5,80.5,0,0,0,6.76-11,68.6,68.6,0,0,1-10.63-5.12c.9-.66,1.8-1.34,2.65-2a75.58,75.58,0,0,0,71.13,0c.86.7,1.76,1.38,2.66,2a68.6,68.6,0,0,1-10.63,5.12,80.5,80.5,0,0,0,6.76,11,105.73,105.73,0,0,0,32-16.29C129.24,48.12,122.3,25.29,107.7,8.07ZM42.45,65.69C35.39,65.69,29.6,59.2,29.6,51.27s5.67-14.42,12.85-14.42,12.92,6.56,12.85,14.42S49.51,65.69,42.45,65.69Zm42.24,0C77.63,65.69,71.84,59.2,71.84,51.27s5.67-14.42,12.85-14.42,12.92,6.56,12.85,14.42S91.73,65.69,84.69,65.69Z"/>
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider font-display">Connect Discord for Live Match Alerts</span>
                  </div>
                  <p className="text-[10px] text-gray-300 max-w-xl font-sans leading-relaxed">
                    Set up a Discord channel webhook to receive automatic, instant notifications about room IDs, passwords, schedule updates, and lobby status changes as soon as brackets are drawn.
                  </p>
                </div>
                
                <form onSubmit={handleSaveDiscordWebhook} className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <div className="relative">
                    <input
                      type="password"
                      value={discordWebhookInput}
                      onChange={(e) => setDiscordWebhookInput(e.target.value)}
                      placeholder="Paste Discord Webhook URL..."
                      className="w-full sm:w-[200px] bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-[10px] text-white focus:outline-none focus:border-[#5865F2]/60 transition font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingWebhook || !discordWebhookInput}
                    className="px-3.5 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-[10px] font-bold text-white font-display transition active:scale-97 cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {savingWebhook ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> SAVING...
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" /> CONNECT
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Micro-success state if webhook was saved from here */}
            {webhookSuccess && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-xl text-[10px] font-mono text-center">
                🎉 DISCORD WEBHOOK SUCCESSFULLY CONNECTED! AUTOMATIC NOTIFICATIONS ARE NOW ACTIVATED.
              </div>
            )}

            {profileMsg && (
              <div className="bg-gaming-neon/15 border border-gaming-neon/30 text-gaming-neon p-3 rounded-lg text-xs font-semibold text-center animate-bounce">
                {profileMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Column 1: Configs Form (7 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Gamer Alias / Handle</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/60 transition"
                      placeholder="e.g. Shroud, Mortal"
                    />
                  </div>

                  {/* Gamer Avatar Photo Chooser */}
                  <div className="space-y-2 bg-[#0E1119] p-3 rounded-xl border border-gaming-border/60">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider flex items-center justify-between">
                      <span>Gamer Avatar / Profile Photo</span>
                      <span className="text-[8px] bg-gaming-blue/15 text-gaming-blue px-1.5 py-0.2 rounded border border-gaming-blue/25">Live Render</span>
                    </label>
                    <p className="text-[10px] text-gray-400 font-sans">Pick an Esports character preset below, or paste your own custom profile photo URL!</p>
                    
                    {/* Preset Avatars Grid */}
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        `https://api.dicebear.com/7.x/bottts/svg?seed=shroud&colors[]=052e16`,
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=ninja`,
                        `https://api.dicebear.com/7.x/bottts/svg?seed=mech&eyes[]=cry&mouth[]=smile`,
                        `https://api.dicebear.com/7.x/pixel-art/svg?seed=pro`,
                        `https://api.dicebear.com/7.x/pixel-art/svg?seed=cyber`,
                        `https://api.dicebear.com/7.x/lorelei/svg?seed=hero`
                      ].map((presetUrl, idx) => (
                        <button
                          key={presetUrl}
                          type="button"
                          onClick={() => setEditAvatar(presetUrl)}
                          className={`h-11 w-11 rounded-lg bg-black/40 border p-0.5 transition hover:scale-105 cursor-pointer flex items-center justify-center overflow-hidden ${
                            editAvatar === presetUrl ? "border-gaming-blue ring-1 ring-gaming-blue" : "border-gaming-border hover:border-gray-500"
                          }`}
                        >
                          <img src={presetUrl} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover rounded-md" />
                        </button>
                      ))}
                    </div>

                    {/* Custom URL Input with Live Preview indicator */}
                    <div className="pt-2">
                      <label className="block text-[9.5px] font-bold text-gray-400 uppercase font-mono">Or Paste Custom Photo Link</label>
                      <input
                        type="url"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full bg-[#07090D] border border-gaming-border mt-1 rounded-lg py-1.5 px-3 text-[11px] text-gray-300 focus:outline-none focus:border-gaming-blue/65 font-mono"
                        placeholder="e.g. paste your photos, face portrait links, discord or imgur urls"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Biography / Status</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={2}
                      className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/60 transition resize-none"
                      placeholder="Tell other clans about your gaming style..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Card Elite Tagline</label>
                    <input
                      type="text"
                      value={cardTagline}
                      onChange={(e) => setCardTagline(e.target.value)}
                      className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/60 transition"
                      placeholder="e.g. Born to clutch, live to conquer"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 bg-[#0E1119] p-3 rounded-xl border border-gaming-border/60">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider flex justify-between items-center">
                        <span>Favorite Games (Limitless Selection)</span>
                        <span className="text-[9px] text-gaming-blue font-bold font-mono">Selected: {preferredGames.length}</span>
                      </label>
                      <p className="text-[10px] text-gray-400 font-sans">Toggle all your favorite titles below. You can select 3, 4, 5, or more to show off on your ID card!</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {[
                          "BGMI", "Valorant", "Free Fire", "COD Mobile", "New State",
                          "GTA V", "Apex Legends", "CS:GO", "Minecraft", "Fortnite",
                          "Dota 2", "Clash Royale", "Clash of Clans", "EA FC Mobile"
                        ].map((game) => {
                          const isSelected = preferredGames.includes(game);
                          return (
                            <button
                              key={game}
                              type="button"
                              onClick={() => {
                                setPreferredGames((prev) => 
                                  prev.includes(game)
                                    ? prev.filter((g) => g !== game)
                                    : [...prev, game]
                                );
                              }}
                              className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-bold font-mono transition duration-150 flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-gaming-blue/15 border-gaming-blue text-white shadow-[0_0_10px_rgba(99,102,241,0.12)]"
                                  : "bg-black/30 border-gaming-border/80 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                              }`}
                            >
                              <span>{game}</span>
                              {isSelected ? (
                                <Check className="h-3 w-3 text-gaming-neon" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-gray-600/60" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-[#0E1119] p-3 rounded-xl border border-gaming-border/60 space-y-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono">Passport Card Skins</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(["cyberpunk", "neon", "gold", "crimson"] as const).map((theme) => {
                          let labelBg = "";
                          if (theme === "cyberpunk") labelBg = "bg-rose-600";
                          if (theme === "neon") labelBg = "bg-violet-600";
                          if (theme === "gold") labelBg = "bg-amber-500";
                          if (theme === "crimson") labelBg = "bg-red-700";

                          return (
                            <button
                              key={theme}
                              type="button"
                              onClick={() => setCardTheme(theme)}
                              title={`Equip ${theme} skin`}
                              className={`h-8 rounded-lg border transition-all cursor-pointer relative ${
                                cardTheme === theme 
                                  ? "border-white ring-2 ring-gaming-blue/50 scale-105" 
                                  : "border-gaming-border opacity-70 hover:opacity-100"
                              } ${labelBg}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gaming-blue hover:brightness-110 text-xs font-bold font-display text-white transition active:scale-97 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> SAVING PASSPORT...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" /> SAVE & EQUIP DECORATIONS
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Column 2: Interactive Gamer passport (5 cols) */}
              <div className="lg:col-span-6 flex flex-col justify-center items-center">
                
                {/* Simulated ID Card Wrapper */}
                {(() => {
                  let themeOuterBg = "";
                  let themeGlow = "";
                  let cardHeaderLabel = "";
                  let cardAccentColor = "";

                  if (cardTheme === "cyberpunk") {
                    themeOuterBg = "bg-gradient-to-br from-indigo-950 via-slate-900 to-rose-950/40 border-rose-500/30";
                    themeGlow = "shadow-[0_0_20px_rgba(244,63,94,0.15)]";
                    cardHeaderLabel = "CYBERNETIC LICENSED";
                    cardAccentColor = "text-rose-400";
                  } else if (cardTheme === "neon") {
                    themeOuterBg = "bg-gradient-to-br from-slate-950 via-indigo-950 to-emerald-950/20 border-teal-500/30";
                    themeGlow = "shadow-[0_0_20px_rgba(20,184,166,0.15)]";
                    cardHeaderLabel = "E-STRIKE DIGITAL ID";
                    cardAccentColor = "text-teal-400";
                  } else if (cardTheme === "gold") {
                    themeOuterBg = "bg-gradient-to-br from-[#12100E] via-[#241A10] to-[#12100E] border-amber-500/40";
                    themeGlow = "shadow-[0_0_20px_rgba(245,158,11,0.2)]";
                    cardHeaderLabel = "LEGENDARY GRANDMASTER";
                    cardAccentColor = "text-amber-500";
                  } else if (cardTheme === "crimson") {
                    themeOuterBg = "bg-gradient-to-br from-red-950/80 via-slate-950 to-stone-900 border-red-600/40";
                    themeGlow = "shadow-[0_0_20px_rgba(220,38,38,0.25)]";
                    cardHeaderLabel = "SQUADRON ELITE VET";
                    cardAccentColor = "text-red-500";
                  }

                  // Badge strings
                  const unlockedDynamicNames = getDynamicBadges().filter(b => b.unlocked).map(b => b.name);
                  const dbBadges = user?.badges || [];
                  const gamerBadges = Array.from(new Set([...unlockedDynamicNames, ...dbBadges]));

                  return (
                    <div className={`w-full max-w-[340px] rounded-2xl border p-4 font-mono select-none transition-all duration-300 transform hover:scale-[1.02] ${themeOuterBg} ${themeGlow} relative overflow-hidden backdrop-blur-md`}>
                      
                      {/* Grid overlay design */}
                      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

                      {/* Top Header Badge */}
                      <div className="flex justify-between items-center border-b border-white/[0.08] pb-2 mb-3">
                        <span className="text-[7px] text-gray-500 tracking-widest font-black uppercase">{cardHeaderLabel}</span>
                        <div className="flex items-center gap-1">
                          <div className={`h-1.5 w-1.5 rounded-full ${cardTheme === "gold" ? "bg-amber-400" : "bg-gaming-neon"} animate-pulse`} />
                          <span className="text-[8px] text-gray-400 font-bold">PASSPORT ACTIVE</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        {/* Robot avatar container */}
                        <div className="relative">
                          <img
                            src={editAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || "GuestPlayer"}`}
                            alt="avatar"
                            className="h-14 w-14 bg-black/40 border border-white/10 rounded-lg p-0.5 object-cover"
                          />
                          <span className={`absolute -bottom-1 -right-1 text-[8px] font-black uppercase px-1 rounded ${
                            cardTheme === "gold" ? "bg-amber-500 text-black" : "bg-gaming-blue text-white"
                          }`}>
                            LEVEL {Math.max(1, Math.floor((user?.earnings || 0) / 1000) + 1)}
                          </span>
                        </div>

                        {/* Esports Profile meta details */}
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-white font-extrabold text-xs">
                            <span className="truncate">{editUsername || user?.username}</span>
                            {user?.verified && (
                              <Check className="h-3 w-3 text-gaming-neon bg-gaming-neon/10 rounded-full p-0.5 border border-gaming-neon/30" />
                            )}
                          </div>
                          
                          <div className="min-h-[28px]">
                            <div className="text-[7px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">FAV GAMES</div>
                            <div className="flex flex-wrap gap-1">
                              {preferredGames.length === 0 ? (
                                <span className="text-[7.5px] font-bold text-gray-400">Casual Player</span>
                              ) : (
                                preferredGames.slice(0, 4).map((game, idx) => (
                                  <span key={idx} className={`text-[7px] font-black border bg-black/45 px-1.5 py-0.5 rounded-sm uppercase ${
                                    cardTheme === 'gold' ? 'border-amber-500/30 text-amber-400' : 'border-gaming-blue/30 text-gaming-blue'
                                  }`}>
                                    {game}
                                  </span>
                                ))
                              )}
                              {preferredGames.length > 4 && (
                                <span className="text-[7.5px] text-gray-400 font-bold self-center">
                                  +{preferredGames.length - 4}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-[9px] text-gray-500 line-clamp-2 italic pr-2 font-sans font-medium">
                            "{cardTagline || "Ready to dominate!"}"
                          </div>
                        </div>
                      </div>

                      {/* Sub Bio detail inside passport */}
                      <p className="mt-3 text-[9px] text-gray-400 border-t border-white/[0.06] pt-2 line-clamp-2 leading-relaxed font-sans">
                        {editBio || user?.bio || "No custom bio registered. Modify handle configurations on the left sidebar fields!"}
                      </p>

                      {/* Achievements and custom medals (Awarded by admin) */}
                      <div className="mt-3">
                        <span className="text-[7.5px] text-gray-500 uppercase block mb-1">Elite Achievements</span>
                        {gamerBadges.length === 0 ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[7.5px] font-black bg-white/5 border border-white/10 text-gray-400 px-1.5 py-0.5 rounded capitalize">
                              Rookie Recruit
                            </span>
                            <span className="text-[7.5px] font-black bg-white/5 border border-white/10 text-gray-400 px-1.5 py-0.5 rounded capitalize">
                              First Blood
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {gamerBadges.map((badge, idx) => (
                              <span key={idx} className={`text-[7.5px] font-black bg-gaming-blue/15 border border-gaming-blue/30 text-gaming-blue px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5`}>
                                <Trophy className="h-2 w-2 text-gaming-blue" /> {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Stat Metrics Box inside card */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-2.5 border-t border-white/[0.08] text-center bg-black/20 rounded-xl p-1.5">
                        <div>
                          <div className="text-[7.5px] text-gray-500 uppercase">Matches Booked</div>
                          <div className="text-[11px] font-black text-white">{registrations.length} battles</div>
                        </div>
                        <div>
                          <div className="text-[7.5px] text-gray-500 uppercase">Cash earnings</div>
                           <div className="text-[11px] font-black text-gaming-neon">🪙 {user?.earnings || 0} Coins</div>
                        </div>
                      </div>

                      {/* Copy passport credentials */}
                      <button 
                        type="button"
                        onClick={() => {
                          const payload = `ESPORTS ID PASSPORT:\nAlias: ${editUsername || user?.username}\nGames: ${preferredGames.join(", ") || "No games custom selected"}\nLevel: ${Math.floor((user?.earnings || 0) / 1000) + 1}\nTagline: ${cardTagline}\nBadges: ${gamerBadges.join(", ") || "Rookie"}`;
                          navigator.clipboard.writeText(payload);
                          alert("👍 Passport text copied for social sharing! Show off your Esports profile!");
                        }}
                        className="mt-3 w-full bg-white/5 hover:bg-white/10 text-[8.5px] py-1 border border-white/10 rounded font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer text-gray-300"
                      >
                        <Share2 className="h-2.5 w-2.5" /> SHARE PASSPORT BRAG CODE
                      </button>

                    </div>
                  );
                })()}

              </div>

            </div>

            {/* Dynamic Badge & Achievement Progress Hub */}
            <div className="mt-8 border-t border-gaming-border/60 pt-6 space-y-4">
              <div>
                <h4 className="text-xs font-display font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Medal className="h-4.5 w-4.5 text-gaming-neon animate-pulse" /> DYNAMIC HONORS & BADGE SYSTEM
                </h4>
                <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                  Unlock prestigious accolades automatically based on your real-time participation records and leaderboard performance!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {getDynamicBadges().map((badge) => {
                  return (
                    <div
                      key={badge.id}
                      className={`relative flex flex-col p-4 rounded-xl border transition-all duration-300 overflow-hidden ${
                        badge.unlocked
                          ? `${badge.colorClass} shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:scale-102`
                          : "bg-black/10 border-white/[0.04] text-gray-650 opacity-55"
                      }`}
                    >
                      {/* Grid background accent on unlocked badges */}
                      {badge.unlocked && (
                        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                      )}

                      {/* Header row: Badge level and status indicator */}
                      <div className="flex justify-between items-start mb-2.5 z-10">
                        <div className={`p-2 rounded-lg ${
                          badge.unlocked 
                            ? "bg-black/35 border border-white/10" 
                            : "bg-white/[0.02] border border-white/[0.04] text-gray-500"
                        }`}>
                          {badge.icon}
                        </div>
                        
                        <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                          badge.unlocked
                            ? "bg-gaming-neon/20 text-gaming-neon border border-gaming-neon/20 shadow-[0_0_8px_rgba(20,184,166,0.2)] animate-pulse"
                            : "bg-white/5 text-gray-500"
                        }`}>
                          {badge.unlocked ? "UNLOCKED" : "LOCKED"}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h5 className={`text-xs font-bold uppercase tracking-wide font-display z-10 ${
                        badge.unlocked ? "text-white" : "text-gray-500"
                      }`}>
                        {badge.name}
                      </h5>
                      
                      <p className={`text-[10px] sm:text-[10.5px] mt-1 leading-relaxed font-sans z-10 ${
                        badge.unlocked ? "text-gray-300" : "text-gray-650"
                      }`}>
                        {badge.description}
                      </p>

                      {/* Progression status progress indicator */}
                      <div className="mt-auto pt-4 border-t border-white/[0.05] mt-3 z-10">
                        {badge.id === "rookie" && (
                          <div className="flex items-center justify-between text-[8px] font-mono font-bold text-gray-400">
                            <span>REGISTRATION</span>
                            <span className="text-gaming-neon">VERIFIED</span>
                          </div>
                        )}
                        {badge.id === "first_blood" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                              <span>ENTRIES BOOKED</span>
                              <span className={badge.unlocked ? "text-gaming-pink font-bold" : "text-gray-500"}>
                                {Math.min(1, registrations.length)} / 1
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-gaming-pink h-full" 
                                style={{ width: `${Math.min(100, (registrations.length / 1) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {badge.id === "veteran" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                              <span>EVENTS ATTENDED</span>
                              <span className={badge.unlocked ? "text-purple-400 font-bold" : "text-gray-500"}>
                                {Math.min(3, registrations.length)} / 3
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-purple-500 h-full" 
                                style={{ width: `${Math.min(100, (registrations.length / 3) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {badge.id === "deadeye" && (() => {
                          const userKills = leaderboard.find((entry) => entry.userId === user?.uid)?.kills || 0;
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                                <span>TOTAL KILLS</span>
                                <span className={badge.unlocked ? "text-red-400 font-bold" : "text-gray-500"}>
                                  {userKills} / 10
                                </span>
                              </div>
                              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-red-500 h-full" 
                                  style={{ width: `${Math.min(100, (userKills / 10) * 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                        {badge.id === "top_frag" && (() => {
                          const userKills = leaderboard.find((entry) => entry.userId === user?.uid)?.kills || 0;
                          const maxKillsOnBoard = leaderboard.length > 0 ? Math.max(...leaderboard.map((r) => r.kills ?? 0)) : 0;
                          return (
                            <div className="flex items-center justify-between text-[8px] font-mono font-bold text-gray-500">
                              <span>MAX KILLS RECORD</span>
                              <span className={badge.unlocked ? "text-gaming-neon" : "text-gray-500"}>
                                {badge.unlocked ? `${userKills} (LEADER)` : `${userKills} / ${maxKillsOnBoard}`}
                              </span>
                            </div>
                          );
                        })()}
                        {badge.id === "conqueror" && (() => {
                          const userWins = leaderboard.find((entry) => entry.userId === user?.uid)?.wins || 0;
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                                <span>TOTAL LOBBY WINS</span>
                                <span className={badge.unlocked ? "text-amber-400 font-bold" : "text-gray-500"}>
                                  {userWins} / 3 wins
                                </span>
                              </div>
                              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-amber-500 h-full" 
                                  style={{ width: `${Math.min(100, (userWins / 3) * 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                        {badge.id === "high_roller" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                              <span>WALLET ASSETS</span>
                              <span className={badge.unlocked ? "text-emerald-400 font-bold" : "text-gray-500"}>
                                {user?.walletBalance ? `🪙 ${user.walletBalance} Coins` : "🪙 0 Coins"} / 1,000 Coins
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-full" 
                                style={{ width: `${Math.min(100, ((user?.walletBalance || 0) / 1000) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {badge.id === "prize_winner" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                              <span>CASHED OUT</span>
                              <span className={badge.unlocked ? "text-yellow-500 font-bold" : "text-gray-500"}>
                                {user?.earnings ? `🪙 ${user.earnings} Coins` : "🪙 0 Coins"} / 100 Coins
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-yellow-500 h-full" 
                                style={{ width: `${Math.min(100, ((user?.earnings || 0) / 100) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {badge.id === "otp_verified" && (
                          <div className="flex items-center justify-between text-[8px] font-mono font-bold text-gray-400">
                            <span>SECURITY SHIELD</span>
                            <span className={badge.unlocked ? "text-teal-400 animate-pulse" : "text-gray-500"}>
                              {badge.unlocked ? "OTP VERIFIED" : "NOT VERIFIED"}
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Tournament History Timeline */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="border-b border-gaming-border/60 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-display font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-gaming-blue" /> CAREER TOURNAMENT HISTORY
                </h3>
                <p className="text-xs text-gray-400 font-sans mt-0.5">Career milestones, past and active tournament statistics</p>
              </div>

              {/* Filter Button Bar & Stats */}
              <div className="flex gap-1 bg-[#12161F] p-1 rounded-lg border border-gaming-border self-start sm:self-auto">
                {(["all", "completed", "active"] as const).map((filter) => {
                  const count = getTimelineItems().filter(item => {
                    if (filter === "completed") return item.status === "completed";
                    if (filter === "active") return item.status === "live" || item.status === "upcoming";
                    return true;
                  }).length;
                  return (
                    <button
                      key={filter}
                      onClick={() => setHistoryFilter(filter)}
                      className={`px-3 py-1 rounded text-[9px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                        historyFilter === filter
                          ? "bg-gaming-blue text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {filter === "all" ? "All" : filter === "completed" ? "Completed" : "Active"} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Career Metrics Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#12161F]/60 p-4 rounded-xl border border-gaming-border flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Trophy className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-mono block tracking-wider">Champion Titles</span>
                  <span className="text-base font-mono font-black text-white">
                    {getTimelineItems().filter((item) => item.status === "completed" && item.rankAchieved?.toLowerCase().includes("1st")).length}
                  </span>
                </div>
              </div>

              <div className="bg-[#12161F]/60 p-4 rounded-xl border border-gaming-border flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-gaming-neon/10 flex items-center justify-center text-gaming-neon">
                  <Coins className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-mono block tracking-wider font-bold">Career Winnings</span>
                  <span className="text-base font-mono font-black text-gaming-neon">
                    🪙 {getTimelineItems().reduce((sum, item) => sum + (item.winnings || 0), 0).toLocaleString()} Coins
                  </span>
                </div>
              </div>

              <div className="bg-[#12161F]/60 p-4 rounded-xl border border-gaming-border flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-gaming-blue/10 flex items-center justify-center text-gaming-blue">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-mono block tracking-wider">Total Battles</span>
                  <span className="text-base font-mono font-black text-white">
                    {getTimelineItems().length} Joined
                  </span>
                </div>
              </div>
            </div>

            {/* PERFORMANCE INSIGHTS VISUALIZATION */}
            {(() => {
              const completedHistory = getTimelineItems()
                .filter(item => item.status === "completed")
                .slice(0, 10)
                .reverse();

              if (completedHistory.length === 0) {
                return null;
              }

              // Parse placement and build trend data
              const parsePlacement = (rankStr: string): number => {
                if (!rankStr) return 10;
                const lower = rankStr.toLowerCase();
                if (lower.includes("1st")) return 1;
                if (lower.includes("2nd")) return 2;
                if (lower.includes("3rd")) return 3;
                if (lower.includes("4th")) return 4;
                if (lower.includes("5th")) return 5;
                if (lower.includes("top 10")) return 10;
                if (lower.includes("top 25")) return 25;
                if (lower.includes("participant")) return 16;
                const numMatch = rankStr.match(/\d+/);
                if (numMatch) return parseInt(numMatch[0]);
                return 12;
              };

              const chartData = completedHistory.map((item, index) => {
                const placementNum = parsePlacement(item.rankAchieved);
                const previousCompletedSlice = completedHistory.slice(0, index + 1);
                const sumPlacements = previousCompletedSlice.reduce((sum, current) => sum + parsePlacement(current.rankAchieved), 0);
                const avgPlacementSoFar = parseFloat((sumPlacements / previousCompletedSlice.length).toFixed(1));
                const shortTitle = item.title.length > 12 ? item.title.substring(0, 12) + "..." : item.title;

                return {
                  name: shortTitle,
                  fullTitle: item.title,
                  earnings: item.winnings || 0,
                  placement: placementNum,
                  averagePlacement: avgPlacementSoFar,
                };
              });

              // Compute stats for display
              const placementsArray = completedHistory.map(item => parsePlacement(item.rankAchieved));
              const currentAvgPlacement = parseFloat((placementsArray.reduce((sum, val) => sum + val, 0) / placementsArray.length).toFixed(1));
              const peakPlacement = Math.min(...placementsArray);
              const maxEarnings = Math.max(...completedHistory.map(item => item.winnings || 0));

              return (
                <div className="bg-[#12161F]/60 rounded-2xl border border-gaming-border/80 p-5 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gaming-border/40 pb-4">
                    <div>
                      <h4 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="h-4.5 w-4.5 text-gaming-blue" /> Performance Insights
                      </h4>
                      <p className="text-xs text-gray-400 font-sans mt-0.5">
                        In-depth trend analysis of match placements and match earnings over your last {completedHistory.length} tournaments.
                      </p>
                    </div>

                    {/* Stats overlay */}
                    <div className="flex flex-wrap gap-4 text-xs font-mono">
                      <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-gaming-border/50">
                        <span className="text-gray-500 text-[9px] uppercase block">Average Placement</span>
                        <span className="text-gaming-blue font-black text-sm">#{currentAvgPlacement}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-gaming-border/50">
                        <span className="text-gray-500 text-[9px] uppercase block">Peak Placement</span>
                        <span className="text-amber-400 font-black text-sm">#{peakPlacement}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-gaming-border/50">
                        <span className="text-gray-500 text-[9px] uppercase block">Max Match Earnings</span>
                        <span className="text-gaming-neon font-black text-sm">🪙 {maxEarnings.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Chart */}
                  <div className="h-72 w-full pr-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#162235" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#475569" 
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#162235' }}
                          dy={8}
                        />
                        {/* Left Y-Axis for Earnings (Coins) */}
                        <YAxis 
                          yAxisId="left"
                          stroke="#00E5FF" 
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#162235' }}
                           tickFormatter={(value) => `🪙 ${value >= 1000 ? (value / 1000) + 'k' : value}`}
                        />
                        {/* Right Y-Axis for Placement (1st is top, so reversed=true) */}
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#FF007F" 
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#162235' }}
                          reversed={true}
                          domain={[1, 'auto']}
                          tickFormatter={(value) => `#${value}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          verticalAlign="top" 
                          height={36} 
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                        />
                        {/* Average Placement Trend line */}
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="averagePlacement" 
                          name="Avg Placement (Trend)" 
                          stroke="#FF007F" 
                          strokeWidth={2.5}
                          dot={{ r: 4, strokeWidth: 1 }}
                          activeDot={{ r: 6 }}
                        />
                        {/* Match Placement line */}
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="placement" 
                          name="Match Placement" 
                          stroke="#8B5CF6" 
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={{ r: 3 }}
                        />
                        {/* Match Earnings line */}
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="earnings" 
                          name="Match Earnings (Coins)" 
                          stroke="#00E5FF" 
                          strokeWidth={2.5}
                          dot={{ r: 4, strokeWidth: 1 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* MY TOURNAMENT HISTORY SECTION */}
            <div className="bg-[#12161F]/60 rounded-2xl border border-gaming-border/80 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-gaming-neon" /> My Tournament History
                </h4>
                <p className="text-xs text-gray-400 font-sans mt-0.5">
                  Official Esports standings, final placements, and earned prize cash pool payouts.
                </p>
              </div>

              {(() => {
                const completedItems = getTimelineItems().filter((item) => item.status === "completed");

                if (completedItems.length === 0) {
                  return (
                    <div className="text-center py-8 bg-black/20 border border-dashed border-gaming-border/60 rounded-xl">
                      <AlertTriangle className="h-6 w-6 text-gray-500 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-400 font-medium">No completed tournament records registered yet.</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Clutch your next tournament to record your first placement!</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-gaming-border/40 bg-black/30">
                    <table className="w-full border-collapse text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-gaming-border/60 bg-black/50 text-gray-400 uppercase tracking-wider text-[10px] font-black">
                          <th className="py-3 px-4">Event & Title</th>
                          <th className="py-3 px-4">Match Date</th>
                          <th className="py-3 px-4">Final Placement</th>
                          <th className="py-3 px-4 text-right">Total Earnings</th>
                          <th className="py-3 px-4 text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gaming-border/40 text-gray-300">
                        {completedItems.map((item) => {
                          const isFirst = item.rankAchieved?.toLowerCase().includes("1st");
                          const isSecondOrThird = item.rankAchieved?.toLowerCase().includes("2nd") || item.rankAchieved?.toLowerCase().includes("3rd") || item.rankAchieved?.toLowerCase().includes("podium");
                          
                          let rankBadgeClass = "bg-white/5 text-gray-300 border-white/10";
                          if (isFirst) {
                            rankBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20 font-black";
                          } else if (isSecondOrThird) {
                            rankBadgeClass = "bg-blue-400/10 text-blue-400 border-blue-400/20";
                          }

                          return (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition duration-150">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold bg-gaming-blue/10 text-gaming-blue border border-gaming-blue/20 px-1.5 py-0.5 rounded uppercase">
                                    {item.game}
                                  </span>
                                  <span className="text-white font-bold tracking-tight font-sans text-sm">{item.title}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                                {new Date(item.date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${rankBadgeClass}`}>
                                  {isFirst ? "🏆 " : isSecondOrThird ? "🥈 " : "🎖️ "} {item.rankAchieved}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {item.winnings ? (
                                  <span className="text-gaming-neon font-black tracking-wide bg-gaming-neon/10 border border-gaming-neon/20 px-2 py-0.5 rounded">
                                    + 🪙 {item.winnings.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 font-medium">0 Coins Payout</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCompletedEvent(item)}
                                  className="px-2.5 py-1 rounded bg-[#0b0f17] border border-gaming-blue/20 text-gaming-blue hover:text-white hover:bg-gaming-blue/10 text-[10px] font-bold font-mono transition uppercase cursor-pointer"
                                >
                                  📄 VIEW SLIP
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="border-t border-gaming-border/65 pt-6">
              <h4 className="text-xs font-display font-extrabold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                <History className="h-4.5 w-4.5 text-gaming-pink animate-pulse" /> CAREER BATTLE TIMELINE
              </h4>
            </div>

            {(() => {
              const timelineItems = getTimelineItems().filter((item) => {
                if (historyFilter === "completed") return item.status === "completed";
                if (historyFilter === "active") return item.status === "live" || item.status === "upcoming";
                return true;
              });

              if (timelineItems.length === 0) {
                return (
                  <div className="text-center py-12 bg-gaming-bg w-full border border-dashed border-gaming-border rounded-xl">
                    <AlertTriangle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No events found matching this career segment.</p>
                    <p className="text-[10px] text-gray-500 mt-1">Browse upcoming tournaments to record your next match!</p>
                  </div>
                );
              }

              return (
                <div className="relative border-l-2 border-gaming-border/80 ml-3 sm:ml-6 pl-6 sm:pl-8 space-y-6 py-2">
                  {timelineItems.map((item) => {
                    const isCompleted = item.status === "completed";
                    const isLive = item.status === "live";
                    const isUpcoming = item.status === "upcoming";

                    // Check podium / top rank for custom badges
                    const isFirst = item.rankAchieved?.toLowerCase().includes("1st");
                    const isPodium = item.rankAchieved?.toLowerCase().includes("3rd") || item.rankAchieved?.toLowerCase().includes("2nd") || item.rankAchieved?.toLowerCase().includes("podium");

                    // Select timeline node color and icon based on state and rank
                    let nodeIcon = <Award className="h-4 w-4 text-gray-400" />;
                    let nodeBgClass = "border-gaming-border bg-gaming-card";
                    if (isFirst) {
                      nodeIcon = <Trophy className="h-4.5 w-4.5 text-amber-500" />;
                      nodeBgClass = "border-amber-500/40 bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse";
                    } else if (isPodium) {
                      nodeIcon = <Medal className="h-4.5 w-4.5 text-blue-400" />;
                      nodeBgClass = "border-blue-400/40 bg-blue-950/20";
                    } else if (isLive) {
                      nodeIcon = <Sparkles className="h-4.5 w-4.5 text-gaming-pink animate-pulse" />;
                      nodeBgClass = "border-gaming-pink/40 bg-gaming-pink/10 animate-pulse";
                    } else if (isUpcoming) {
                      nodeIcon = <Hourglass className="h-4.5 w-4.5 text-gaming-blue" />;
                      nodeBgClass = "border-gaming-blue/40 bg-gaming-blue/10";
                    }

                    // Handle share click animation
                    const handleShare = (idStr: string, textToCopy: string) => {
                      navigator.clipboard.writeText(textToCopy);
                      setSharedId(idStr);
                      setTimeout(() => setSharedId(null), 2500);
                    };

                    const shareText = `Check out my Esports milestone! Tournament: ${item.title} (${item.game}) - Rank: ${item.rankAchieved || "Joined Roster"} | Earnings: 🪙 ${item.winnings || 0} Coins!`;

                    return (
                      <div key={item.id} className="relative group">
                        {/* Left Dot overlapping the left line */}
                        <div className={`absolute -left-[35px] sm:-left-[43px] top-1 flex items-center justify-center h-8.5 w-8.5 rounded-full border transition duration-300 ${nodeBgClass}`}>
                          {nodeIcon}
                        </div>

                        {/* Content Card with high visual fidelity */}
                        <div className={`p-4 sm:p-5 rounded-2xl bg-[#12161F]/90 border transition duration-300 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                          isFirst 
                            ? "border-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                            : isLive
                            ? "border-gaming-pink/20 hover:border-gaming-pink/40"
                            : "border-gaming-border hover:border-gaming-blue/45 hover:shadow-[0_0_15px_rgba(99,102,241,0.08)]"
                        }`}>
                          
                          {/* Shimmer background flare on winners */}
                          {isFirst && (
                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-amber-500/5 to-transparent rounded-bl-3xl pointer-events-none" />
                          )}

                          <div className="space-y-1.5 flex-1 w-full">
                            <header className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] font-mono font-black bg-gaming-blue/10 text-gaming-blue px-2 py-0.5 rounded uppercase tracking-wider border border-gaming-blue/20">
                                {item.game}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>

                              {item.isSeeded && (
                                <span className="text-[8px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/15 px-1.5 py-0.2 rounded uppercase">
                                  Verified Match log
                                </span>
                              )}
                            </header>

                            <h4 className="text-sm font-display font-extrabold text-white uppercase tracking-tight pr-4">
                              {item.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-400 font-mono">
                              <span>SQUAD: <strong className="text-white">{item.teamName || "Solo Roster"}</strong></span>
                              <span>GAMER: <strong className="text-gaming-blue">{item.username}</strong></span>
                              {item.inGameId && (
                                <span>ID: <strong className="text-[#A5B4FC]">{item.inGameId}</strong></span>
                              )}
                              {item.fee > 0 ? (
                                <span>Fee: <strong className="text-white">🪙 {item.fee} Coins</strong></span>
                              ) : (
                                <span className="text-gaming-neon uppercase font-bold tracking-wider text-[8px]">FREE ENTRY</span>
                              )}
                            </div>
                          </div>

                          {/* Right side box: achievements metrics & share controls */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-x-6 gap-y-3.5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-gaming-border/40">
                            
                            {/* Standings/Results Details */}
                            <div className="flex gap-6 min-w-[150px] justify-between sm:justify-start">
                              <div>
                                <span className="text-[8px] text-gray-500 font-mono uppercase block">Rank achieved</span>
                                {isCompleted ? (
                                  <span className={`text-xs font-black font-display uppercase tracking-tight flex items-center gap-1 mt-0.5 ${
                                    isFirst ? "text-amber-500" : isPodium ? "text-blue-400" : "text-gray-300"
                                  }`}>
                                    {item.rankAchieved}
                                  </span>
                                ) : isLive ? (
                                  <span className="text-xs text-gaming-pink font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse mt-0.5">
                                    <span className="h-1.5 w-1.5 bg-gaming-pink rounded-full animate-ping" /> IN PLAY
                                  </span>
                                ) : (
                                  <span className="text-xs text-gaming-blue font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                    <Hourglass className="h-3.5 w-3.5" /> REGISTERED
                                  </span>
                                )}
                              </div>

                              <div className="text-right sm:text-left">
                                <span className="text-[8px] text-gray-500 font-mono uppercase block">Winnings history</span>
                                {isCompleted ? (
                                  <span className={`text-xs font-mono font-extrabold block mt-0.5 ${
                                    item.winnings ? "text-gaming-neon font-bold" : "text-gray-500"
                                  }`}>
                                    {item.winnings ? `+ 🪙 ${item.winnings.toLocaleString()}` : "0 Coins Payout"}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-500 font-bold block">--</span>
                                )}
                              </div>
                            </div>

                            {/* Quick Share / Brag link */}
                            <div className="flex items-center gap-2 justify-between sm:justify-end">
                              {isCompleted && (
                                <>
                                  <button
                                    onClick={() => setSelectedCompletedEvent(item)}
                                    className="p-1.5 px-3 rounded-lg border border-gaming-border hover:border-gaming-blue text-[9px] font-bold uppercase flex items-center gap-1 cursor-pointer transition bg-gaming-bg text-gray-400 hover:text-white hover:shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                                    title="View detailed prize payout receipt with rewards & tax breakdown"
                                  >
                                    📄 PAYOUT DETAILS
                                  </button>
                                  
                                  <button
                                    onClick={() => handleShare(item.id, shareText)}
                                    className={`p-1.5 px-3 rounded-lg border text-[9px] font-bold uppercase flex items-center gap-1 cursor-pointer transition ${
                                      sharedId === item.id
                                        ? "bg-gaming-neon/15 border-gaming-neon text-gaming-neon"
                                        : "bg-gaming-bg border-gaming-border hover:border-gaming-blue text-gray-400 hover:text-white"
                                    }`}
                                  >
                                    {sharedId === item.id ? (
                                      <>
                                        <Check className="h-2.5 w-2.5" /> COPIED!
                                      </>
                                    ) : (
                                      <>
                                        <Share2 className="h-2.5 w-2.5" /> SHARE BRAG
                                      </>
                                    )}
                                  </button>
                                </>
                              )}

                              <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${
                                item.paid 
                                  ? "bg-gaming-neon/10 text-gaming-neon border-gaming-neon/20" 
                                  : "bg-gaming-pink/15 text-gaming-pink border border-gaming-pink/20"
                              }`}>
                                {item.paid ? "Paid" : "Free"}
                              </span>
                            </div>

                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: Wallets & Withdrawal panel */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className="border-b border-gaming-border/60 pb-3.5">
              <h3 className="text-sm font-display font-extrabold text-white uppercase tracking-wider">LEDGER & SECURE WITHDRAWAL</h3>
              <p className="text-xs text-gray-400">View tournament winnings and claim rapid withdrawals to your bank</p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gaming-bg p-4 rounded-xl border border-gaming-border/80">
                <span className="text-[10px] text-gray-400 uppercase font-bold font-mono">Available Balance</span>
                <div className="text-2xl font-mono font-black text-gaming-neon mt-1">🪙 {user?.walletBalance || 0} Coins</div>
                <span className="text-[9px] text-gray-500 font-sans block mt-1">Available for entries or withdrawal</span>
              </div>

              <div className="bg-gaming-bg p-4 rounded-xl border border-gaming-border/80">
                <span className="text-[10px] text-gray-400 uppercase font-bold font-mono">Prize Earnings</span>
                <div className="text-2xl font-mono font-black text-amber-500 mt-1">🪙 {user?.earnings || 0} Coins</div>
                <span className="text-[9px] text-gray-500 font-sans block mt-1">Total lifetime winnings</span>
              </div>

              <div className="bg-gaming-bg p-4 rounded-xl border border-gaming-border/80">
                <span className="text-[10px] text-gray-400 uppercase font-bold font-mono">Approved Cashouts</span>
                <div className="text-2xl font-mono font-black text-white mt-1">
                  🪙 {withdrawals.filter(w => w.status === "approved").reduce((acc, cur) => acc + cur.amount, 0)} Coins
                </div>
                <span className="text-[9px] text-gray-500 font-sans block mt-1">Cash successfully transferred</span>
              </div>
            </div>

            {/* Sandbox Wallet Bento Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Box 1: Top Up Sandbox Card */}
              <div className="lg:col-span-4 bg-gaming-bg border border-gaming-border rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-white uppercase mb-3 font-mono flex items-center gap-1">
                    <Plus className="h-4 w-4 text-gaming-neon" /> TOP UP WALLET SANDBOX
                  </span>

                  {depositSuccessMsg && (
                    <div className="bg-gaming-neon/15 border border-gaming-neon/30 text-gaming-neon p-2.5 rounded-lg text-[10px] font-semibold mb-3">
                      {depositSuccessMsg}
                    </div>
                  )}

                  <form onSubmit={handleDeposit} className="space-y-3.5">
                    <div>
                       <label className="block text-[10px] text-gray-400 uppercase font-mono mb-1">Buy Coins (1 Coin = ₹1 INR)</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none"
                        required
                        min="1"
                      />
                    </div>

                    {savedPaymentMethods.length > 0 ? (
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase font-mono mb-1">Select Payment Method</label>
                        <select
                          value={selectedTopUpMethodId}
                          onChange={(e) => setSelectedTopUpMethodId(e.target.value)}
                          className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none font-mono"
                        >
                          {savedPaymentMethods.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.alias} ({m.details})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="p-2 bg-gaming-pink/5 border border-gaming-pink/15 text-gaming-pink text-[9.5px] rounded-lg">
                        ⚠️ No saved payment methods found. Please add one in the section below.
                      </div>
                    )}

                    <div className="pt-1">
                      <span className="block text-[8px] text-gray-500 font-mono uppercase">Quick Add Shortcuts</span>
                      <div className="flex gap-2 mt-1.5">
                        {[200, 500, 1000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setDepositAmount(amt)}
                            className={`flex-grow py-1 text-[10px] font-bold rounded-md transition border cursor-pointer ${
                              depositAmount === amt
                                ? "bg-gaming-neon/20 border-gaming-neon text-gaming-neon"
                                : "bg-gaming-card border-gaming-border text-gray-400 hover:text-white"
                            }`}
                          >
                            +{amt} Coins
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={depositing || savedPaymentMethods.length === 0}
                      className="w-full py-2 bg-gaming-blue font-display text-xs font-bold text-white rounded-lg hover:bg-opacity-90 active:scale-97 transition cursor-pointer flex justify-center items-center gap-1.5 mt-2 disabled:opacity-40"
                    >
                      {depositing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> ADDING...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> ADD VIRTUAL FUNDS
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Box 2: Withdrawal request */}
              <div className="lg:col-span-4 bg-gaming-bg border border-gaming-border rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-white uppercase mb-3 font-mono flex items-center gap-1">
                    <ArrowDownToLine className="h-4 w-4 text-gaming-blue" /> INITIALIZE CASHOUT CLAIM
                  </span>

                  {withdrawalSuccess && (
                    <div className="bg-gaming-neon/15 border border-gaming-neon/30 text-gaming-neon p-2.5 rounded-lg text-[10px] font-semibold mb-3">
                      {withdrawalSuccess}
                    </div>
                  )}

                  {withdrawalError && (
                    <div className="bg-gaming-pink/15 border border-gaming-pink/30 text-gaming-pink p-2.5 rounded-lg text-[10px] font-semibold mb-3">
                      {withdrawalError}
                    </div>
                  )}

                  <form onSubmit={handleSubmitWithdrawal} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-mono mb-1">Withdraw Coins (Amount in Coins)</label>
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(Number(e.target.value))}
                        className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-mono mb-1">Withdrawal Destination / Account</label>
                      <input
                        type="text"
                        required
                        value={withdrawalUpi}
                        onChange={(e) => setWithdrawalUpi(e.target.value)}
                        placeholder="Select a saved method or type UPI/PayPal/Bank"
                        className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    {user?.paymentMethods && user.paymentMethods.length > 0 && (
                      <div className="pt-0.5 space-y-1">
                        <span className="block text-[8px] text-gray-400 font-mono uppercase font-bold">Select Saved Profile Destination</span>
                        <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                          {user.paymentMethods.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setWithdrawalUpi(m.details)}
                              className={`w-full py-1.5 px-2 text-[9px] font-mono rounded bg-[#121620] hover:bg-[#1a2030] border transition cursor-pointer flex items-center justify-between gap-1.5 text-left ${
                                withdrawalUpi === m.details 
                                  ? "border-gaming-neon text-gaming-neon bg-gaming-neon/5" 
                                  : "border-gaming-border text-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span>⚡ {m.alias}</span>
                                <span className="text-[7.5px] text-gray-500 uppercase font-black">({m.type})</span>
                              </div>
                              <span className="text-gray-400 truncate max-w-[120px] text-right font-mono">{m.details}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {savedPaymentMethods.filter(m => m.type === "upi").length > 0 && !user?.paymentMethods?.length && (
                      <div className="pt-0.5">
                        <span className="block text-[8px] text-gray-500 font-mono uppercase">Quick Autofill Sandbox UPI</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {savedPaymentMethods.filter(m => m.type === "upi").map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setWithdrawalUpi(m.details)}
                              className={`py-1 px-2 text-[9px] font-mono rounded bg-[#121620] hover:bg-[#1a2030] border transition cursor-pointer flex items-center gap-1 ${
                                withdrawalUpi === m.details 
                                  ? "border-gaming-neon text-gaming-neon bg-gaming-neon/5" 
                                  : "border-gaming-border text-gray-300"
                              }`}
                            >
                              ⚡ {m.alias}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={withdrawalLoading}
                      className="w-full py-2 bg-gaming-neon font-display text-xs font-bold text-white rounded-lg hover:bg-opacity-90 active:scale-97 transition cursor-pointer"
                    >
                      {withdrawalLoading ? "REQUESTING..." : "CLAIM RAPID CASHOUT"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Box 3: Past withdrawals table */}
              <div className="lg:col-span-4 space-y-2 bg-gaming-bg border border-gaming-border rounded-xl p-4">
                <span className="block text-[10px] font-bold text-white uppercase font-mono pb-1 border-b border-gaming-border">
                  PAST CLAIM LEDGER
                </span>

                {withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[180px]">
                    <p className="text-[10px] text-gray-500 text-center font-sans">No withdrawals logged.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="p-2.5 bg-gaming-card/40 border border-gaming-border rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <div className="font-mono text-[9px] text-gray-400 truncate max-w-[120px]">UPI: <span className="text-white font-bold">{w.upi}</span></div>
                          <div className="text-[9px] text-gray-500 mt-0.5">{new Date(w.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="text-right">
                            <div className="font-mono font-extrabold text-white text-[11px]">-🪙 {w.amount}</div>
                            <span className={`text-[8px] uppercase font-bold tracking-widest mt-0.5 block ${
                              w.status === "pending"
                                ? "text-yellow-500"
                                : w.status === "approved"
                                ? "text-gaming-neon"
                                : "text-gaming-pink"
                            }`}>
                              {w.status}
                            </span>
                          </div>

                          <button
                            onClick={() => handleCopyWithdrawal(w)}
                            title="Copy claim record / क्लेम रिकॉर्ड कॉपी करें"
                            className={`p-1.5 rounded-md border transition cursor-pointer flex items-center justify-center shrink-0 ${
                              copiedWithdrawalIds[w.id]
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-[#121620] hover:bg-[#1a2030] border-gaming-border hover:border-gaming-blue/40 text-gray-400 hover:text-white"
                            }`}
                          >
                            {copiedWithdrawalIds[w.id] ? (
                              <Check className="h-3 w-3 animate-bounce" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SAVED PAYMENT METHODS SUB-BOARD */}
            <div className="border-t border-gaming-border/45 pt-6 mt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                <div>
                  <h4 className="text-xs font-display font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-gaming-neon" /> SAVED PAYMENT CHANNELS & GATEWAY SETTINGS
                  </h4>
                  <p className="text-[11px] text-gray-400">Add or manage your active UPI handles or debit/credit cards for lightning-fast sandbox transactions.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* List of saved payment methods */}
                <div className="lg:col-span-7 bg-gaming-bg border border-gaming-border rounded-xl p-4 space-y-4">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase font-mono border-b border-gaming-border pb-1.5">
                    YOUR SAVED PAYMENT METHODS ({savedPaymentMethods.length})
                  </span>

                  {savedPaymentMethods.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                      <CreditCard className="h-8 w-8 text-gray-600 animate-pulse" />
                      <p className="text-[11px] text-gray-400">No payment methods saved yet.</p>
                      <p className="text-[9px] text-gray-500 max-w-xs">Save your first UPI address or card details using the form on the right to bypass manual entries.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {savedPaymentMethods.map((m) => (
                        <div 
                          key={m.id} 
                          className={`relative p-3.5 rounded-xl border transition flex flex-col justify-between h-28 overflow-hidden group select-none ${
                            m.type === "card"
                              ? "bg-gradient-to-br from-[#1E1B4B] to-[#121620] border-indigo-500/35 hover:border-indigo-500/60"
                              : "bg-gradient-to-br from-[#064E3B] to-[#121620] border-emerald-500/35 hover:border-emerald-500/60"
                          }`}
                        >
                          {/* Trash delete button */}
                          <button
                            onClick={() => handleDeletePaymentMethod(m.id)}
                            title="Delete payment method"
                            className="absolute top-2.5 right-2.5 p-1 rounded-md bg-black/40 hover:bg-gaming-pink/20 hover:text-gaming-pink text-gray-400 opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Method Brand Accent */}
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1">
                              {m.type === "card" ? (
                                <>
                                  <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
                                  {m.cardType?.toUpperCase() || "CARD"}
                                </>
                              ) : (
                                <>
                                  <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                                  UPI PAYMENT
                                </>
                              )}
                            </span>
                          </div>

                          {/* Details & Alias */}
                          <div className="mt-2">
                            <div className="text-[10px] font-mono text-gray-400 truncate pr-4">{m.alias}</div>
                            <div className="text-sm font-mono font-bold text-white mt-0.5 tracking-wider truncate">
                              {m.details}
                            </div>
                          </div>

                          {/* Extra info for card */}
                          {m.type === "card" && (
                            <div className="flex items-center justify-between text-[8px] font-mono text-gray-400 mt-2.5 pt-1.5 border-t border-white/5">
                              <span className="truncate max-w-[120px]">{m.cardHolderName}</span>
                              <span>EXP: {m.cardExpiry}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add a payment method form */}
                <div className="lg:col-span-5 bg-gaming-bg border border-gaming-border rounded-xl p-4">
                  <span className="block text-[10px] font-bold text-white uppercase font-mono border-b border-gaming-border pb-1.5 mb-3">
                    ADD SECURE PAYMENT METHOD
                  </span>

                  {addMethodSuccess && (
                    <div className="bg-gaming-neon/15 border border-gaming-neon/30 text-gaming-neon p-2.5 rounded-lg text-[10px] font-semibold mb-3">
                      {addMethodSuccess}
                    </div>
                  )}

                  {addMethodError && (
                    <div className="bg-gaming-pink/15 border border-gaming-pink/30 text-gaming-pink p-2.5 rounded-lg text-[10px] font-semibold mb-3">
                      {addMethodError}
                    </div>
                  )}

                  <form onSubmit={handleAddPaymentMethod} className="space-y-3">
                    {/* Mode Selector */}
                    <div>
                      <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">Select Channel Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewMethodType("upi")}
                          className={`py-1.5 px-3 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition border cursor-pointer ${
                            newMethodType === "upi"
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                              : "bg-[#121620] border-gaming-border text-gray-400 hover:text-white"
                          }`}
                        >
                          UPI Handle
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewMethodType("card")}
                          className={`py-1.5 px-3 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition border cursor-pointer ${
                            newMethodType === "card"
                              ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                              : "bg-[#121620] border-gaming-border text-gray-400 hover:text-white"
                          }`}
                        >
                          Credit/Debit Card
                        </button>
                      </div>
                    </div>

                    {/* Alias / Label */}
                    <div>
                      <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">Method Alias / Label</label>
                      <input
                        type="text"
                        required
                        value={newMethodAlias}
                        onChange={(e) => setNewMethodAlias(e.target.value)}
                        placeholder={newMethodType === "upi" ? "e.g. My GPay Handle" : "e.g. SBI Savings Card"}
                        className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none"
                      />
                    </div>

                    {/* UPI or Card Details Input */}
                    <div>
                      <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">
                        {newMethodType === "upi" ? "UPI Address (ID)" : "Card Number (16-digits)"}
                      </label>
                      <input
                        type="text"
                        required
                        value={newMethodDetails}
                        onChange={(e) => setNewMethodDetails(e.target.value)}
                        placeholder={newMethodType === "upi" ? "e.g. gameplay@okaxis" : "4532 9012 3456 7890"}
                        className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    {/* Conditional Card inputs */}
                    {newMethodType === "card" && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">Card Holder Name</label>
                          <input
                            type="text"
                            required
                            value={newCardHolderName}
                            onChange={(e) => setNewCardHolderName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">Expiry Date</label>
                          <input
                            type="text"
                            required
                            value={newCardExpiry}
                            onChange={(e) => setNewCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2 bg-gaming-blue font-display text-[10.5px] font-black uppercase tracking-wider text-white rounded-lg hover:bg-opacity-90 active:scale-97 transition cursor-pointer flex justify-center items-center gap-1.5 mt-2"
                    >
                      <Plus className="h-4 w-4" /> Save Payment Method
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TRANSACTION HISTORY LEDGER */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            <div className="border-b border-gaming-border/60 pb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-display font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-gaming-neon" /> TRANSACTION HISTORY LEDGER
                </h3>
                <p className="text-xs text-gray-400 mt-1">Audit trail of all wallet additions, entry fee deductions, earnings payouts, and cashouts.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    // Quick seed helper for testing purposes if they want starter transactions
                    if (!user) return;
                    await dbRecordWalletTransaction(user.uid, "addition", 100, "Loyalty Welcome Sign-up Reward Bonus", "completed");
                    await dbRecordWalletTransaction(user.uid, "payout", 250, "1st Place Winnings Match Championship: Free Fire", "completed");
                  }}
                  className="px-3 py-1 bg-gaming-border text-[10px] uppercase font-bold rounded-lg border border-white/5 hover:bg-neutral-800 text-gray-300 transition cursor-pointer"
                >
                  🌱 SEED DEMO LOGS
                </button>
              </div>
            </div>

            {/* Micro Metrics Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gaming-bg/60 p-3.5 rounded-xl border border-gaming-border flex flex-col justify-between">
                <span className="text-[9px] text-gray-400 font-bold uppercase font-mono tracking-widest block">Total Deposits Added</span>
                <div className="text-xl font-mono font-black text-gaming-neon mt-1.5">
                  🪙 {transactions.filter(t => t.type === "addition" && t.status === "completed").reduce((acc, c) => acc + c.amount, 0)} Coins
                </div>
              </div>
              <div className="bg-gaming-bg/60 p-3.5 rounded-xl border border-gaming-border flex flex-col justify-between">
                <span className="text-[9px] text-gray-400 font-bold uppercase font-mono tracking-widest block">Fee Deductions</span>
                <div className="text-xl font-mono font-black text-gaming-pink mt-1.5 text-opacity-90">
                  🪙 {transactions.filter(t => t.type === "deduction").reduce((acc, c) => acc + c.amount, 0)} Coins
                </div>
              </div>
              <div className="bg-gaming-bg/60 p-3.5 rounded-xl border border-gaming-border flex flex-col justify-between">
                <span className="text-[9px] text-gray-400 font-bold uppercase font-mono tracking-widest block">Earnings Payouts</span>
                <div className="text-xl font-mono font-black text-amber-500 mt-1.5">
                  🪙 {transactions.filter(t => t.type === "payout").reduce((acc, c) => acc + c.amount, 0)} Coins
                </div>
              </div>
              <div className="bg-gaming-bg/60 p-3.5 rounded-xl border border-gaming-border flex flex-col justify-between">
                <span className="text-[9px] text-gray-400 font-bold uppercase font-mono tracking-widest block">Cashout Withdrawals</span>
                <div className="text-xl font-mono font-black text-blue-400 mt-1.5">
                  🪙 {transactions.filter(t => t.type === "withdrawal" && t.status === "completed").reduce((acc, c) => acc + c.amount, 0)} Coins
                </div>
              </div>
            </div>

            {/* Filter and Search Bar Options */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex flex-wrap gap-1.5 bg-gaming-bg p-1 rounded-xl border border-gaming-border">
                {(["all", "addition", "deduction", "payout", "withdrawal"] as const).map((type) => {
                  const labels: Record<string, string> = {
                    all: "ALL TRANSACTIONS",
                    addition: "+ DEPOSITS",
                    deduction: "- ENTRY FEES",
                    payout: "★ WINNINGS PAYOUTS",
                    withdrawal: "⇄ CASHOUTS"
                  };
                  return (
                    <button
                      key={type}
                      onClick={() => setTxFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-bold font-mono tracking-wide uppercase transition duration-150 cursor-pointer ${
                        txFilter === type
                          ? "bg-gaming-blue text-white shadow-md shadow-gaming-blue/10"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>

              <div className="relative md:w-64">
                <input
                  type="text"
                  placeholder="FILTER BY DESCRIPTION..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full bg-gaming-bg border border-gaming-border rounded-xl py-1.5 px-3 text-[10px] text-white focus:outline-none focus:border-gaming-blue font-mono placeholder-gray-500"
                />
              </div>
            </div>

            {/* Ledger List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {(() => {
                const filtered = transactions.filter((t) => {
                  // Type filter
                  if (txFilter !== "all" && t.type !== txFilter) return false;
                  // Search query filter
                  if (txSearch) {
                    const desc = t.description?.toLowerCase() || "";
                    const id = t.id?.toLowerCase() || "";
                    const term = txSearch.toLowerCase();
                    return desc.includes(term) || id.includes(term);
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 border border-dashed border-gaming-border rounded-xl text-center bg-gaming-bg/25">
                      <p className="text-xs text-gray-500 font-sans">No transactions found matching your criteria.</p>
                      {transactions.length === 0 && (
                        <button
                          onClick={() => setActiveTab("wallet")}
                          className="mt-3.5 px-3 py-1.5 bg-gaming-blue text-[10px] text-white font-bold rounded-lg hover:bg-opacity-95 transition cursor-pointer uppercase font-display"
                        >
                          Top up Wallet Sandbox Now
                        </button>
                      )}
                    </div>
                  );
                }

                return filtered.map((tx) => {
                  let badgeColor = "";
                  let sign = "";
                  let iconElement = null;

                  if (tx.type === "addition") {
                    badgeColor = "bg-gaming-neon/15 text-gaming-neon border border-gaming-neon/25";
                    sign = "+";
                    iconElement = <Plus className="h-4 w-4 text-gaming-neon" />;
                  } else if (tx.type === "deduction") {
                    badgeColor = "bg-gaming-pink/15 text-gaming-pink border border-gaming-pink/25";
                    sign = "-";
                    iconElement = <Minus className="h-4 w-4 text-gaming-pink" />;
                  } else if (tx.type === "payout") {
                    badgeColor = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                    sign = "+";
                    iconElement = <Trophy className="h-4 w-4 text-amber-500" />;
                  } else if (tx.type === "withdrawal") {
                    badgeColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                    sign = "-";
                    iconElement = <ArrowDownToLine className="h-4 w-4 text-blue-400" />;
                  }

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 bg-gaming-bg border border-gaming-border rounded-xl flex items-center justify-between gap-4 hover:border-gaming-border-hover transition group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2 bg-gaming-card rounded-lg border border-gaming-border group-hover:bg-neutral-850">
                          {iconElement}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white tracking-wide truncate group-hover:text-gaming-blue transition">
                            {tx.description}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono font-bold text-gray-500 tracking-wider">
                              ID: {tx.id}
                            </span>
                            <span className="text-[8px] text-gray-500 font-mono">•</span>
                            <span className="text-[9px] text-gray-500 font-sans">
                              {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              })}{" "}
                              {new Date(tx.createdAt).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`font-mono text-xs font-black tracking-wide ${
                          sign === "+" ? "text-gaming-neon" : "text-gaming-pink"
                        }`}>
                          {sign}🪙 {tx.amount}
                        </div>
                        <div className="mt-1 flex justify-end">
                          <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            tx.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : tx.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-500 animate-pulse"
                              : "bg-rose-500/10 text-rose-500"
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <p className="text-[10px] text-gray-500 font-mono text-center pt-2">
              🔒 Standard dual-signed cryptographically verified ledger audits compiled in real-time.
            </p>
          </div>
        )}

        {/* TAB 5: Safety, Customisation & Settings */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="border-b border-gaming-border/60 pb-3.5">
              <h3 className="text-sm font-display font-extrabold text-white uppercase tracking-wider">SYSTEM CONFIGURATION & SECURITY</h3>
              <p className="text-xs text-gray-400">Configure theme preferences, automatic sunset rules, time simulator overrides, and safety parameters</p>
            </div>

            {/* Auto Sunset/Sunrise Theme Section */}
            <div className="bg-gaming-bg p-6 rounded-xl border border-gaming-border/80 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gaming-border/40">
                <div>
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Sparkles className="h-4.5 w-4.5 text-gaming-blue animate-pulse" />
                    <span>SUNSET TO SUNRISE AUTO-THEME CONTROL</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 pb-1">
                    Auto-schedules light/dark mode based on device system hours relative to sunset or sunrise times.
                  </p>
                </div>
                
                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAutoTheme?.(!isAutoTheme)}
                  className={`relative inline-flex h-6 w-11 mt-1 sm:mt-0 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAutoTheme ? "bg-gaming-neon" : "bg-gray-700"
                  }`}
                  aria-label="Toggle Auto Theme"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAutoTheme ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {isAutoTheme ? (
                <div className="space-y-4">
                  <div className="bg-gaming-blue/10 border border-gaming-blue/30 rounded-lg p-3.5 text-xs text-gray-300 space-y-2">
                    <p className="flex items-center gap-2 text-white font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-gaming-neon animate-pulse" />
                      Dynamic Solar Theme Sync Active
                    </p>
                    <p className="leading-relaxed">
                      Your display theme will automatically transition under the hood. Currently, the app Locks <strong className="text-white bg-[#0B0F17] px-1.5 py-0.5 rounded">🌙 DARK MODE</strong> during local system hours between{" "}
                      <strong className="text-gaming-neon font-bold">{sunsetHour}:00 PM ({sunsetHour}:00)</strong> Sunset and{" "}
                      <strong className="text-gaming-neon font-bold">0{sunriseHour}:00 AM (0{sunriseHour}:00)</strong> Sunrise. Outside this window, it defaults to light theme.
                    </p>
                  </div>

                  {/* Sunset/Sunrise Threshold sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                        🌇 Sunset Trigger Hour ({sunsetHour === 12 ? "12 PM" : sunsetHour > 12 ? `${sunsetHour - 12} PM` : `${sunsetHour} AM`}):
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="23"
                        value={sunsetHour}
                        onChange={(e) => setSunsetHour?.(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-gaming-border rounded-lg appearance-none cursor-pointer accent-gaming-blue focus:outline-none"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                        <span>12 PM (Noon)</span>
                        <span>6 PM (18:00)</span>
                        <span>11 PM (23:00)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                        🌅 Sunrise Trigger Hour (0{sunriseHour}:00 AM):
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="11"
                        value={sunriseHour}
                        onChange={(e) => setSunriseHour?.(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-gaming-border rounded-lg appearance-none cursor-pointer accent-gaming-blue focus:outline-none"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                        <span>1 AM</span>
                        <span>6 AM</span>
                        <span>11 AM</span>
                      </div>
                    </div>
                  </div>

                  {/* System Time Simulation and Override helper */}
                  <div className="border-t border-gaming-border/40 pt-4 space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                        🛠️ LOCAL SYSTEM HOUR SIMULATOR
                      </span>
                      {simulatedHour !== null && (
                        <button
                          type="button"
                          onClick={() => setSimulatedHour?.(null)}
                          className="text-[10px] text-gaming-pink hover:underline uppercase font-black cursor-pointer bg-gaming-pink/10 px-2 py-0.5 rounded border border-gaming-pink/20"
                        >
                          Clear Simulation Override
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Override and lock a simulated hour value below to test theme auto-switching behavior right now:
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { label: "🌅 Sunrise (6:00 AM)", hour: 6 },
                        { label: "☀️ Mid-Day (2:00 PM)", hour: 14 },
                        { label: "🌇 Sunset (7:00 PM)", hour: 19 },
                        { label: "🌃 Midnight (11:00 PM)", hour: 23 },
                      ].map((sim) => {
                        const isActive = simulatedHour === sim.hour;
                        return (
                          <button
                            key={sim.hour}
                            type="button"
                            onClick={() => setSimulatedHour?.(sim.hour)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition duration-150 border cursor-pointer ${
                              isActive
                                ? "bg-gaming-blue text-white border-gaming-blue shadow-md shadow-gaming-blue/20"
                                : "bg-[#0b0f17] text-gray-400 border-gaming-border hover:text-white hover:bg-gaming-border/30"
                            }`}
                          >
                            {sim.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-[#0b0f17] p-2.5 rounded-lg border border-gaming-border/50 text-[10.5px] font-mono flex items-center justify-between text-gray-400">
                      <span>Live Evaluated Output:</span>
                      {simulatedHour !== null ? (
                        <span className="text-gaming-neon font-bold uppercase animate-pulse">
                          ⚠️ SIMULATING {simulatedHour}:00 (Target theme: { (simulatedHour >= sunsetHour || simulatedHour < sunriseHour) ? "🌙 DARK (Sunset)" : "☀️ LIGHT (Daylight)" })
                        </span>
                      ) : (
                        <span>Actual Clock hour {new Date().getHours()}:00 (Target theme: { (new Date().getHours() >= sunsetHour || new Date().getHours() < sunriseHour) ? "🌙 DARK" : "☀️ LIGHT" })</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 leading-relaxed pt-1">
                  When enabled, the application automatically computes daylight schedules and switches theme modes on-the-fly. Give it a try!
                </p>
              )}
            </div>

            {/* Global Notification Sound Toggle Section */}
            <div className="bg-gaming-bg p-6 rounded-xl border border-gaming-border/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gaming-border/40">
                <div>
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    {isSoundMuted ? (
                      <VolumeX className="h-4.5 w-4.5 text-gaming-pink animate-pulse" />
                    ) : (
                      <Volume2 className="h-4.5 w-4.5 text-gaming-blue" />
                    )}
                    <span>CHIME SOUND EFFECTS & ALERTS</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Toggle the in-app notification chime heard when a tournament commences or match reminders trigger.
                  </p>
                </div>
                
                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => setIsSoundMuted?.(!isSoundMuted)}
                  className={`relative inline-flex h-6 w-11 mt-1 sm:mt-0 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    !isSoundMuted ? "bg-gaming-neon" : "bg-gray-700"
                  }`}
                  aria-label="Toggle Sound Notifications"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      !isSoundMuted ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1.5">
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${!isSoundMuted ? "bg-gaming-neon animate-ping" : "bg-gaming-neon"}`} />
                  {isSoundMuted ? (
                    <span>All arena match-commence notification sounds are <strong className="text-gaming-pink uppercase font-mono">MUTED</strong>.</span>
                  ) : (
                    <span>Arena match-commence notification sounds are <strong className="text-gaming-neon uppercase font-mono">ACTIVE</strong>.</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isSoundMuted) {
                      alert("🔊 Notifications are currently muted! Unmute them using the switch toggle above to test the arena chime.");
                    } else {
                      if ("Audio" in window) {
                        const sfx = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav");
                        sfx.volume = 0.45;
                        sfx.play().catch(() => {});
                      }
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono border transition duration-150 flex items-center gap-1.5 cursor-pointer uppercase ${
                    isSoundMuted
                      ? "bg-black/20 border-gaming-border text-gray-500 cursor-not-allowed"
                      : "bg-[#0b0f17] border-gaming-blue/30 text-gaming-blue hover:text-white hover:bg-gaming-blue/10 hover:shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  }`}
                >
                  🔊 TEST ARENA CHIME
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Profile Email verification */}
              <div className="bg-gaming-bg p-5 rounded-xl border border-gaming-border/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <MailCheck className={`h-5 w-5 ${user?.verified ? "text-gaming-neon" : "text-gray-400"}`} />
                    <span>EMAIL VERIFICATION</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
                    Verify account ownership to enable instant prize withdrawal approvals of over 1,000 Coins.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-gaming-border/40">
                  {user?.verified || verificationSuccess ? (
                    <div className="bg-gaming-neon/10 border border-gaming-neon/35 text-gaming-neon text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-center">
                      <Check className="h-4 w-4" /> SECURED & VERIFIED EMAIL
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {retractedCode ? (
                        <form onSubmit={handleConfirmVerification} className="space-y-2">
                          <div className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-500 text-[10px] p-2.5 rounded font-mono mb-1">
                            📬 [TESTING OTP SENT]: Complete simulated verify by entering OTP: <strong className="text-white text-xs">{retractedCode}</strong>
                          </div>

                          {retractedCodeUrl && (
                            <div className="bg-gaming-blue/15 border border-gaming-blue/30 text-gray-300 text-[10px] p-2.5 rounded font-sans space-y-1.5 mb-2 text-left">
                              <p className="font-bold text-white">📬 Real SMTP Dispatch Active (वर्चुअल ईमेल भेजी गई):</p>
                              <p className="leading-relaxed">We've successfully sent a beautiful styled email containing your OTP code to your address via an Ethereal SMTP server!</p>
                              <a
                                href={retractedCodeUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center justify-center gap-1 w-full bg-gaming-blue hover:bg-gaming-blue/90 text-white font-bold py-1.5 px-3 rounded uppercase text-[9px] tracking-wider transition cursor-pointer active:scale-97 shadow-[0_2px_8px_rgba(20,110,245,0.4)] hover:shadow-[0_0_12px_rgba(20,110,245,0.65)]"
                              >
                                Open Real Email Inbox 📧 ↗
                              </a>
                            </div>
                          )}

                          {verificationError && <div className="text-[10px] text-gaming-pink font-bold">{verificationError}</div>}

                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={userEnteredCode}
                              onChange={(e) => setUserEnteredCode(e.target.value)}
                              placeholder="Enter 6-digit OTP"
                              maxLength={6}
                              className="bg-gaming-card border border-gaming-border rounded px-2.5 py-1 text-xs text-white flex-1 focus:outline-none font-mono text-center tracking-widest text-sm"
                            />
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded bg-gaming-blue text-xs font-bold text-white uppercase font-display"
                            >
                              VERIFY
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={handleRequestVerificationCode}
                          disabled={verificationLoading}
                          className="w-full text-center py-2 rounded-lg bg-gaming-blue text-xs font-semibold hover:opacity-90 transition font-display uppercase tracking-wider cursor-pointer"
                        >
                          {verificationLoading ? "DISPATCHING OTP..." : "REQUEST VERIFICATION OTP"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2 Factor Authenticator (2FA) */}
              <div className="bg-gaming-bg p-5 rounded-xl border border-gaming-border/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <QrCode className={`h-5 w-5 ${user?.twoFactorEnabled ? "text-gaming-neon animate-pulse" : "text-gray-400"}`} />
                    <span>2-FACTOR SECURITY (2FA)</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
                    Protect cash withdraw parameters against phishing by completing regular authentication challenges.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-gaming-border/40">
                  {user?.twoFactorEnabled ? (
                    <div className="space-y-2.5">
                      <div className="bg-gaming-neon/10 border border-gaming-neon/30 text-gaming-neon text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-center font-display">
                        <Check className="h-4 w-4" /> 2FA PROTECTION ENABLED
                      </div>
                      <button
                        onClick={handleDisable2FA}
                        className="w-full text-center text-gray-500 hover:text-gaming-pink text-[10px] font-bold uppercase"
                      >
                        Deactivate 2FA protection
                      </button>
                    </div>
                  ) : is2faExpanded ? (
                    <form onSubmit={handleEnable2FA} className="space-y-3.5">
                      <div className="bg-gaming-card p-3 rounded border border-gaming-border flex items-center gap-3">
                        {/* Mock Authenticator QR code */}
                        <div className="h-14 w-14 bg-white p-1 rounded">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=EsportsHubSafety" alt="qr" className="h-full w-full object-contain" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-[9px] text-gray-400 block font-mono">1. SCAN QR WITH GOOGLE AUTHENTICATOR</span>
                          <span className="text-[9px] text-gray-400 block font-mono">2. SECURE WITH CONFIRMATION KEY</span>
                        </div>
                      </div>

                      {twoFactorError && <p className="text-[10px] text-gaming-pink font-bold">{twoFactorError}</p>}

                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          placeholder="Type '123456'"
                          className="bg-gaming-card border border-gaming-border rounded px-2.5 py-1 text-xs text-white font-mono text-center flex-1"
                        />
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded bg-gaming-neon text-xs font-bold text-white uppercase font-display cursor-pointer"
                        >
                          PAIR
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIs2faExpanded(true)}
                      className="w-full text-center py-2 rounded-lg bg-gaming-border hover:bg-gaming-blue hover:text-white transition text-xs font-semibold font-display uppercase tracking-wider cursor-pointer"
                    >
                      SET UP AUTHENTICATOR APP
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payment" && (
          <PaymentSettings
            user={user}
            onUpdatePaymentMethods={handleUpdatePaymentMethods}
          />
        )}
      </div>

      {/* Payout Details Modal Overlay */}
      {selectedCompletedEvent && (() => {
        const item = selectedCompletedEvent;
        const grossWinnings = item.winnings || 0;
        const taxRate = 0.10; // 10% simulated TDS
        const tdsAmount = Math.round(grossWinnings * taxRate);
        const processingFeeRate = 0.025; // 2.5% platform escrow fee
        const processingFee = Math.round(grossWinnings * processingFeeRate);
        const netPayout = grossWinnings > 0 ? Math.max(0, grossWinnings - tdsAmount - processingFee) : 0;
        const winStreakBonus = item.rankAchieved?.toLowerCase().includes("1st") ? Math.round(grossWinnings * 0.05) : 0;
        const finalDispatched = netPayout + winStreakBonus;

        // Generate dynamic yet consistent mock audit details
        const settlementId = `ST-${item.id.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const clearedDate = new Date(new Date(item.date).getTime() + 45 * 60 * 1000).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });

        return (
          <div className="fixed inset-0 z-50 bg-[#07090e]/85 backdrop-blur-md flex items-center justify-center p-4">
            <div 
              className="bg-[#0e121e] border-2 border-gaming-blue/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,180,216,0.15)] animate-in fade-in zoom-in duration-300 font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Banner Accent */}
              <div className="h-2 bg-gradient-to-r from-gaming-blue via-indigo-500 to-gaming-neon" />

              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-gaming-blue/10 text-gaming-blue border border-gaming-blue/20">
                      📜 SETTLED PAYOUT RECEIPT
                    </span>
                    <h3 className="text-base font-display font-extrabold text-white uppercase tracking-tight max-w-[320px] truncate leading-tight">
                      {item.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedCompletedEvent(null)}
                    className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Status Bar */}
                <div className="bg-[#121727] rounded-xl border border-gaming-border/50 p-3 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {grossWinnings > 0 ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-gaming-neon shadow-[0_0_8px_rgba(0,225,217,0.7)] animate-pulse shrink-0" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-500 shrink-0" />
                    )}
                    <div className="text-left">
                      <span className="text-[8px] text-gray-500 uppercase font-mono block">Clearance Status</span>
                      <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${grossWinnings > 0 ? "text-gaming-neon" : "text-gray-400"}`}>
                        {grossWinnings > 0 ? "APPROVED & FULLY SETTLED" : "COMPLETED / NO PAYOUT DISPATCH"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-gray-500 uppercase font-mono block">Cleared At</span>
                    <span className="text-[10px] text-gray-300 font-mono font-bold">{clearedDate}</span>
                  </div>
                </div>

                {/* Winnings Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-[9.5px] text-gray-400 font-mono font-black uppercase tracking-wider border-b border-gaming-border/40 pb-1.5">
                    Financial Balance Ledger
                  </h4>
                  
                  <div className="space-y-2.5">
                    {/* Gross Rewards */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                        <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Gross Placement Prize ( {item.rankAchieved} )
                      </span>
                      <span className="text-white font-mono font-semibold">🪙 {grossWinnings.toLocaleString()}</span>
                    </div>

                    {/* Bonus multiplier row if Champion */}
                    {winStreakBonus > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-emerald-400 flex items-center gap-1.5 font-medium pl-5">
                          <Plus className="h-3 w-3" /> Champion Winner Streak Bonus (5%)
                        </span>
                        <span className="text-emerald-400 font-mono font-semibold">+🪙 {winStreakBonus.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Deductions */}
                    {grossWinnings > 0 ? (
                      <>
                        {/* TDS Tax */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 flex items-center gap-1.5 pl-5">
                            <Minus className="h-3 w-3 text-gaming-pink shrink-0" /> Govt TDS Tax Deduction (10%)
                          </span>
                          <span className="text-gaming-pink font-mono font-semibold">-🪙 {tdsAmount.toLocaleString()}</span>
                        </div>

                        {/* Platform Fee */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 flex items-center gap-1.5 pl-5">
                            <Minus className="h-3 w-3 text-gaming-pink shrink-0" /> Esports Hub Escrow Fee (2.5%)
                          </span>
                          <span className="text-gaming-pink font-mono font-semibold">-🪙 {processingFee.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-[10.5px] text-gray-400 italic py-2 pl-2">
                        No financial transactions were booked for this event. Placing amongst Top Contenders in future matches unlocks direct prize-pool dispatches.
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-gaming-border/40 my-3" />

                    {/* Net Payout */}
                    <div className="flex justify-between items-center bg-[#101423] p-3 rounded-xl border border-gaming-border/30">
                      <span className="text-xs text-white font-display font-bold uppercase tracking-wide flex items-center gap-1.5">
                        <Wallet className="h-4 w-4 text-gaming-neon" /> Net Dispatched Payout
                      </span>
                      <span className="text-base font-mono font-extrabold text-gaming-neon drop-shadow-[0_0_6px_rgba(0,225,217,0.3)]">
                        🪙 {finalDispatched.toLocaleString()} Coins
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Information */}
                {grossWinnings > 0 && (
                  <div className="bg-[#0b0e17] rounded-xl p-3 border border-[#162035]/60 mt-5 space-y-1.5 font-mono text-[9px] text-gray-400">
                    <div className="flex justify-between">
                      <span className="uppercase text-[8px] font-bold">Settlement ID</span>
                      <span className="text-gray-300 select-all font-bold">{settlementId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase text-[8px] font-bold">Payout Gateway</span>
                      <span className="text-gray-300">Esports Hub Escrow v2_Standard</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase text-[8px] font-bold">Ledger Class</span>
                      <span className="text-indigo-400 font-bold">Secured Wallet Transfer</span>
                    </div>
                    <p className="text-[8px] leading-relaxed text-gray-500 pt-2 border-t border-gaming-border/20">
                      This cash transaction was dispatched automatically following match referee results substantiation. Funds can be withdrawn instantly under RBI regulatory fast-cash channels.
                    </p>
                  </div>
                )}

                {/* Close Button */}
                <div className="mt-6 pt-3.5 border-t border-gaming-border/40 flex justify-end">
                  <button
                    onClick={() => setSelectedCompletedEvent(null)}
                    className="px-5 py-2 rounded-lg bg-gaming-blue text-white hover:bg-gaming-blue/90 text-xs font-black uppercase font-display tracking-widest cursor-pointer transition active:scale-97"
                  >
                    ACKNOWLEDGEMENT COMPLETE
                  </button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
      <OnboardingOverlay 
        isOpen={isOnboardingOpen} 
        onClose={handleCloseOnboarding} 
        isDarkMode={isDarkMode} 
      />
      <PaymentGatewayModal
        isOpen={isPaymentGatewayOpen}
        onClose={() => setIsPaymentGatewayOpen(false)}
        amount={depositAmount}
        paymentMethod={savedPaymentMethods.find(m => m.id === selectedTopUpMethodId) || savedPaymentMethods[0] || null}
        onSuccess={handlePaymentGatewaySuccess}
        isDarkMode={isDarkMode}
        isSoundMuted={isSoundMuted}
      />
    </div>
  );
}
