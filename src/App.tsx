import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInAnonymously 
} from "firebase/auth";
import { 
  dbFetchEvents, 
  dbFetchLeaderboard, 
  dbSubscribeLeaderboard, 
  dbGetUserProfile, 
  dbSaveUserProfile, 
  dbFetchRegistrations, 
  dbFetchWithdrawals, 
  dbFetchNotifications, 
  dbAddNotification,
  dbSubscribeUserProfile
} from "./firebaseService";
import { TournamentEvent, UserProfile, EventRegistration, WithdrawalRequest, InAppNotification, LeaderboardRank } from "./types";
import { 
  Gamepad2, Trophy, Flame, Bell, User, ShieldAlert, LogOut, Sun, Moon, 
  ChevronRight, Lock, Mail, UserPlus, Loader2, Sparkles, Check, HelpCircle, 
  Tv, Heart, HelpCircle as HelpIcon, ArrowRight, Search, SlidersHorizontal,
  LayoutGrid, Calendar, Eye, EyeOff, ArrowUpDown, History
} from "lucide-react";
import { motion } from "motion/react";

// Subcomponents
import LandingHero from "./components/LandingHero";
import TournamentCard from "./components/TournamentCard";
import TournamentCalendar from "./components/TournamentCalendar";
import RegistrationModal from "./components/RegistrationModal";
import BulkRegistrationModal from "./components/BulkRegistrationModal";
import LeaderboardTable from "./components/LeaderboardTable";
import DiscordWebhooks from "./components/DiscordWebhooks";
import AdminConsole from "./components/AdminConsole";
import UserDashboard from "./components/UserDashboard";
import InAppAlerts from "./components/InAppAlerts";
import MatchChat from "./components/MatchChat";
import FAQSection from "./components/FAQSection";
import OTPVerificationModal from "./components/OTPVerificationModal";

export default function App() {
  // App Themes
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync isDarkMode with document.body to enable smooth body-level transitions
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Authentication states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [guestUser, setGuestUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Wallet balance increase transition state
  const prevBalanceRef = useRef<number | null>(null);
  const [isWalletIncreasing, setIsWalletIncreasing] = useState(false);

  // Track wallet balance changes to trigger a "pop" & "color-fade"
  useEffect(() => {
    if (userProfile !== null && userProfile !== undefined) {
      const currentBalance = userProfile.walletBalance || 0;
      if (prevBalanceRef.current !== null && currentBalance > prevBalanceRef.current) {
        setIsWalletIncreasing(true);
        const timer = setTimeout(() => {
          setIsWalletIncreasing(false);
        }, 1500);
        prevBalanceRef.current = currentBalance;
        return () => clearTimeout(timer);
      }
      prevBalanceRef.current = currentBalance;
    }
  }, [userProfile?.walletBalance]);

  // Active Screen Segment Tracker
  const [activeSection, setActiveSection] = useState<"tournaments" | "leaderboard" | "alerts" | "dashboard" | "admin" | "help">("tournaments");

  // Database core states
  const [tournaments, setTournaments] = useState<TournamentEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRank[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<EventRegistration[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Selection states
  const [activeRegEvent, setActiveRegEvent] = useState<TournamentEvent | null>(null);
  const [activeChatEvent, setActiveChatEvent] = useState<TournamentEvent | null>(null);
  const [selectedBulkEvents, setSelectedBulkEvents] = useState<TournamentEvent[]>([]);
  const [isBulkRegModalOpen, setIsBulkRegModalOpen] = useState(false);

  // Loading indicator
  const [loadingDb, setLoadingDb] = useState(true);
  const [tournamentSearchQuery, setTournamentSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("recentSearches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("recentSearches", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save recent searches", err);
      }
      return updated;
    });
  };

  const removeRecentSearch = (query: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((q) => q.toLowerCase() !== query.toLowerCase().trim());
      try {
        localStorage.setItem("recentSearches", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save recent searches", err);
      }
      return updated;
    });
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("recentSearches");
    } catch (err) {
      console.error("Failed to clear recent searches", err);
    }
  };

  const [tournamentViewMode, setTournamentViewMode] = useState<"list" | "calendar">("list");
  const [tournamentSortBy, setTournamentSortBy] = useState<"prizePool" | "startDate" | "slotsAvailable">("startDate");
  const [notifiedTournaments, setNotifiedTournaments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("gamerzone_notified_tournaments");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Auto twilight theme toggle states
  const [isAutoTheme, setIsAutoTheme] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("gamerzone_is_auto_theme");
      return saved === "true";
    } catch (e) {
      return false;
    }
  });

  const [sunsetHour, setSunsetHour] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("gamerzone_sunset_hour");
      return saved ? parseInt(saved, 10) : 18; // default 6:00 PM (18)
    } catch (e) {
      return 18;
    }
  });

  const [sunriseHour, setSunriseHour] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("gamerzone_sunrise_hour");
      return saved ? parseInt(saved, 10) : 6; // default 6:00 AM (6)
    } catch (e) {
      return 6;
    }
  });

  const [simulatedHour, setSimulatedHour] = useState<number | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("gamerzone_sound_muted");
      return saved === "true";
    } catch (e) {
      return false;
    }
  });

  // Persist auto theme options and sound settings
  useEffect(() => {
    try {
      localStorage.setItem("gamerzone_is_auto_theme", isAutoTheme.toString());
      localStorage.setItem("gamerzone_sunset_hour", sunsetHour.toString());
      localStorage.setItem("gamerzone_sunrise_hour", sunriseHour.toString());
      localStorage.setItem("gamerzone_sound_muted", isSoundMuted.toString());
    } catch (e) {}
  }, [isAutoTheme, sunsetHour, sunriseHour, isSoundMuted]);

  // Handle auto sunset theme evaluation
  useEffect(() => {
    if (!isAutoTheme) return;

    const evaluateAutoTheme = () => {
      const currentHour = simulatedHour !== null ? simulatedHour : new Date().getHours();
      
      // Check if currentHour is in Sunset to Sunrise range
      let targetDark = false;
      if (sunsetHour > sunriseHour) {
        targetDark = currentHour >= sunsetHour || currentHour < sunriseHour;
      } else {
        targetDark = currentHour >= sunsetHour && currentHour < sunriseHour;
      }

      if (isDarkMode !== targetDark) {
        setIsDarkMode(targetDark);
      }
    };

    evaluateAutoTheme();
    const timer = setInterval(evaluateAutoTheme, 5000); // Check every 5 seconds
    return () => clearInterval(timer);
  }, [isAutoTheme, sunsetHour, sunriseHour, simulatedHour, isDarkMode]);

  // Synchronous initialisation trigger
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (rawUser) => {
      setFirebaseUser(rawUser);
      if (rawUser) {
        // Fetch profile
        let profile = await dbGetUserProfile(rawUser.uid);
        if (!profile) {
          // Auto create initial profile for new logins
          const fallbackUsername = signupUsername || rawUser.email?.split("@")[0] || "EsportsGamer";
          profile = {
            uid: rawUser.uid,
            username: fallbackUsername,
            email: rawUser.email || "guest@gamerzone.com",
            role: (rawUser.email === "vkoushal600@gmail.com" || rawUser.email === "vkoushal650@gmail.com" || isAdminMode) ? "admin" : "user", // Auto-admin the principal user!
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackUsername}`,
            verified: true,
            phoneVerified: true,
            twoFactorEnabled: false,
            walletBalance: 500, // Pre-load 500 coins so they can try paid entries right away!
            earnings: 0,
            discordWebhook: "",
            bio: "Ultimate tactical mobile contender!"
          };
          await dbSaveUserProfile(profile);
        } else {
          // Force Admin role for bootstrapped admins in case they previously had lower privileges
          const isDesignatedAdmin = rawUser.email === "vkoushal600@gmail.com" || rawUser.email === "vkoushal650@gmail.com" || isAdminMode;
          if (isDesignatedAdmin && profile.role !== "admin") {
            profile.role = "admin";
            await dbSaveUserProfile(profile);
          }
        }
        if (profile && (!profile.phoneVerified || !profile.verified)) {
          profile.phoneVerified = true;
          profile.verified = true;
          await dbSaveUserProfile(profile);
        }
        setUserProfile(profile);

        // Cancel previous profile subscription if any
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }

        // Dynamic real-time sync of user wallet data & profile properties
        unsubscribeProfile = dbSubscribeUserProfile(rawUser.uid, (updatedProfile) => {
          setUserProfile(updatedProfile);
        });
        
        // Sync user historical dependencies
        await syncUserData(rawUser.uid);
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUserProfile(null);
        setRegistrations([]);
        setWithdrawals([]);
        setNotifications([]);
      }
      setLoadingDb(false);
    });

    // Populate initial public tournaments and leaderboards
    triggerPublicSyncs();

    // Subscribe to real-time leaderboard updates
    const unsubscribeLeaderboard = dbSubscribeLeaderboard((updatedRanks) => {
      setLeaderboard(updatedRanks);
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribeLeaderboard();
    };
  }, [signupUsername]);

  // Periodic simulated live notification poll to keep events active!
  useEffect(() => {
    if (!userProfile) return;
    const interval = setInterval(async () => {
      // Simulate live random score ticker / match start alert
      const rand = Math.random();
      if (rand > 0.8) {
        const titlePreset = ["🔥 Valorant Match Notice", "🏆 Winnings Released!", "📅 Lobby Room Configured"];
        const descPreset = [
          "Room ID 8901 for BGMI India Classic match is now live in discord!",
          "Admin approved your mock tournament earnings payout of 350 Coins!",
          "Verify your entry key in settings to join the tactical servers."
        ];
        const matchTitleIdx = Math.floor(Math.random() * titlePreset.length);
        
        const notificationId = "NOT-" + Math.floor(100000 + Math.random() * 900000);
        const newAlert: InAppNotification = {
          id: notificationId,
          userId: userProfile.uid,
          title: titlePreset[matchTitleIdx],
          body: descPreset[matchTitleIdx],
          read: false,
          createdAt: new Date().toISOString()
        };
        await dbAddNotification(newAlert);
        setNotifications(prev => [newAlert, ...prev]);

        // Trigger safe sound or browser alert if push is turned on
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(newAlert.title, { body: newAlert.body });
        }
      }
    }, 45000); // Trigger every 45s

    return () => clearInterval(interval);
  }, [userProfile]);

  // Load shared query link parameters if present on startup
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteId = params.get("tournament");
      if (inviteId) {
        // Automatically switch section to tournaments Roster view
        setActiveSection("tournaments");
        // Pop search query to trigger single display card instantly
        setTournamentSearchQuery(inviteId.trim());
      }
    } catch (e) {
      console.warn("Query parameters URL check error:", e);
    }
  }, [tournaments]);

  const triggerPublicSyncs = async () => {
    try {
      const liveEvts = await dbFetchEvents();
      setTournaments(liveEvts);
      const scores = await dbFetchLeaderboard();
      setLeaderboard(scores);
      const allRegs = await dbFetchRegistrations();
      if (allRegs) {
        setAllRegistrations(allRegs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const syncUserData = async (uid: string) => {
    try {
      const pastRegs = await dbFetchRegistrations(uid);
      setRegistrations(pastRegs);
      const currentPays = await dbFetchWithdrawals(uid);
      setWithdrawals(currentPays);
      const logNotices = await dbFetchNotifications(uid);
      setNotifications(logNotices);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerTournamentReminder = async (evt: TournamentEvent, diffMinutes: number) => {
    // Prevent duplicate triggers
    if (notifiedTournaments.includes(evt.id)) return;
    
    // Save to state and storage
    const updated = [...notifiedTournaments, evt.id];
    setNotifiedTournaments(updated);
    try {
      localStorage.setItem("gamerzone_notified_tournaments", JSON.stringify(updated));
    } catch (e) {}

    const roundedMinutes = Math.max(1, Math.round(diffMinutes));
    const title = `🚨 Match Commencing: ${evt.title}`;
    const body = `Your registered esports tournament "${evt.title}" (${evt.game}) begins in ${roundedMinutes} minutes! Get ready to check in.`;

    if (userProfile) {
      const notificationId = "ALER-" + Math.floor(100000 + Math.random() * 900000);
      const newAlert: InAppNotification = {
        id: notificationId,
        userId: userProfile.uid,
        title: title,
        body: body,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      try {
        await dbAddNotification(newAlert);
        setNotifications(prev => [newAlert, ...prev]);

        // Try playing native chime
        if (!isSoundMuted && "Audio" in window) {
          const sfx = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav");
          sfx.volume = 0.45;
          sfx.play().catch(() => {});
        }
      } catch (err) {
        console.error("Failed adding alert to Firestore:", err);
      }
    }

    // Trigger standard browser push Notification
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, {
            body: body,
            icon: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=100&auto=format&fit=crop"
          });
        } catch (err) {
          console.error("Standard Notification push error:", err);
        }
      }
    }
  };

  // 15-minute scheduler loop checking active tournament schedules
  useEffect(() => {
    if (!userProfile || registrations.length === 0 || tournaments.length === 0) return;

    const checkSchedules = async () => {
      const now = Date.now();
      
      for (const reg of registrations) {
        const associatedTourney = tournaments.find(t => t.id === reg.eventId);
        if (!associatedTourney || associatedTourney.status !== "upcoming") continue;
        
        const tourneyTime = new Date(associatedTourney.date).getTime();
        const diffMs = tourneyTime - now;
        const diffMinutes = diffMs / (1000 * 60);

        // Alert user if tournament starts in <= 15 minutes and is upcoming
        if (diffMinutes <= 15 && diffMinutes > 0) {
          await triggerTournamentReminder(associatedTourney, diffMinutes);
        }
      }
    };

    // Run first check on mount
    checkSchedules();

    // Check once every 15 seconds
    const schedInterval = setInterval(checkSchedules, 15000);

    return () => clearInterval(schedInterval);
  }, [userProfile, registrations, tournaments, notifiedTournaments]);

  // Alert simulation triggers for troubleshooting & testing
  const handleSimulate15mReminder = async () => {
    // Locate one registered tournament or fallback to a template
    const joinedEvent = tournaments.find(t => registrations.some(r => r.eventId === t.id)) || tournaments[0];
    const dummyEvent: TournamentEvent = joinedEvent || {
      id: "simulated-test-event",
      title: "BGMI Custom Masters Pro",
      game: "BGMI (Battlegrounds Mobile India)",
      description: "Esports custom battle royale",
      date: new Date(Date.now() + 14 * 60000).toISOString(), // starts in 14 mins
      fee: 100,
      prizePool: 10000,
      status: "upcoming",
      maxParticipants: 100,
      slotsFilled: 20,
      firstPrize: 6000,
      secondPrize: 3000,
      thirdPrize: 1000
    };

    // Temporarily clear to guarantee delivery
    const remaining = notifiedTournaments.filter(id => id !== dummyEvent.id);
    setNotifiedTournaments(remaining);

    // Call standard scheduler alert!
    await triggerTournamentReminder(dummyEvent, 14.5);
  };

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      if (isSignup) {
        if (!signupUsername.trim()) {
          setAuthError("Gamer Username is required for roster cards");
          setAuthLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      const isOpNotAllowed = err?.code === "auth/operation-not-allowed" || err?.message?.includes("operation-not-allowed");
      if (!isOpNotAllowed) {
        console.error(err);
      } else {
        console.warn("Auth provider not enabled. Activating Sandbox mode as fallback.");
      }
      if (isOpNotAllowed) {
        const randId = Math.floor(100000 + Math.random() * 900000);
        const demoUsername = signupUsername || email.split("@")[0] || `Gamer_${randId}`;
        const sandboxProfile: UserProfile = {
          uid: `sandbox_${randId}`,
          username: demoUsername,
          email: email || `${demoUsername.toLowerCase()}@gamerpulse.com`,
          role: (email === "vkoushal600@gmail.com" || email === "vkoushal650@gmail.com" || isAdminMode) ? "admin" : "user",
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${demoUsername}`,
          verified: true,
          phoneVerified: true,
          twoFactorEnabled: false,
          walletBalance: 1000, // Pre-load 1000 coins for testing
          earnings: 250,
          discordWebhook: "",
          bio: "Local Sandbox Mode Esports Champion!"
        };
        setUserProfile(sandboxProfile);
        setGuestUser({ uid: sandboxProfile.uid, email: sandboxProfile.email });
        setNotifications([
          {
            id: "NOT-SANDBOX-AUTH",
            userId: sandboxProfile.uid,
            title: "🌐 Local Sandbox Activated",
            body: "Your Firebase Auth Email/Password provider is not yet enabled in the Firebase Console. We have seamlessly logged you into a fully functional local offline sandbox session so you can explore and test all match events!",
            read: false,
            createdAt: new Date().toISOString()
          }
        ]);
        setAuthError(""); // Clear error to allow immediate transition
      } else {
        setAuthError(err.message?.replace("Firebase: ", "") || "Authentication failed. Validate credentials.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInstantGuestDemo = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      // Auto register anonymous developer demo guest Profile
      await signInAnonymously(auth);
    } catch (err: any) {
      console.warn("Anonymous sign-in blocked by console rules. Falling back to dynamic guest account creator...", err);
      try {
        const randId = Math.floor(100000 + Math.random() * 900000);
        const guestEmail = `guest_${randId}@gamerpulse.com`;
        const guestPassword = `GamerPulseGuest123!`;
        // Set signupUsername so that userProfile sync generates the correct username
        setSignupUsername(`GuestGamer_${randId}`);
        await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
      } catch (fallbackErr: any) {
        console.warn("Firebase Auth providers are disabled in your console. Directing to Local Sandbox Mode...", fallbackErr);
        // Automatically start in local sandbox mode!
        const randId = Math.floor(100000 + Math.random() * 900000);
        const demoUsername = `GuestGamer_${randId}`;
        const sandboxProfile: UserProfile = {
          uid: `sandbox_${randId}`,
          username: demoUsername,
          email: `${demoUsername.toLowerCase()}@gamerpulse.com`,
          role: "admin", // Let them try admin functions too in local sandbox mode!
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${demoUsername}`,
          verified: true,
          phoneVerified: true,
          twoFactorEnabled: false,
          walletBalance: 1000, // Pre-load 1000 coins for testing
          earnings: 250,
          discordWebhook: "",
          bio: "Local Sandbox Mode Esports Champion!"
        };
        
        setUserProfile(sandboxProfile);
        setGuestUser({ uid: sandboxProfile.uid, email: sandboxProfile.email });
        setNotifications([
          {
            id: "NOT-SANDBOX-1",
            userId: sandboxProfile.uid,
            title: "🌐 Sandbox Mode Activated",
            body: "Your Firebase Auth Email/Password provider is not yet enabled in the Firebase Console. We have initiated a fully functional Local Offline Sandbox Mode for you so you can explore and seed without errors!",
            read: false,
            createdAt: new Date().toISOString()
          }
        ]);
        setAuthError(""); // Clear any auth error
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInstantAdminDemo = () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const demoUsername = "EsportsOrganizer_VK";
      const sandboxProfile: UserProfile = {
        uid: "sandbox_admin_vk_99",
        username: demoUsername,
        email: "vkoushal600@gmail.com", // Belongs to primary organizer!
        role: "admin",
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${demoUsername}`,
        verified: true,
        twoFactorEnabled: false,
        walletBalance: 25000,
        earnings: 12500,
        discordWebhook: "",
        bio: "Senior Esports Tournament Director"
      };
      
      setUserProfile(sandboxProfile);
      setGuestUser({ uid: sandboxProfile.uid, email: sandboxProfile.email });
      setNotifications([
        {
          id: "NOT-SANDBOX-ADMIN-1",
          userId: sandboxProfile.uid,
          title: "🛡️ Administrative Console Active",
          body: "You have accessed the Tournament Organizer administrative panel. You can now create brackets, publish tournaments, approve player payments, and moderate accounts.",
          read: false,
          createdAt: new Date().toISOString()
        }
      ]);
      setAuthError(""); // Clear any auth error
    } catch (err: any) {
      console.error("Admin bypass failed:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Logged out of offline/disabled session", e);
    }
    setGuestUser(null);
    setUserProfile(null);
  };

  // Callback on event registration success
  const handleRegSuccess = async (newReg: EventRegistration) => {
    setRegistrations(prev => [newReg, ...prev]);
    setActiveRegEvent(null);
    await triggerPublicSyncs(); // Reload filled slots count

    // Create confirmation notice
    if (userProfile) {
      const sampleEvt = tournaments.find((t) => t.id === newReg.eventId);
      const noticeId = "NOT-" + Math.floor(100000 + Math.random() * 900000);
      const rNotice: InAppNotification = {
        id: noticeId,
        userId: userProfile.uid,
        title: "🎟️ Tournament Registered!",
        body: `You joined ${sampleEvt?.title || "Match"}. Use entry handle ${newReg.username} in room channels on Discord.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      await dbAddNotification(rNotice);
      setNotifications(prev => [rNotice, ...prev]);

      // Fire Discord webhook notice if webhook was configured in client profile!
      if (userProfile.discordWebhook) {
        await fetch("/api/discord-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webhookUrl: userProfile.discordWebhook,
            title: sampleEvt?.title || "Live Esports",
            message: `🎮 Player registration confirmed! Gamer: **${newReg.username}** joined team: **${newReg.teamName}**!`
          })
        });
      }
    }
  };

  // Callback on bulk event registration success
  const handleBulkRegSuccess = async (newRegs: EventRegistration[]) => {
    setRegistrations(prev => [...newRegs, ...prev]);
    setIsBulkRegModalOpen(false);
    setSelectedBulkEvents([]);
    await triggerPublicSyncs(); // Reload filled slots count

    if (userProfile && newRegs.length > 0) {
      const noticeId = "NOT-" + Math.floor(100000 + Math.random() * 900000);
      const rNotice: InAppNotification = {
        id: noticeId,
        userId: userProfile.uid,
        title: "🎟️ Bulk Registration Successful!",
        body: `You have successfully joined ${newRegs.length} tournament lobbies. View matches in your player dashboard!`,
        read: false,
        createdAt: new Date().toISOString()
      };
      await dbAddNotification(rNotice);
      setNotifications(prev => [rNotice, ...prev]);
    }
  };

  const handleUpdateWalletState = (newBalance: number) => {
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        walletBalance: newBalance
      });
    }
  };

  const handleSaveDiscordWebhook = async (url: string) => {
    if (userProfile) {
      const updated = {
        ...userProfile,
        discordWebhook: url
      };
      await dbSaveUserProfile(updated);
      setUserProfile(updated);
    }
  };

  const handleVerifyPhoneSuccess = async (emailAddress: string) => {
    if (userProfile) {
      const updated: UserProfile = {
        ...userProfile,
        email: emailAddress,
        phoneNumber: emailAddress,
        phoneVerified: true,
        verified: true
      };
      await dbSaveUserProfile(updated);
      setUserProfile(updated);
    }
  };

  const markNotificationRead = async (noticeId: string) => {
    setNotifications(prev => prev.map(n => n.id === noticeId ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Main layout render
  return (
    <div className={`min-h-screen transition-colors duration-500 ease-in-out ${
      isDarkMode 
        ? "bg-gaming-bg text-gray-100" 
        : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* AUTHENTICATION LAYER */}
      {!(firebaseUser || guestUser) ? (
        <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Futuristic ambient lights & background grid */}
          <div className="absolute inset-0 bg-[#030508] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#16223540_1px,transparent_1px),linear-gradient(to_bottom,#16223540_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          
          {/* Floating glowing orbs */}
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-gaming-blue/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gaming-pink/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-gaming-card/90 backdrop-blur-2xl rounded-3xl overflow-hidden border border-gaming-border/80 shadow-[0_0_80px_rgba(0,0,0,0.6),0_0_40px_rgba(0,229,255,0.05)] relative z-10">
            {/* Visual branding screen left - Span 5 cols */}
            <div className="relative hidden md:flex md:col-span-5 flex-col justify-between p-10 bg-gradient-to-b from-indigo-950/20 via-gaming-card to-black/80 border-r border-gaming-border/80 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gaming-blue/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-10 bottom-10 w-40 h-40 bg-gaming-pink/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gaming-blue to-purple-600 flex items-center justify-center text-black font-mono font-black italic shadow-[0_0_20px_rgba(0,229,255,0.4)]">
                  GZ
                </div>
                <div>
                  <span className="font-display font-black tracking-widest text-lg text-white block leading-none">GAMERZONE</span>
                  <span className="text-[9px] text-gaming-blue font-bold uppercase tracking-widest block mt-1">Tournament Nexus</span>
                </div>
              </div>

              {/* Dynamic feature screen panel */}
              <div className="space-y-6 my-auto relative z-10 py-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gaming-pink/10 border border-gaming-pink/20 text-gaming-pink text-xs font-bold font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-gaming-pink animate-ping" />
                  LIVE TOURNAMENTS
                </span>
                
                <div className="space-y-3">
                  <h1 className="text-3xl lg:text-4xl font-display font-black tracking-tight text-white uppercase leading-none">
                    PLAY & WIN<br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-gaming-blue via-violet-400 to-gaming-neon">REAL PRIZES</span>
                  </h1>
                  <p className="text-gray-400 text-xs leading-relaxed font-sans max-w-sm">
                    Enter premium competitive mobile battlegrounds, climb live community leaderboards, secure automated fast withdrawals, and connect with peers instantly.
                  </p>
                </div>

                {/* Game tags */}
                <div className="space-y-2 pt-2">
                  <div className="text-[9px] text-gray-500 font-bold uppercase font-mono tracking-widest">SUPPORTED TITLE ARENAS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["BGMI", "FREE FIRE", "VALORANT", "CODM"].map((game, i) => (
                      <span key={i} className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 border border-gaming-border/60 text-gray-300">
                        ⚡ {game}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Micro Stats Widget */}
                <div className="grid grid-cols-2 gap-3.5 pt-4">
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-gaming-border/50 backdrop-blur-md shadow-inner">
                    <div className="text-[10px] text-gray-500 font-bold uppercase font-mono tracking-wider">ACTIVE ARENAS</div>
                    <div className="text-lg font-black text-white font-mono mt-0.5">24/7 LIVE</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-gaming-border/50 backdrop-blur-md shadow-inner">
                    <div className="text-[10px] text-gray-500 font-bold uppercase font-mono tracking-wider">FAST SECURE</div>
                    <div className="text-lg font-black text-gaming-neon font-mono mt-0.5">COIN PAYOUTS</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gaming-border/40 pt-4 text-[10px] text-gray-500 font-mono flex items-center justify-between relative z-10">
                <span>© 2026 GamerZone Arena</span>
                <span className="text-gaming-blue font-bold tracking-widest">SECURE v2.5</span>
              </div>
            </div>

            {/* Form sheet right - Span 7 cols */}
            <div className="p-8 sm:p-12 md:col-span-7 flex flex-col justify-center bg-black/30 backdrop-blur-md">
              
              {/* Portal Selector tabs */}
              <div className="grid grid-cols-2 bg-black/50 p-1.5 rounded-2xl border border-gaming-border/80 mb-6 max-w-md mx-auto w-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminMode(false);
                    setIsSignup(false);
                    setAuthError("");
                  }}
                  className={`py-2 px-4 text-center rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    !isAdminMode 
                      ? "bg-gradient-to-r from-gaming-blue to-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.3)]" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  🎮 GAMER PORTAL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminMode(true);
                    setIsSignup(false);
                    setAuthError("");
                    setEmail("vkoushal600@gmail.com"); // Prepopulate admin test email
                    setPassword("");
                  }}
                  className={`py-2 px-4 text-center rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    isAdminMode 
                      ? "bg-gradient-to-r from-gaming-pink to-rose-600 text-white shadow-[0_0_15px_rgba(255,0,127,0.3)]" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  🛡️ ORGANIZER GATE
                </button>
              </div>

              <div className="mb-6 text-center max-w-md mx-auto w-full">
                <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase">
                  {isAdminMode 
                    ? "Organizer Dashboard" 
                    : isSignup 
                    ? "Create Gaming Account" 
                    : "Access Tournament Hub"}
                </h2>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  {isAdminMode
                    ? "Log in as an administrator to organize tournaments and authorize deposits."
                    : isSignup 
                    ? "Fill in details below to unlock free registration rewards!" 
                    : "Sign in to play in current esports brackets and match chat."}
                </p>
              </div>

              {authError && (
                <div className="max-w-md mx-auto w-full bg-gaming-pink/10 border border-gaming-pink/30 text-gaming-pink p-3.5 rounded-2xl text-xs font-semibold mb-5 text-center animate-shake">
                  ⚠️ {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4 max-w-md mx-auto w-full">
                {isSignup && !isAdminMode && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Gamer ID (Username) *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        placeholder="e.g. Slayer_99"
                        className="w-full bg-black/35 border border-gaming-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gaming-blue focus:ring-1 focus:ring-gaming-blue/30 transition-all duration-200"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                    {isAdminMode ? "Admin Email Address *" : "Email Address *"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isAdminMode ? "e.g. vkoushal600@gmail.com" : "e.g. champion@gmail.com"}
                      className="w-full bg-black/35 border border-gaming-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gaming-blue focus:ring-1 focus:ring-gaming-blue/30 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                    {isAdminMode ? "Admin Password/Passcode *" : "Password *"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isAdminMode ? "Enter admin secret passcode" : "Enter password min 6 chars"}
                      className="w-full bg-black/35 border border-gaming-border rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gaming-blue focus:ring-1 focus:ring-gaming-blue/30 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className={`w-full py-3 rounded-xl text-xs font-black font-display uppercase tracking-widest transition-all duration-300 active:scale-[0.98] shadow-lg cursor-pointer ${
                    isAdminMode 
                      ? "bg-gradient-to-r from-gaming-pink to-rose-600 text-white hover:opacity-95 shadow-gaming-pink/15" 
                      : "bg-gradient-to-r from-gaming-blue to-cyan-400 text-black hover:opacity-95 shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                  }`}
                >
                  {authLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-current" /> ESTABLISHING CONNECTIVITY...
                    </div>
                  ) : (
                    <>{isAdminMode ? "AUTHENTICATE AS ADMIN" : isSignup ? "CREATE PROFILE & PLAY" : "LOGIN TO ARENA"}</>
                  )}
                </button>
              </form>

              {/* Instant Guest bypass */}
              <div className="relative my-6 text-center max-w-md mx-auto w-full">
                <span className="absolute inset-x-0 top-2.5 h-px bg-gaming-border/60" />
                <span className="relative z-10 px-3 bg-[#0d121f] text-[10px] text-gray-400 font-mono tracking-wider uppercase">OR PLAY INSTANTLY</span>
              </div>

              <div className="max-w-md mx-auto w-full">
                {isAdminMode ? (
                  <button
                    type="button"
                    onClick={handleInstantAdminDemo}
                    id="btn_instance_admin"
                    className="w-full py-2.5 rounded-xl border border-gaming-pink/30 text-gaming-pink hover:bg-gaming-pink/5 text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 ease-out hover:scale-[1.01] active:scale-[0.98] hover:border-gaming-pink hover:shadow-[0_0_15px_rgba(255,0,127,0.25)] cursor-pointer"
                  >
                    ⚡ 1-CLICK INSTANT ORGANIZER ACCESS
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleInstantGuestDemo}
                    id="btn_instance_guest"
                    className="w-full py-2.5 rounded-xl border border-gaming-blue/30 text-gaming-blue hover:bg-gaming-blue/5 text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 ease-out hover:scale-[1.01] active:scale-[0.98] hover:border-gaming-blue hover:shadow-[0_0_15px_rgba(0,229,255,0.25)] cursor-pointer"
                  >
                    ⚡ 1-CLICK INSTANT DEMO GUEST ENGINE
                  </button>
                )}
              </div>

              <p className="text-gray-450 text-[11px] text-center mt-6 max-w-md mx-auto w-full">
                {isAdminMode ? (
                  <span className="text-gray-500 font-mono text-[9px] uppercase tracking-widest">
                    Developer bypass gate enabled
                  </span>
                ) : (
                  <>
                    {isSignup ? "Already registered? " : "New challenger in the arena? "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignup(!isSignup);
                        setAuthError("");
                      }}
                      className="text-gaming-blue hover:underline font-bold font-display cursor-pointer"
                    >
                      {isSignup ? "Sign In Here" : "Create Account Here"}
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (!userProfile) ? (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-gaming-blue" />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">LOADING GAMER SECURE PROFILE...</span>
        </div>
      ) : (
        
        /* LOGGED IN APPLICATION INTERFACE */
        <div className="relative min-h-screen bg-[#07090e] text-white">
          {/* Ambient decorative glowing spots */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b05_1px,transparent_1px),linear-gradient(to_bottom,#1e293b05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          <div className="absolute top-1/4 left-10 w-72 h-72 bg-gaming-blue/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/3 right-10 w-80 h-80 bg-gaming-pink/5 rounded-full blur-[110px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
            
            {/* TOP HEAD PANEL / NAVBAR */}
            <header className={`rounded-2xl border p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-500 ease-in-out backdrop-blur-md ${
              isDarkMode 
                ? "bg-[#12161F]/90 border-gaming-border/85 shadow-[0_4px_30px_rgba(0,0,0,0.4)]" 
                : "bg-white/95 border-slate-200"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded bg-gradient-to-br from-gaming-blue to-violet-600 flex items-center justify-center text-white font-mono font-black italic shadow-[0_0_15px_rgba(99,102,241,0.35)]">
                    GZ
                  </div>
                  <div>
                    <h1 className="text-xl font-display font-black tracking-tight text-white leading-none uppercase italic">
                      GAMER<span className="bg-clip-text text-transparent bg-gradient-to-r from-gaming-blue to-gaming-neon font-black">ZONE</span>
                    </h1>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mt-1">Live Match Arena</span>
                  </div>
                </div>
                
                {/* Toggle theme layout inside mobile */}
                <div className="flex items-center gap-2 md:hidden">
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)} 
                    className="p-1 px-1.5 bg-gaming-border rounded text-gray-400"
                  >
                    {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* NAVBAR CENTER: TABS CONTROLLER */}
              <nav className="flex flex-wrap gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-gaming-border/80 max-w-max">
                <button
                  onClick={() => setActiveSection("tournaments")}
                  className={`py-2 px-3.5 rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    activeSection === "tournaments"
                      ? "bg-gradient-to-r from-gaming-blue to-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] scale-[1.02] border border-gaming-blue/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  🏆 EVENTS
                </button>

                <button
                  onClick={() => setActiveSection("leaderboard")}
                  className={`py-2 px-3.5 rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    activeSection === "leaderboard"
                      ? "bg-gradient-to-r from-gaming-blue to-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] scale-[1.02] border border-gaming-blue/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  🔥 LEADERBOARD
                </button>

                <button
                  onClick={() => setActiveSection("alerts")}
                  className={`py-2 px-3.5 rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 relative cursor-pointer ${
                    activeSection === "alerts"
                      ? "bg-gradient-to-r from-gaming-blue to-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] scale-[1.02] border border-gaming-blue/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  🔔 ALERTS
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-0.5 h-2 w-2 rounded-full bg-gaming-pink animate-ping" />
                  )}
                </button>

                <button
                  onClick={() => setActiveSection("dashboard")}
                  className={`py-2 px-3.5 rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    activeSection === "dashboard"
                      ? "bg-gradient-to-r from-gaming-blue to-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] scale-[1.02] border border-gaming-blue/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  👤 MY PROFILE
                </button>

                <button
                  onClick={() => setActiveSection("help")}
                  className={`py-2 px-3.5 rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    activeSection === "help"
                      ? "bg-gradient-to-r from-gaming-blue to-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] scale-[1.02] border border-gaming-blue/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  ❓ HELP
                </button>

                {userProfile?.role === "admin" && (
                  <button
                    onClick={() => setActiveSection("admin")}
                    className={`py-2 px-3.5 rounded-xl text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider transition-all duration-300 border border-gaming-pink/40 text-gaming-pink hover:bg-gaming-pink/10 cursor-pointer ${
                      activeSection === "admin"
                        ? "bg-gradient-to-r from-gaming-pink to-rose-600 text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)] scale-[1.02] border-none"
                        : ""
                    }`}
                  >
                    🛡️ ADMIN PANEL
                  </button>
                )}
              </nav>

              {/* NAVIGATION RIGHT: WALLET METRIC + USER */}
              <div className="flex items-center justify-between sm:justify-end gap-3 border-t md:border-t-0 border-gaming-border/50 pt-2.5 md:pt-0">
                <div className="hidden sm:flex items-center space-x-2 border-r border-[#1e293b] pr-4 h-8">
                  <div className="w-2 h-2 bg-gaming-neon rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-mono text-slate-400">DISCORD ACTIVE</span>
                </div>

                <motion.div 
                  animate={isWalletIncreasing ? {
                    scale: [1, 1.12, 1],
                    borderColor: ["#1e293b", "#22c55e", "#1e293b"],
                    backgroundColor: ["#0F1219", "rgba(34, 197, 94, 0.15)", "#0F1219"],
                    boxShadow: ["0px 0px 0px rgba(34, 197, 94, 0)", "0px 0px 12px rgba(34, 197, 94, 0.35)", "0px 0px 0px rgba(34, 197, 94, 0)"]
                  } : {}}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="flex items-center gap-1 bg-[#0F1219] p-1 py-1.5 px-3 rounded border border-gaming-border"
              >
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mr-1">COINS:</span>
                <motion.span 
                  animate={isWalletIncreasing ? {
                    color: ["#22c55e", "#4ade80", "#22c55e"],
                    scale: [1, 1.05, 1]
                  } : {}}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="text-xs font-mono font-black text-gaming-neon"
                >
                  🪙 {userProfile?.walletBalance || 0}
                </motion.span>
              </motion.div>

              {/* Desktop Theme Toggle */}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="hidden md:flex p-1.5 border border-gaming-border rounded text-gray-400 hover:text-white hover:bg-gaming-border/20 transition cursor-pointer"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-400" />}
              </button>

              <div className="flex items-center gap-2">
                <img
                  src={userProfile?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile?.username || "Gamer"}`}
                  alt="Avatar"
                  className="h-8 w-8 bg-gaming-border border border-gaming-border rounded object-cover"
                />
                
                <button
                  onClick={handleLogout}
                  title="Sign Out esports account"
                  className="p-1 px-2 border border-gaming-border rounded text-gray-400 hover:text-gaming-pink hover:bg-gaming-pink/10 transition flex items-center gap-1 text-[10px] font-bold"
                >
                  <LogOut className="h-3.5 w-3.5" /> LOGOUT
                </button>
              </div>
            </div>
          </header>

          {/* MASTER SECTION ROUTER PANEL */}
          <main className="min-h-[50vh]">
            {loadingDb ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-gaming-blue" />
                <span className="text-xs font-mono text-gray-400">CONNECTING TO LOBBY FIREBASE SERVERS...</span>
              </div>
            ) : (
              <>
                {/* 1. TOURNAMENTS CATEGORY VIEW */}
                {activeSection === "tournaments" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    {/* Landing Banner */}
                    <LandingHero 
                      liveTournamentsCount={tournaments.filter(t => t.status === "live").length}
                      upcomingCount={tournaments.filter(t => t.status === "upcoming").length}
                      completedCount={tournaments.filter(t => t.status === "completed").length}
                      onClickJoin={() => {
                        const targetElement = document.getElementById("tournament_grid");
                        if (targetElement) {
                          targetElement.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    />

                    {/* Filter and Content section */}
                    <div id="tournament_grid" className="pt-2">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="text-lg font-display font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                            <Gamepad2 className="h-5 w-5 text-gaming-blue animate-pulse" /> TOURNAMENTS ROSTER LIST
                          </h2>
                          <p className="text-xs text-gray-400">Select an esports tournament, review prize formats, and register instantly</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                          {/* Search Input Box */}
                          <div className="w-full sm:w-72 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Search className="h-4 w-4 text-gray-500" />
                            </div>
                            <input
                              type="text"
                              value={tournamentSearchQuery}
                              onChange={(e) => setTournamentSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  addRecentSearch(tournamentSearchQuery);
                                }
                              }}
                              onBlur={() => {
                                addRecentSearch(tournamentSearchQuery);
                              }}
                              placeholder="Filter by game, match type (solo/squad)..."
                              className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:ring-1 transition-all ${
                                isDarkMode
                                  ? "bg-[#0B0F17] border border-gaming-border focus:border-gaming-blue/60 focus:ring-gaming-blue/30 text-white placeholder-gray-500"
                                  : "bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-blue-150 text-slate-800 placeholder-slate-400"
                              }`}
                            />
                            {tournamentSearchQuery && (
                              <button
                                onClick={() => setTournamentSearchQuery("")}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Sort By Dropdown */}
                          <div className="relative w-full sm:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                              <ArrowUpDown className="h-3.5 w-3.5" />
                            </div>
                            <select
                              id="select_tournament_sort"
                              value={tournamentSortBy}
                              onChange={(e: any) => setTournamentSortBy(e.target.value)}
                              className={`w-full sm:w-48 pl-10 pr-8 py-2.5 rounded-xl text-[11px] font-mono font-bold uppercase focus:outline-none focus:ring-1 appearance-none cursor-pointer transition-all ${
                                isDarkMode
                                  ? "bg-[#0B0F17] border border-gaming-border focus:border-gaming-blue/60 focus:ring-gaming-blue/30 text-white"
                                  : "bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-blue-150 text-slate-800"
                              }`}
                            >
                              <option value="startDate" className={isDarkMode ? "bg-[#0b0f17] text-white" : "bg-white text-slate-800"}>📅 Start Date</option>
                              <option value="prizePool" className={isDarkMode ? "bg-[#0b0f17] text-white" : "bg-white text-slate-800"}>💰 Prize Pool</option>
                              <option value="slotsAvailable" className={isDarkMode ? "bg-[#0b0f17] text-white" : "bg-white text-slate-800"}>🔥 Slots Available</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                              </svg>
                            </div>
                          </div>

                          {/* List - Calendar Toggle */}
                          <div className={`p-1 rounded-xl border flex items-center gap-1 w-full sm:w-auto ${
                            isDarkMode ? "bg-[#0B0F17]/80 border-gaming-border" : "bg-slate-50 border-slate-200"
                          }`}>
                            <button
                              onClick={() => setTournamentViewMode("list")}
                              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer ${
                                tournamentViewMode === "list"
                                  ? "bg-gaming-blue text-white shadow-md shadow-gaming-blue/20"
                                  : "text-gray-400 hover:text-white"
                              }`}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" /> List View
                            </button>
                            <button
                              onClick={() => setTournamentViewMode("calendar")}
                              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer ${
                                tournamentViewMode === "calendar"
                                  ? "bg-gaming-blue text-white shadow-md shadow-gaming-blue/20"
                                  : "text-gray-400 hover:text-white"
                              }`}
                            >
                              <Calendar className="h-3.5 w-3.5" /> Calendar View
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Real-time search quick filters & Recent Searches */}
                      <div className="flex flex-col gap-3 mb-6">
                        {recentSearches.length > 0 && (
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <History className="h-3 w-3 text-gaming-neon" /> Recent Searches:
                            </span>
                            {recentSearches.map((search, idx) => {
                              const isCurrent = tournamentSearchQuery.toLowerCase() === search.toLowerCase();
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                                    isCurrent
                                      ? "bg-gaming-neon/20 text-gaming-neon border-gaming-neon/40 font-bold"
                                      : isDarkMode
                                      ? "bg-[#0B0F17] text-gray-400 border-gaming-border hover:bg-white/5 hover:text-white"
                                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                                  }`}
                                  onClick={() => {
                                    setTournamentSearchQuery(search);
                                    addRecentSearch(search);
                                  }}
                                >
                                  <span>{search}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeRecentSearch(search);
                                    }}
                                    className="text-gray-500 hover:text-gaming-pink transition-colors text-[9px] font-bold cursor-pointer"
                                    title="Remove this search"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={clearAllRecentSearches}
                              className="text-[9px] text-gray-500 hover:text-gaming-pink transition-colors underline font-mono cursor-pointer ml-1 uppercase"
                            >
                              Clear All
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <SlidersHorizontal className="h-3 w-3" /> Quick Terms:
                          </span>
                          {["BGMI", "Valorant", "COD Mobile", "Solo", "Squad", "5v5"].map((tag) => {
                            const isActive = tournamentSearchQuery.toLowerCase() === tag.toLowerCase();
                            return (
                              <button
                                key={tag}
                                onClick={() => {
                                  const newTag = isActive ? "" : tag;
                                  setTournamentSearchQuery(newTag);
                                  if (newTag) {
                                    addRecentSearch(newTag);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer border ${
                                  isActive
                                    ? "bg-gaming-blue/20 text-gaming-blue border-gaming-blue/40 font-bold"
                                    : isDarkMode
                                    ? "bg-[#0B0F17] text-gray-400 border-gaming-border hover:bg-white/5 hover:text-white"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                          {tournamentSearchQuery && (
                            <button
                              onClick={() => setTournamentSearchQuery("")}
                              className="text-[10px] text-gaming-pink hover:underline font-bold cursor-pointer uppercase tracking-wider ml-1"
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                      </div>

                      {(() => {
                        const filteredTournaments = tournaments.filter((evt) => {
                          if (!tournamentSearchQuery) return true;
                          const query = tournamentSearchQuery.toLowerCase().trim();
                          const idMatches = evt.id && evt.id.toLowerCase() === query;
                          const gameNameMatches = evt.game && evt.game.toLowerCase().includes(query);
                          const titleMatches = evt.title && evt.title.toLowerCase().includes(query);
                          const descMatches = evt.description && evt.description.toLowerCase().includes(query);
                          const rulesMatches = evt.rules && evt.rules.toLowerCase().includes(query);
                          return idMatches || gameNameMatches || titleMatches || descMatches || rulesMatches;
                        });

                        // Apply sorting
                        filteredTournaments.sort((a, b) => {
                          if (tournamentSortBy === "prizePool") {
                            return (b.prizePool || 0) - (a.prizePool || 0); // Highest prize first
                          } else if (tournamentSortBy === "slotsAvailable") {
                            const slotsA = (a.maxParticipants || 0) - (a.slotsFilled || 0);
                            const slotsB = (b.maxParticipants || 0) - (b.slotsFilled || 0);
                            return slotsB - slotsA; // Most slots available first
                          } else {
                            // "startDate" soonest start date first
                            const dateA = new Date(a.date).getTime() || 0;
                            const dateB = new Date(b.date).getTime() || 0;
                            return dateA - dateB;
                          }
                        });

                        if (tournamentViewMode === "calendar") {
                          return (
                            <TournamentCalendar
                              events={filteredTournaments}
                              registrations={registrations}
                              userProfile={userProfile}
                              onRegister={(selected) => {
                                setActiveRegEvent(selected);
                              }}
                              onOpenChat={(selected) => {
                                setActiveChatEvent(selected);
                              }}
                              isDarkMode={isDarkMode}
                            />
                          );
                        }

                        if (filteredTournaments.length === 0) {
                          return (
                            <div className={`p-8 text-center rounded-2xl border ${
                              isDarkMode 
                                ? "bg-[#0B0F17]/40 border-gaming-border/60 text-gray-405" 
                                : "bg-slate-50/50 border-slate-200 text-slate-500"
                            }`}>
                              <Gamepad2 className="h-10 w-10 mx-auto text-gray-500 mb-3 animate-pulse" />
                              <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                                No tournaments match "{tournamentSearchQuery}"
                              </p>
                              <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                                Try refining your word query or use one of our Quick Terms above to find matching matches.
                              </p>
                              <button
                                onClick={() => setTournamentSearchQuery("")}
                                className="mt-4 px-4 py-2 bg-gaming-blue hover:bg-gaming-blue/80 text-white font-mono text-[10px] font-bold uppercase rounded-lg tracking-wider transition cursor-pointer"
                              >
                                Reset filters
                              </button>
                            </div>
                          );
                        }

                        const isSharedInviteActive = tournaments.some(t => t.id === tournamentSearchQuery);

                        return (
                          <div className="space-y-6">
                            {isSharedInviteActive && (
                              <div className="bg-gradient-to-r from-gaming-blue/20 via-gaming-neon/5 to-gaming-blue/10 border border-gaming-blue/35 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-gaming-neon/10 border border-gaming-neon/20 shrink-0 text-gaming-neon animate-pulse">
                                    <Sparkles className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                                      🎯 Received Shared Tournament Invitation
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      You followed an invitation link to play. Register now or reset filters to browse other events!
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setTournamentSearchQuery("")}
                                  className="px-3.5 py-1.5 bg-[#0B0F17] hover:bg-gaming-pink/15 text-gray-400 hover:text-gaming-pink font-mono text-[10px] font-bold uppercase rounded-lg tracking-wider transition border border-gaming-border hover:border-gaming-pink/30 cursor-pointer"
                                >
                                  Clear Filter & Explore All
                                </button>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {filteredTournaments.map((evt) => {
                                const matchingReg = registrations.find((r) => r.eventId === evt.id);
                                return (
                                  <TournamentCard
                                    key={evt.id}
                                    event={evt}
                                    username={matchingReg?.username || userProfile?.username || "Gamer"}
                                    isJoined={!!matchingReg}
                                    rankAchieved={matchingReg?.rankAchieved}
                                    winnings={matchingReg?.winnings}
                                    registeredParticipants={allRegistrations.filter((r) => r.eventId === evt.id)}
                                    onRegister={(selected) => {
                                      setActiveRegEvent(selected);
                                    }}
                                    onOpenChat={(selected) => {
                                      setActiveChatEvent(selected);
                                    }}
                                    isSelected={selectedBulkEvents.some((t) => t.id === evt.id)}
                                    onSelectToggle={(selected) => {
                                      setSelectedBulkEvents((prev) => {
                                        const isAlreadySelected = prev.some((t) => t.id === selected.id);
                                        if (isAlreadySelected) {
                                          return prev.filter((t) => t.id !== selected.id);
                                        } else {
                                          return [...prev, selected];
                                        }
                                      });
                                    }}
                                  />
                                );
                              })}
                            </div>

                            {selectedBulkEvents.length > 0 && (
                              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in slide-in-from-bottom duration-300">
                                <div className="bg-[#0D111A]/95 backdrop-blur-md border border-gaming-blue/50 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,180,216,0.25)]">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gaming-blue/10 border border-gaming-blue/30 flex items-center justify-center text-gaming-blue animate-pulse">
                                      <Trophy className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono text-left">
                                        {selectedBulkEvents.length} Tournament{selectedBulkEvents.length > 1 ? "s" : ""} Selected
                                      </h4>
                                      <p className="text-[10px] text-gray-400 font-mono text-left">
                                        Total Fees: <span className="text-gaming-neon font-bold">🪙 {selectedBulkEvents.reduce((sum, e) => sum + (e.fee || 0), 0)} Coins</span>
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setSelectedBulkEvents([])}
                                      className="px-3 py-2 text-gray-400 hover:text-white font-mono text-[10px] font-bold uppercase rounded-xl tracking-wider transition hover:bg-slate-800/60 cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                    <button
                                      onClick={() => setIsBulkRegModalOpen(true)}
                                      className="px-5 py-2.5 bg-gaming-neon text-black font-display text-xs font-extrabold uppercase italic rounded-xl tracking-wide transition transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,225,217,0.4)] hover:shadow-[0_0_22px_rgba(0,229,217,0.6)] cursor-pointer"
                                    >
                                      Register Selected 🚀
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {/* 2. LEADERBOARD DISPLAY */}
                {activeSection === "leaderboard" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <LeaderboardTable 
                      ranks={leaderboard} 
                      currentUserId={userProfile?.uid}
                    />
                  </motion.div>
                )}

                {/* 3. ALERTS & WEBHOOK SECTION */}
                {activeSection === "alerts" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    <div className="lg:col-span-7">
                      <InAppAlerts 
                        notifications={notifications}
                        onMarkRead={markNotificationRead}
                        onClearAll={clearAllNotifications}
                        onSimulateReminder={handleSimulate15mReminder}
                      />
                    </div>
                    <div className="lg:col-span-5">
                      <DiscordWebhooks 
                        userWebhookUrl={userProfile?.discordWebhook || ""}
                        onSaveWebhook={handleSaveDiscordWebhook}
                      />
                    </div>
                  </motion.div>
                )}

                {/* 4. PLAYER DASHBOARD */}
                {activeSection === "dashboard" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <UserDashboard 
                      user={userProfile}
                      registrations={registrations}
                      tournaments={tournaments}
                      withdrawals={withdrawals}
                      leaderboard={leaderboard}
                      isDarkMode={isDarkMode}
                      setIsDarkMode={setIsDarkMode}
                      isAutoTheme={isAutoTheme}
                      setIsAutoTheme={setIsAutoTheme}
                      sunsetHour={sunsetHour}
                      setSunsetHour={setSunsetHour}
                      sunriseHour={sunriseHour}
                      setSunriseHour={setSunriseHour}
                      simulatedHour={simulatedHour}
                      setSimulatedHour={setSimulatedHour}
                      isSoundMuted={isSoundMuted}
                      setIsSoundMuted={setIsSoundMuted}
                      onRefreshWithdrawals={async () => {
                        if (userProfile) {
                          const updatedPays = await dbFetchWithdrawals(userProfile.uid);
                          setWithdrawals(updatedPays);
                        }
                      }}
                      onRefreshProfile={async () => {
                        if (userProfile) {
                          const refreshed = await dbGetUserProfile(userProfile.uid);
                          if (refreshed) {
                            setUserProfile(refreshed);
                          }
                        }
                      }}
                    />
                  </motion.div>
                )}

                {/* 5. ORGANIZER ADMIN CONSOLE */}
                {activeSection === "admin" && userProfile?.role === "admin" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <AdminConsole 
                      events={tournaments}
                      withdrawalRequests={withdrawals}
                      discordWebhook={userProfile?.discordWebhook || ""}
                      onRefreshEvents={async () => {
                        const updatedTournaments = await dbFetchEvents();
                        setTournaments(updatedTournaments);
                      }}
                      onRefreshWithdrawals={async () => {
                        // Fetch all withdrawals for admin
                        const allClaims = await dbFetchWithdrawals();
                        setWithdrawals(allClaims);
                      }}
                    />
                  </motion.div>
                )}

                {/* 6. HELP FAQ SECTION */}
                {activeSection === "help" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <FAQSection />
                  </motion.div>
                )}
              </>
            )}
          </main>

          {/* SITE FOOTER */}
          <footer className="border-t border-gaming-border/60 pt-6 mt-12 text-center space-y-3 pb-8">
            <p className="text-xs text-gray-500 font-mono">
              ⚡ GamerZone platform uses cryptographical PCI-DSS secure sandbox checking.
            </p>
            <div className="flex justify-center gap-6 text-[10px] text-gray-500 font-mono uppercase">
              <span>SUPPORT: vkoushal600@gmail.com</span>
              <span>•</span>
              <span>SYSTEM: LATEST UTC v2.4</span>
            </div>
          </footer>

          {/* ACTIVE REGISTRATION OVERLAY SCREEN */}
          {activeRegEvent && (
            <RegistrationModal 
              event={activeRegEvent}
              user={userProfile}
              onClose={() => setActiveRegEvent(null)}
              onSuccess={handleRegSuccess}
              onUpdateWallet={handleUpdateWalletState}
            />
          )}

          {/* ACTIVE BULK REGISTRATION OVERLAY SCREEN */}
          {isBulkRegModalOpen && (
            <BulkRegistrationModal 
              events={selectedBulkEvents}
              user={userProfile}
              onClose={() => setIsBulkRegModalOpen(false)}
              onSuccess={handleBulkRegSuccess}
              onUpdateWallet={handleUpdateWalletState}
            />
          )}

          {/* ACTIVE MATCH CHAT OVERLAY SCREEN */}
          {activeChatEvent && (
            <MatchChat 
              event={activeChatEvent}
              user={userProfile}
              onClose={() => setActiveChatEvent(null)}
            />
          )}

          </div>
        </div>
      )}
    </div>
  );
}
