import React from "react";
import { TournamentEvent, EventRegistration } from "../types";
import { Calendar, Users, Trophy, DollarSign, ArrowRight, Zap, Skull, Coins, TrendingUp, X, FileText, ShieldAlert, Share2, Check, Tv, Eye, Volume2, VolumeX, Radio, Wifi, Gamepad2, Map, Clock, QrCode, Copy, ExternalLink } from "lucide-react";
import { dbUpdateEvent } from "../firebaseService";
import { motion } from "motion/react";

interface CardProps {
  key?: string;
  event: TournamentEvent;
  onRegister: (event: TournamentEvent) => void;
  isJoined: boolean;
  username: string;
  onOpenChat?: (event: TournamentEvent) => void;
  isSelected?: boolean;
  onSelectToggle?: (event: TournamentEvent) => void;
  rankAchieved?: string;
  winnings?: number;
  registeredParticipants?: EventRegistration[];
}

export default function TournamentCard({ 
  event, 
  onRegister, 
  isJoined, 
  username, 
  onOpenChat,
  isSelected = false,
  onSelectToggle,
  rankAchieved,
  winnings,
  registeredParticipants = []
}: CardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [showRulesModal, setShowRulesModal] = React.useState(false);
  const [rulesTab, setRulesTab] = React.useState<"requirements" | "regulations">("requirements");
  const [copied, setCopied] = React.useState(false);
  const [isTriggeringReg, setIsTriggeringReg] = React.useState(false);
  const [showBroadcastViewer, setShowBroadcastViewer] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [modalCopied, setModalCopied] = React.useState(false);

  const isNewTournament = React.useMemo(() => {
    if (event.createdAt) {
      try {
        const createdTime = new Date(event.createdAt).getTime();
        return (Date.now() - createdTime) < 48 * 60 * 60 * 1000;
      } catch {
        return false;
      }
    }
    return event.status === "upcoming" && event.slotsFilled < 15;
  }, [event.createdAt, event.status, event.slotsFilled]);

  // Social sharing & viral growth metrics state tracking
  const [sharesCount, setSharesCount] = React.useState(() => {
    if (event.shares !== undefined) return event.shares;
    const saved = localStorage.getItem(`tournament_shares_${event.id}`);
    if (saved) return parseInt(saved, 10);
    // Seed persistent yet realistic based on event ID
    return Math.floor(((event.id.charCodeAt(0) || 0) * 17 + (event.id.charCodeAt(1) || 0) * 3) % 45) + 8;
  });

  const [viewsCount, setViewsCount] = React.useState(() => {
    if (event.views !== undefined) return event.views;
    // Generate a higher view count based on shares
    const saved = localStorage.getItem(`tournament_views_${event.id}`);
    if (saved) return parseInt(saved, 10);
    const viewMultiplier = Math.floor(((event.id.charCodeAt(0) || 0) + (event.id.charCodeAt(1) || 0)) % 5) + 6;
    const seedShares = Math.floor(((event.id.charCodeAt(0) || 0) * 17 + (event.id.charCodeAt(1) || 0) * 3) % 45) + 8;
    return seedShares * viewMultiplier + Math.floor(Math.random() * 15) + 40;
  });

  // Sync real-time updates from parent event (Firestore listener)
  React.useEffect(() => {
    if (event.views !== undefined) {
      setViewsCount(event.views);
    }
  }, [event.views]);

  React.useEffect(() => {
    if (event.shares !== undefined) {
      setSharesCount(event.shares);
    }
  }, [event.shares]);

  // Handle unique visitor simulation for metrics
  React.useEffect(() => {
    const key = `tournament_views_${event.id}`;
    const hasViewedSession = sessionStorage.getItem(key);
    if (!hasViewedSession) {
      sessionStorage.setItem(key, "true");
      const nextViews = viewsCount + 1;
      setViewsCount(nextViews);
      localStorage.setItem(`tournament_views_${event.id}`, String(nextViews));
      try {
        dbUpdateEvent(event.id, { views: nextViews }).catch(() => {});
      } catch (_) {}
    }
  }, [event.id]);

  // Check if starting soon (within 30 minutes) or live
  const isStartingSoonOrLive = React.useMemo(() => {
    if (event.status === "live") return true;
    if (event.status !== "upcoming") return false;
    
    try {
      const matchTime = new Date(event.date).getTime();
      const now = new Date().getTime();
      const diffMinutes = (matchTime - now) / (1000 * 60);
      // Starting within 30 minutes, or slightly overdue (up to 120 mins) but still flagged as "upcoming"
      return diffMinutes >= -120 && diffMinutes <= 30;
    } catch {
      return false;
    }
  }, [event.date, event.status]);

  // Get dynamic player standing if they participated
  const getPlayerStanding = () => {
    if (!isJoined) return null;
    
    if (rankAchieved) {
      return {
        rank: rankAchieved,
        winnings: winnings !== undefined ? winnings : 0,
      };
    }
    
    // Fallback: Check if user matches winner name (case-insensitive)
    const userLower = (username || "You").toLowerCase();
    const winnersLower = (event.winners || "").toLowerCase();
    const isWinner = winnersLower && (
      winnersLower.includes(userLower) ||
      winnersLower.includes("you")
    );
    
    if (isWinner) {
      return {
        rank: "1st Place (Champion) 🏆",
        winnings: event.prizePool ? Math.floor(event.prizePool * 0.5) : 1000,
      };
    }
    
    // Otherwise, generate a stable deterministic rank based on username + event id
    const seed = (event.id + (username || "Player")).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const totalCompetitors = event.slotsFilled || event.maxParticipants || 16;
    
    // Generate a rank between 2 and totalCompetitors (cap at totalCompetitors, min 2)
    const rankNum = 2 + (seed % Math.max(1, totalCompetitors - 1));
    let suffix = "th";
    if (rankNum === 2) suffix = "nd";
    else if (rankNum === 3) suffix = "rd";
    
    let rankLabel = `${rankNum}${suffix} Place`;
    if (rankNum === 2) rankLabel += " 🥈";
    else if (rankNum === 3) rankLabel += " 🥉";
    
    return {
      rank: rankLabel,
      winnings: rankNum === 2 ? Math.floor((event.prizePool || 1000) * 0.25) : rankNum === 3 ? Math.floor((event.prizePool || 1000) * 0.15) : 0,
    };
  };

  const [myChatMessage, setMyChatMessage] = React.useState("");
  const [activeCam, setActiveCam] = React.useState("Directorial POV");
  const [isMuted, setIsMuted] = React.useState(true);
  const [streamQuality, setStreamQuality] = React.useState("1080p (Source)");
  const [liveChat, setLiveChat] = React.useState<{ id: number; author: string; text: string; time: string; badge?: string }[]>([
    { id: 1, author: "AlphaSniper99", text: "Match is starting, let's goooo!", time: "22:15", badge: "VIP" },
    { id: 2, author: "ChronoTrigger", text: "Who's winning this one?", time: "22:15", badge: "" },
    { id: 3, author: "NeonWraith", text: "This game is wild! 🔥", time: "22:16", badge: "MOD" },
    { id: 4, author: "GamerX", text: "insane draft picks!", time: "22:16" }
  ]);

  // Live streaming virtual chat updates
  React.useEffect(() => {
    if (!showBroadcastViewer) return;

    const names = ["AlphaSniper99", "ChronoTrigger", "NeonWraith", "FakerSpec", "GlitchLord", "PixelPanda", "ShadowReaper", "CyberPunk_X", "GamerGod_07", "LootGoblin", "QuantumDash", "ViperSpike", "ApexPredator", "Katarina_Main"];
    const quotes = [
      "OMG WHAT A PLAY! 🔥🔥",
      "LFG!!! absolute legend",
      "Is that a triple kill??? No way",
      "INSANE CLUTCH!",
      "sheesh that was clinical",
      "wp well played",
      "who will win the first prize of 🪙 " + (event.firstPrize || event.prizePool / 2).toLocaleString("en-IN") + " Coins??",
      "pure god tier mechanical skill",
      "unbelievable reflex",
      "POG!",
      "this series is so close",
      "my wallet is ready for the tournament buy-ins",
      "the tactics are flawless so far",
      "is that legal?? OMG!",
      "gg wp!"
    ];
    const badges = ["MVP", "MOD", "VIP", "SUBSCRIBER", ""];

    const interval = setInterval(() => {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      const randomBadge = badges[Math.floor(Math.random() * badges.length)];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      setLiveChat((prev) => [
        ...prev.slice(-40), // limit chat feed size
        {
          id: Date.now() + Math.random(),
          author: randomName,
          text: randomQuote,
          time: timeStr,
          badge: randomBadge
        }
      ]);
    }, 2200);

    return () => clearInterval(interval);
  }, [showBroadcastViewer, event]);

  // Handle user sending chat to spectator arena
  const handleSendStreamChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myChatMessage.trim()) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    setLiveChat((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        author: username || "Spectator",
        text: myChatMessage.trim(),
        time: timeStr,
        badge: "ME"
      }
    ]);
    setMyChatMessage("");
  };

  // Trigger brief scale-out and spin effect prior to opening registration modal
  const handleRegisterClick = () => {
    if (isTriggeringReg) return;
    setIsTriggeringReg(true);
    setTimeout(() => {
      onRegister(event);
      setIsTriggeringReg(false);
    }, 200);
  };

  // Clipboard copies or Web Shares individual match invites
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Increment share counter immediately on share click
    const nextShare = sharesCount + 1;
    localStorage.setItem(`tournament_shares_${event.id}`, String(nextShare));
    setSharesCount(nextShare);
    try {
      dbUpdateEvent(event.id, { shares: nextShare }).catch(() => {});
    } catch (_) {}
    
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}?tournament=${event.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setModalCopied(true);
      setTimeout(() => setModalCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy modal link", err);
    }
  };

  const handleNativeShare = async () => {
    const shareUrl = `${window.location.origin}?tournament=${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${event.title} - GamerZone Esports`,
          text: `Let's play in the "${event.title}" tournament for ${event.game}! Max prize pool is 🪙 ${event.prizePool.toLocaleString("en-IN")} Coins. Register now!`,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Web Share failed/dismissed", err);
      }
    }
  };

  // Dynamic Map Pool list based on the game name
  const getMapPool = (gameName: string, customMapPool?: string[]): string[] => {
    if (customMapPool && customMapPool.length > 0) return customMapPool;
    const g = gameName.toLowerCase();
    if (g.includes("valorant")) {
      return ["Bind", "Ascent", "Haven", "Split"];
    }
    if (g.includes("bgmi") || g.includes("pubg") || g.includes("battlegrounds")) {
      return ["Erangel", "Miramar", "Sanhok", "Vikendi"];
    }
    if (g.includes("free fire") || g.includes("freefire")) {
      return ["Bermuda", "Kalahari", "Purgatory", "Alpine"];
    }
    if (g.includes("cs") || g.includes("counter-strike") || g.includes("counterstrike")) {
      return ["Mirage", "Inferno", "Dust II", "Nuke"];
    }
    if (g.includes("cod") || g.includes("call of duty")) {
      return ["Nuketown", "Firing Range", "Standoff", "Crash"];
    }
    if (g.includes("apex")) {
      return ["Kings Canyon", "Worlds Edge", "Storm Point", "Olympus"];
    }
    if (g.includes("clash royale") || g.includes("clashroyale") || g.includes("clash of clans")) {
      return ["Legendary Arena", "Electro Valley", "Spell Valley", "Bone Pit"];
    }
    return ["Neo Arena", "Cyber District", "Sector-7 Base"];
  };

  // Get game visual helper
  const getGameVisual = (game: string) => {
    const gameLower = game.toLowerCase();
    if (gameLower.includes("bgmi") || gameLower.includes("battlegrounds")) {
      return {
        image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=500&auto=format&fit=crop",
        video: "https://assets.mixkit.co/videos/preview/mixkit-controller-held-by-gamer-playing-video-game-40175-large.mp4",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      };
    } else if (gameLower.includes("valorant")) {
      return {
        image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=500&auto=format&fit=crop",
        video: "https://assets.mixkit.co/videos/preview/mixkit-keyboard-with-neon-lights-during-esports-40179-large.mp4",
        badgeColor: "bg-gaming-pink/20 text-gaming-pink border border-gaming-pink/30"
      };
    } else if (gameLower.includes("free fire")) {
      return {
        image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=500&auto=format&fit=crop",
        video: "https://assets.mixkit.co/videos/preview/mixkit-gamer-playing-first-person-shooter-game-40172-large.mp4",
        badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30"
      };
    } else {
      return {
        image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=500&auto=format&fit=crop",
        video: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-gamer-playing-with-a-backlit-keyboard-40171-large.mp4",
        badgeColor: "bg-gaming-blue/20 text-gaming-blue border border-gaming-blue/30"
      };
    }
  };

  const visual = getGameVisual(event.game);
  const slotsPercent = Math.min((event.slotsFilled / event.maxParticipants) * 100, 100);
  const isFull = event.slotsFilled >= event.maxParticipants;

  // Retrieve or compute tiered prizes dynamically
  const firstPrizeVal = event.firstPrize ?? Math.round(event.prizePool * 0.60);
  const secondPrizeVal = event.secondPrize ?? Math.round(event.prizePool * 0.30);
  const thirdPrizeVal = event.thirdPrize ?? Math.round(event.prizePool * 0.10);

  // Format date readable
  const formatMatchDate = (isoString: string) => {
    try {
      const dateObj = new Date(isoString);
      return dateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  // Generate avatars for registered players based on the event context
  const getParticipantAvatars = () => {
    const avatars: { name: string; url: string; fallbackInitials: string; bg: string }[] = [];

    // 1. Add actual registered users
    if (registeredParticipants && registeredParticipants.length > 0) {
      const firstThree = [...registeredParticipants]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, 3);
      
      firstThree.forEach((reg) => {
        const seed = encodeURIComponent(reg.username);
        const styleSeed = seed.charCodeAt(0) % 5;
        const style = ["bottts", "avataaars", "pixel-art", "lorelei", "adventurer"][styleSeed];
        avatars.push({
          name: reg.username,
          url: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`,
          fallbackInitials: reg.username.substring(0, 2).toUpperCase(),
          bg: "from-gaming-blue to-[#0081A7]"
        });
      });
    }

    // 2. Pad with high-quality simulated participants if total is less than 3, but slotsFilled is greater
    const targetCount = Math.max(0, Math.min(3, event.slotsFilled));
    if (avatars.length < targetCount) {
      const defaultGamers = [
        { name: "Hydra_Soul", bg: "from-[#00E5FF] to-[#0081A7]" },
        { name: "ViperGG", bg: "from-[#8B5CF6] to-[#4C1D95]" },
        { name: "Mortal_OP", bg: "from-[#FF007F] to-[#99004C]" },
        { name: "Alpha_Sniper", bg: "from-[#FBBF24] to-[#B45309]" },
        { name: "Scout_Jr", bg: "from-[#10B981] to-[#064E3B]" },
        { name: "Nova_Queen", bg: "from-[#3B82F6] to-[#1D4ED8]" },
        { name: "GlitchLord", bg: "from-[#EC4899] to-[#9D174D]" },
        { name: "ShadowReaper", bg: "from-[#EF4444] to-[#7F1D1D]" },
      ];

      const seed = event.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
      let index = seed;

      while (avatars.length < targetCount) {
        const gamer = defaultGamers[index % defaultGamers.length];
        if (!avatars.some((a) => a.name === gamer.name)) {
          const styleSeed = gamer.name.charCodeAt(0) % 5;
          const style = ["bottts", "avataaars", "pixel-art", "lorelei", "adventurer"][styleSeed];
          avatars.push({
            name: gamer.name,
            url: `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(gamer.name)}`,
            fallbackInitials: gamer.name.substring(0, 2).toUpperCase(),
            bg: gamer.bg
          });
        }
        index++;
      }
    }

    return avatars.slice(0, 3);
  };

  return (
    <motion.div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{
        y: -6,
        scale: 1.025,
        rotateX: 2,
        rotateY: -2,
        borderColor: "rgba(0, 229, 255, 0.45)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.55), 0 0 30px rgba(0, 229, 255, 0.18)"
      }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className="group rounded-xl overflow-hidden border border-gaming-border bg-gaming-card flex flex-col h-full relative"
    >
      {/* Top Graphic Banner */}
      <div className="relative h-40 overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-t from-gaming-card to-transparent z-10 pointer-events-none" />
        
        {/* Cinematic Video Looping Player */}
        <video
          src={visual.video}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-0 ${
            isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100 pointer-events-none"
          }`}
          style={{ contentVisibility: "auto" }}
        />

        {/* Static Background Graphic Fallback */}
        <img
          src={visual.image}
          alt={event.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-80 ${
            isHovered ? "opacity-0 blur-sm pointer-events-none" : "opacity-80 group-hover:scale-105"
          }`}
        />
        
        {/* Bulk Select Checkbox Overlay */}
        {onSelectToggle && !isJoined && event.status !== "completed" && event.slotsFilled < event.maxParticipants && (
          <div 
            className="absolute top-3.5 right-3.5 z-30" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <label className="relative flex items-center justify-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectToggle(event)}
                className="sr-only peer"
              />
              <div className="h-7 w-7 rounded-lg bg-black/80 border-2 border-gaming-blue/60 peer-checked:border-gaming-neon peer-checked:bg-gaming-neon/20 flex items-center justify-center shadow-lg transition-all duration-200 hover:border-gaming-neon hover:scale-110 active:scale-95">
                <Check className="h-5 w-5 text-gaming-neon opacity-0 peer-checked:opacity-100 transition-opacity duration-150 stroke-[3]" />
              </div>
            </label>
          </div>
        )}

        {/* Cinematic Info Overlay Tag */}
        <span className={`absolute top-4 ${onSelectToggle && !isJoined && event.status !== "completed" && event.slotsFilled < event.maxParticipants ? "right-14" : "right-4"} z-20 text-[8px] font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-black/75 text-gaming-neon border border-gaming-neon/30 transition-all duration-300 ${
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
        }`}>
          🎬 CINEMATIC INTRO
        </span>

        {/* Play Status Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5">
          <span className={`text-[10px] uppercase font-bold font-mono tracking-widest px-2.5 py-0.5 rounded-full ${
            event.status === "live" 
              ? "bg-gaming-pink text-white animate-pulse" 
              : event.status === "completed"
              ? "bg-gray-700 text-gray-300"
              : "bg-gaming-blue text-white"
          }`}>
            {event.status === "live" ? "🔴 LIVE NOW" : event.status === "completed" ? "🏁 COMPLETED" : "📅 REGISTRATION"}
          </span>
          {event.status === "completed" && isJoined && (
            <span className="text-[9px] uppercase font-bold font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-gaming-neon/20 text-gaming-neon border border-gaming-neon/40 shadow-[0_0_10px_rgba(0,229,217,0.3)] animate-pulse flex items-center gap-1">
              📊 Result Published
            </span>
          )}
        </div>

        {/* Display Prize Pool & Potential Earnings Tooltip */}
        <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 bg-gaming-bg/90 backdrop-blur-md border border-gaming-border px-3 py-1.5 rounded-lg shadow-lg">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="font-mono text-xs font-bold text-white">🪙 {event.prizePool.toLocaleString("en-IN")} Coins</span>
          
          <div className="h-3 w-px bg-gaming-border/80 mx-0.5" />
          
          {/* Potential Earnings interactive tooltip */}
          <div className="relative group/tooltip flex items-center select-none" title="View Potential Earnings Breakdown">
            <TrendingUp className="h-3.5 w-3.5 text-gaming-neon cursor-help hover:text-white hover:scale-110 transition duration-150" />
            
            {/* Tooltip Card */}
            <div className="absolute bottom-full right-[-8px] mb-2.5 w-56 bg-[#0E1119] border border-gaming-blue/45 backdrop-blur-md p-3 rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.85)] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-auto">
              <div className="text-[10px] font-black text-gaming-neon uppercase font-mono tracking-wider mb-2 border-b border-gaming-border pb-1.5 flex items-center gap-1">
                <Coins className="h-3 w-3 text-gaming-neon" /> POTENTIAL EARNINGS INFO
              </div>
              
              <div className="space-y-1.5 text-[10px] font-sans text-gray-300">
                <div className="flex justify-between items-center bg-black/25 p-1 rounded">
                  <span className="text-gray-400">👑 1st (Champion):</span>
                  <span className="font-mono font-black text-white">🪙 {firstPrizeVal.toLocaleString("en-IN")} Coins</span>
                </div>
                <div className="flex justify-between items-center p-0.5">
                  <span className="text-gray-400">🥈 2nd (Runner-up):</span>
                  <span className="font-mono font-bold text-gray-200">🪙 {secondPrizeVal.toLocaleString("en-IN")} Coins</span>
                </div>
                <div className="flex justify-between items-center p-0.5 border-b border-gaming-border/40 pb-1.5">
                  <span className="text-gray-400">🥉 3rd (Finalist):</span>
                  <span className="font-mono font-bold text-gray-300">🪙 {thirdPrizeVal.toLocaleString("en-IN")} Coins</span>
                </div>
                
                <div className="pt-1 select-none space-y-1">
                  <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono">
                    <span>FEE INCOME POOL:</span>
                    <span className="text-gaming-blue font-bold">🪙 {(event.slotsFilled * event.fee).toLocaleString("en-IN")} Coins</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono">
                    <span>MAX INCOME POTENTIAL:</span>
                    <span className="text-gaming-neon font-bold">🪙 {(event.maxParticipants * event.fee).toLocaleString("en-IN")} Coins</span>
                  </div>
                </div>
              </div>

              {/* Decorative Glow point */}
              <div className="absolute top-full right-[10px] w-2.5 h-2.5 bg-[#0E1119] border-r border-b border-gaming-blue/45 rotate-45 transform -translate-y-1.5 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Box */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`inline-block text-[10px] font-bold font-mono tracking-wide px-2 py-0.5 rounded ${visual.badgeColor} truncate max-w-[100px] sm:max-w-[130px]`} title={event.game}>
                {event.game}
              </span>
              {event.status === "live" && (
                <span className="inline-flex items-center gap-1 bg-gaming-pink/20 text-gaming-pink border border-gaming-pink/40 text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded animate-pulse shrink-0">
                  <span className="h-1.5 w-1.5 bg-gaming-pink rounded-full grow-0" />
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                onClick={handleShare}
                className={`relative overflow-hidden text-[10px] font-mono font-bold transition-all px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer border ${
                  copied
                    ? "bg-green-500/20 text-green-400 border-green-500/30 font-semibold animate-pulse"
                    : isNewTournament
                    ? "bg-gaming-neon/15 text-gaming-neon border-gaming-neon/40 hover:border-gaming-neon/70 shadow-[0_0_10px_rgba(0,229,255,0.15)] font-extrabold"
                    : "bg-gaming-neon/10 hover:bg-gaming-neon/20 text-gaming-neon border-gaming-neon/20 hover:border-gaming-neon/40"
                }`}
                title="Share & Copy invite link"
                animate={isNewTournament && !copied ? {
                  boxShadow: [
                    "0 0 4px rgba(0, 229, 255, 0.15)",
                    "0 0 14px rgba(0, 229, 255, 0.5)",
                    "0 0 4px rgba(0, 229, 255, 0.15)"
                  ],
                  scale: [1, 1.04, 1]
                } : {}}
                transition={isNewTournament && !copied ? {
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}}
              >
                {/* Subtle diagonal sliding shimmer line */}
                {isNewTournament && !copied && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 z-10 pointer-events-none"
                    initial={{ left: "-100%" }}
                    animate={{ left: "150%" }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      repeatDelay: 2.5,
                      ease: "easeInOut"
                    }}
                  />
                )}
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> COPIED
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" /> SHARE
                    {isNewTournament && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gaming-neon opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gaming-neon"></span>
                      </span>
                    )}
                  </>
                )}
              </motion.button>
              <button
                onClick={() => setShowRulesModal(true)}
                className="text-[10px] font-mono font-bold text-gaming-blue hover:text-white transition-all bg-gaming-blue/10 hover:bg-gaming-blue/30 border border-gaming-blue/20 hover:border-gaming-blue/50 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                title="View Rules & Regulations"
              >
                <FileText className="h-3.5 w-3.5" /> RULES
              </button>
            </div>
          </div>
          <h3 className="text-base font-display font-bold text-white tracking-tight leading-snug group-hover:text-gaming-blue transition-colors uppercase">
            {event.title}
          </h3>
          <p className="text-gray-400 text-xs mt-2 line-clamp-2">
            {event.description}
          </p>

          {/* Map Pool prominent badge list */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 border border-[#161f33]/40 bg-[#0c0f17]/25 px-2.5 py-1.5 rounded-lg select-none">
            <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Map className="h-3.5 w-3.5 text-gaming-blue shrink-0 animate-pulse" /> MAPS:
            </span>
            {getMapPool(event.game, event.mapPool).map((mapName) => (
              <span 
                key={mapName}
                className="bg-gaming-blue/15 border border-gaming-blue/30 text-[#e0e7ff] hover:text-white rounded px-2 py-0.5 text-[9px] font-mono font-extrabold tracking-wider uppercase transition-colors"
              >
                {mapName}
              </span>
            ))}
          </div>

          {/* Social Viral Metrics */}
          <div className="flex items-center gap-3 mt-3 border border-gaming-border/30 bg-[#0c0f17]/30 px-3 py-1.5 rounded-lg font-mono text-[9.5px] text-gray-450 select-none">
            <span className="flex items-center gap-1.5 hover:text-white transition-colors" title="Total page/card views of this tournament lobby">
              <Eye className="h-3.5 w-3.5 text-gray-500 animate-pulse shrink-0" />
              <strong className="text-gray-200 font-bold">{viewsCount.toLocaleString()}</strong> <span className="text-gray-500">views</span>
            </span>
            <span className="h-3 w-px bg-gaming-border/50 shrink-0" />
            <span className="flex items-center gap-1.5 hover:text-white transition-colors" title="Times invite link was shared or copied">
              <Share2 className="h-3.5 w-3.5 text-gaming-neon/70 shrink-0" />
              <strong className="text-gray-200 font-bold">{sharesCount.toLocaleString()}</strong> <span className="text-gray-500">shares</span>
            </span>
            <span className="h-3 w-px bg-gaming-border/50 shrink-0" />
            <span className="text-[8.5px] font-extrabold tracking-widest text-[#00e1d9] bg-[#00e1d9]/5 px-2 py-0.5 rounded border border-[#00e1d9]/15 uppercase shrink-0 animate-pulse">
              ⚡ LIVE HYPED
            </span>
          </div>

          {/* Quick tournament parameters */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 my-4 border-t border-b border-gaming-border/50 py-3">
            <div className="flex items-center gap-1.5 text-gray-300 min-w-0">
              <Calendar className="h-3.5 w-3.5 text-gaming-blue shrink-0" />
              <div className="text-[10px] sm:text-xs min-w-0">
                <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider truncate">Starts At</div>
                <div className="font-mono font-medium truncate">{formatMatchDate(event.date)}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-gray-200 min-w-0 justify-center">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <div className="text-[10px] sm:text-xs min-w-0">
                <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider truncate">Duration</div>
                <div className="font-mono font-bold text-amber-400 truncate">{event.duration || "2h 30m"}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-gray-300 min-w-0 justify-end">
              <Users className="h-3.5 w-3.5 text-gaming-neon shrink-0" />
              <div className="text-[10px] sm:text-xs min-w-0 text-right">
                <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider truncate">Entry Fee</div>
                <div className="font-mono font-bold text-gaming-neon truncate">
                  {event.fee === 0 ? "FREE" : `🪙 ${event.fee} Coins`}
                </div>
              </div>
            </div>
          </div>

          {/* Elegant Tiered Breakdown & Prize Distribution panel */}
          <div className="bg-black/40 rounded-xl border border-gaming-border/60 p-3 mb-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gaming-border/30 pb-2">
              <div className="text-[9.5px] text-gray-300 uppercase font-bold font-mono tracking-wider flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-400" /> PRIZE DISTRIBUTION
              </div>
              <span className="text-[8.5px] font-mono text-gaming-neon bg-gaming-neon/5 border border-gaming-neon/15 px-1.5 py-0.5 rounded font-black">
                TOTAL: 🪙 {event.prizePool.toLocaleString("en-IN")} Coins
              </span>
            </div>

            {/* Visual multi-segmented distribution bar */}
            {(() => {
              const p1 = event.prizePool > 0 ? Math.round((firstPrizeVal / event.prizePool) * 100) : 60;
              const p2 = event.prizePool > 0 ? Math.round((secondPrizeVal / event.prizePool) * 100) : 30;
              const p3 = event.prizePool > 0 ? Math.round((thirdPrizeVal / event.prizePool) * 100) : 10;
              
              return (
                <div className="space-y-3">
                  <div className="h-2.5 rounded-full overflow-hidden flex bg-gray-900 border border-gaming-border/30 p-[1px]">
                    <div style={{ width: `${p1}%` }} className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-l-full" title={`1st: ${p1}%`} />
                    <div style={{ width: `${p2}%` }} className="bg-gradient-to-r from-slate-400 to-slate-200 h-full" title={`2nd: ${p2}%`} />
                    <div style={{ width: `${p3}%` }} className="bg-gradient-to-r from-amber-800 to-amber-600 h-full rounded-r-full" title={`3rd: ${p3}%`} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-amber-400/5 border border-amber-400/10 p-2 rounded-lg flex flex-col justify-center transition duration-200 hover:bg-amber-400/10">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[8px] font-black font-mono text-amber-400 uppercase tracking-wide">👑 1st</span>
                        <span className="text-[8px] font-bold font-mono text-amber-400/70">({p1}%)</span>
                      </div>
                      <span className="font-mono font-black text-white text-[11px] mt-1">🪙 {firstPrizeVal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="bg-slate-300/5 border border-slate-300/10 p-2 rounded-lg flex flex-col justify-center transition duration-200 hover:bg-slate-300/10">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[8px] font-black font-mono text-slate-300 uppercase tracking-wide">🥈 2nd</span>
                        <span className="text-[8px] font-bold font-mono text-slate-300/70">({p2}%)</span>
                      </div>
                      <span className="font-mono font-bold text-gray-100 text-[11px] mt-1">🪙 {secondPrizeVal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="bg-amber-700/5 border border-amber-700/10 p-2 rounded-lg flex flex-col justify-center transition duration-200 hover:bg-amber-700/10">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[8px] font-black font-mono text-amber-600 uppercase tracking-wide">🥉 3rd</span>
                        <span className="text-[8px] font-bold font-mono text-amber-600/70">({p3}%)</span>
                      </div>
                      <span className="font-mono font-bold text-gray-200 text-[11px] mt-1">🪙 {thirdPrizeVal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Active Map Pool section */}
          <div className="bg-[#0c0f17]/40 rounded-xl border border-[#161f33]/60 p-2.5 mb-4 font-sans">
            <div className="text-[9.5px] text-gray-400 uppercase font-bold font-mono tracking-wider flex items-center gap-1.5 mb-2">
              <Map className="h-3 w-3 text-gaming-blue" /> ACTIVE TOURNAMENT MAP POOL
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getMapPool(event.game, event.mapPool).map((mapName) => (
                <div 
                  key={mapName}
                  className="bg-[#121826]/85 text-[#c7d2fe] text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-gaming-border/40 hover:border-gaming-blue/30 hover:bg-gaming-blue/5 transition-all cursor-default flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <span className="h-1.5 w-1.5 bg-gaming-blue rounded-full shadow-[0_0_6px_rgba(0,180,216,0.8)] shrink-0" />
                  {mapName}
                </div>
              ))}
            </div>
          </div>

          {/* Tournament Partners & Sponsors */}
          <div className="bg-[#0c0f17]/40 rounded-xl border border-[#161f33]/60 p-2.5 mb-4 font-sans select-none">
            <div className="text-[9.5px] text-gray-450 uppercase font-bold font-mono tracking-wider flex items-center gap-1.5 mb-2.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
              OFFICIAL TOURNAMENT PARTNERS
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-black/40 hover:bg-black/55 border border-[#1d273d]/50 hover:border-[#2a3c5a]/70 rounded-lg p-1.5 transition flex flex-col items-center justify-center group">
                <span className="text-[10px] font-black tracking-widest text-[#00ff66] font-mono group-hover:scale-105 transition-transform duration-200 uppercase">
                  NVIDIA
                </span>
                <span className="text-[7px] text-gray-500 font-bold font-sans tracking-tight block uppercase mt-0.5">GEFORCE RTX</span>
              </div>
              <div className="bg-black/40 hover:bg-black/55 border border-[#1d273d]/50 hover:border-[#2a3c5a]/70 rounded-lg p-1.5 transition flex flex-col items-center justify-center group">
                <span className="text-[10px] font-black tracking-wider text-[#ff3366] font-mono group-hover:scale-105 transition-transform duration-200 uppercase">
                  ROG
                </span>
                <span className="text-[7px] text-gray-500 font-bold font-sans tracking-tight block uppercase mt-0.5">REPUBLIC OF GAMERS</span>
              </div>
              <div className="bg-black/40 hover:bg-black/55 border border-[#1d273d]/50 hover:border-[#2a3c5a]/70 rounded-lg p-1.5 transition flex flex-col items-center justify-center group">
                <span className="text-[10px] font-black tracking-wider text-[#0066ff] font-mono group-hover:scale-105 transition-transform duration-200 uppercase">
                  INTEL
                </span>
                <span className="text-[7px] text-gray-500 font-bold font-sans tracking-tight block uppercase mt-0.5">CORE ULTRA</span>
              </div>
            </div>
          </div>

          {/* Tournament Status Timeline Indicator */}
          <div className="bg-[#0c0f17]/45 rounded-xl border border-gaming-border/40 p-3 mb-4 font-sans">
            <div className="text-[9.5px] text-gray-400 uppercase font-bold font-mono tracking-wider flex items-center gap-1.5 mb-3">
              <TrendingUp className="h-3 w-3 text-gaming-neon" /> TOURNAMENT PROGRESS TIMELINE
            </div>
            
            <div className="relative flex items-center justify-between px-1 mt-4 mb-1">
              {/* Background Tracking Line */}
              <div className="absolute left-6 right-6 top-[8px] h-[2px] bg-[#1a2135] -z-0" />
              
              {/* Colored Progress Line */}
              <div 
                className="absolute left-6 top-[8px] h-[2px] bg-gradient-to-r from-gaming-blue to-gaming-neon transition-all duration-500 -z-0"
                style={{ 
                  width: `${
                    event.status === "completed" 
                      ? "calc(100% - 48px)" 
                      : event.status === "live" 
                      ? "33.3%" 
                      : "0%"
                  }` 
                }}
              />

              {/* Steps */}
              {[
                { name: "Registration", desc: "Open to Join" },
                { name: "In-Match", desc: "Live Battles" },
                { name: "Review", desc: "Verifying Results" },
                { name: "Payout", desc: "Winnings Sent" }
              ].map((step, idx) => {
                const activeIndex = event.status === "completed" ? 3 : event.status === "live" ? 1 : 0;
                const isCompleted = idx < activeIndex;
                const isActive = idx === activeIndex;
                const isUpcoming = idx > activeIndex;

                let dotColor = "bg-[#101423] border-[#1f293d] text-gray-500";
                if (isCompleted) {
                  dotColor = "bg-gaming-blue border-gaming-blue text-white shadow-[0_0_8px_rgba(0,180,216,0.5)]";
                } else if (isActive) {
                  dotColor = "bg-[#0b0e17] border-gaming-neon text-gaming-neon shadow-[0_0_10px_rgba(0,225,217,0.6)] animate-pulse";
                }

                return (
                  <div key={step.name} className="flex flex-col items-center relative z-10 w-1/4">
                    {/* Circle Node */}
                    <div 
                      className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${dotColor}`}
                    >
                      {isCompleted ? (
                        <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                      ) : isActive ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-gaming-neon animate-ping" />
                      ) : (
                        <span className="h-1 w-1 bg-gray-600 rounded-full" />
                      )}
                    </div>
                    {/* Compact Step Labels */}
                    <span 
                      className={`text-[9px] font-bold font-mono tracking-tight mt-1.5 transition-colors text-center ${
                        isActive 
                          ? "text-gaming-neon font-extrabold" 
                          : isCompleted 
                          ? "text-gray-300" 
                          : "text-gray-500"
                      }`}
                    >
                      {step.name}
                    </span>
                    <span className="text-[7px] font-sans text-gray-500 mt-0.5 max-w-[70px] text-center leading-3 hidden sm:block">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Slot fill meter / Progress Bar */}
        <div>
          <div className="mt-2 mb-4 space-y-2">
            <div className="flex justify-between items-center text-[10.5px] font-mono mb-1">
              <div className="flex items-center gap-1">
                {isFull ? (
                  <span className="text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    🚫 Sold Out
                  </span>
                ) : event.maxParticipants - event.slotsFilled <= 5 ? (
                  <span className="text-gaming-pink font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    🔥 {event.maxParticipants - event.slotsFilled} Slots Left!
                  </span>
                ) : slotsPercent >= 75 ? (
                  <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    ⚡ Filling Fast
                  </span>
                ) : (
                  <span className="text-gaming-blue font-bold uppercase tracking-wider flex items-center gap-1">
                    🎮 Registering
                  </span>
                )}
              </div>
              
              {/* Stacked Participant Avatars Social Proof */}
              <div className="flex items-center gap-2">
                {event.slotsFilled > 0 && (
                  <div className="flex -space-x-2.5 overflow-visible py-0.5" title="Registered Participants">
                    {getParticipantAvatars().map((gamer, idx) => {
                      return (
                        <div
                          key={idx}
                          className="relative h-6 w-6 rounded-full border border-[#0d111a] bg-[#0E1119] flex items-center justify-center overflow-hidden shadow-[0_0_8px_rgba(0,0,0,0.65)] hover:scale-120 hover:z-30 transition-all duration-150 cursor-help"
                          title={`${gamer.name} (Registered)`}
                          style={{ zIndex: 10 - idx }}
                        >
                          <img
                            src={gamer.url}
                            alt={gamer.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      );
                    })}
                    {event.slotsFilled > 3 && (
                      <div 
                        className="h-6 w-6 rounded-full border border-[#0d111a] bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center text-[7.5px] font-bold text-gray-300 select-none shadow-[0_0_6px_rgba(0,0,0,0.5)] cursor-help z-10"
                        title={`${event.slotsFilled - 3} more players registered`}
                      >
                        +{event.slotsFilled - 3}
                      </div>
                    )}
                  </div>
                )}
                <span className="font-bold text-white text-xs">
                  {event.slotsFilled}/<span className="text-gray-400">{event.maxParticipants}</span>
                </span>
              </div>
            </div>

            {/* Premium Progress Bar Wrapper */}
            <div className="w-full h-3 bg-[#0c0f17]/80 rounded-full overflow-hidden p-[2px] border border-gaming-border/40 shadow-inner">
              <div 
                style={{ width: `${Math.max(4, slotsPercent)}%` }}
                className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden ${
                  slotsPercent >= 90 
                    ? "bg-gradient-to-r from-gaming-pink to-red-500 shadow-[0_0_12px_rgba(244,63,94,0.7)] animate-pulse" 
                    : slotsPercent >= 70 
                    ? "bg-gradient-to-r from-amber-500 to-gaming-pink shadow-[0_0_8px_rgba(217,119,6,0.5)]" 
                    : "bg-gradient-to-r from-gaming-blue to-gaming-neon shadow-[0_0_8px_rgba(0,180,216,0.4)]"
                }`}
              >
                {/* Glossy overlay effect for professional gamer feel */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10 skew-x-12" />
              </div>
            </div>
          </div>

          {/* Winners display if completed */}
          {event.status === "completed" && event.winners && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-2 rounded-lg text-xs font-medium mb-4 text-center">
              🏆 Winners: <span className="font-bold">{event.winners}</span>
            </div>
          )}

          {/* Action Buttons */}
          {event.status === "live" && (
            <button
              onClick={() => setShowBroadcastViewer(true)}
              className="w-full mb-3 bg-gradient-to-r from-gaming-pink to-rose-600 hover:from-rose-500 hover:to-gaming-pink text-white text-xs font-bold font-display py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.01] active:scale-97 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_22px_rgba(239,68,68,0.65)] cursor-pointer uppercase tracking-wider animate-pulse hover:animate-none font-sans"
            >
              <Tv className="h-4 w-4 shrink-0 animate-bounce" /> WATCH LIVE SPECTATOR MODE 🔴
            </button>
          )}

          {/* User's final standing if completed and user participated */}
          {event.status === "completed" && isJoined && (() => {
            const standing = getPlayerStanding();
            if (!standing) return null;
            const isWinner = standing.rank.toString().includes("1st") || standing.rank.toString().includes("Champion");
            return (
              <div className={`p-3.5 rounded-xl mb-4 border transition-all duration-300 text-left ${
                isWinner 
                  ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                  : "bg-slate-800/40 border-gaming-border/60"
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase font-mono">
                    👤 YOUR PERFORMANCE RECORD
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    isWinner 
                      ? "bg-amber-400 text-black font-extrabold" 
                      : "bg-gaming-blue/20 text-gaming-blue"
                  }`}>
                    {isWinner ? "WINNER 👑" : "COMPETITOR ⚔️"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-display text-lg font-black border shadow ${
                      isWinner 
                        ? "bg-amber-500/15 border-amber-400/30 text-amber-400" 
                        : "bg-slate-900/60 border-slate-700/50 text-white"
                    }`}>
                      {isWinner ? "🏆" : "🏅"}
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400 font-sans">Final Standing</div>
                      <div className={`text-sm font-extrabold font-display uppercase tracking-wide ${
                        isWinner ? "text-amber-400" : "text-white"
                      }`}>
                        {standing.rank}
                      </div>
                    </div>
                  </div>
                  
                  {standing.winnings > 0 && (
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 font-sans">Payout Dispatched</div>
                      <div className="text-xs font-black text-gaming-neon font-mono mt-0.5 bg-gaming-neon/10 border border-gaming-neon/20 px-2 py-0.5 rounded">
                        +🪙 {standing.winnings} Coins
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {isJoined ? (
            <div className="space-y-2">
              {event.status === "completed" ? (
                <div className="w-full bg-slate-800/35 border border-slate-700/60 text-gray-300 text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 font-display select-none">
                  🏁 YOU PARTICIPATED
                </div>
              ) : (
                <div className="w-full bg-gaming-neon/10 border border-gaming-neon/40 text-gaming-neon text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 font-display select-none">
                  <Zap className="h-3.5 w-3.5 fill-gaming-neon text-gaming-neon animate-pulse" /> YOU ARE REGISTERED
                </div>
              )}
              <button
                onClick={() => onOpenChat?.(event)}
                className="w-full bg-gaming-blue hover:bg-gaming-blue/90 border border-transparent shadow-[0_4px_14px_rgba(0,180,216,0.3)] text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-display transition active:scale-95 cursor-pointer uppercase italic"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-550"></span>
                </span>
                💬 Open Match Coord Chat
              </button>
            </div>
          ) : event.status === "completed" ? (
            <div className="w-full bg-slate-800/30 border border-slate-700/50 text-gray-400 text-xs font-semibold py-2 px-4 rounded flex items-center justify-center font-display select-none">
              MATCH COMPLETED
            </div>
          ) : isFull ? (
            <div className="w-full bg-slate-800/30 border border-slate-700/50 text-gray-400 text-xs font-semibold py-2 px-4 rounded flex items-center justify-center font-display select-none">
              SLOTS FILLED
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRegisterClick}
                id={`btn_register_${event.id}`}
                className={`w-full py-2.5 px-4 rounded text-xs font-bold font-display bg-gaming-blue text-white hover:bg-gaming-blue/90 border border-transparent transition-all duration-200 flex items-center justify-center gap-1.5 hover:gap-2 uppercase italic tracking-wider cursor-pointer font-sans transform-gpu ${
                  isTriggeringReg 
                    ? "scale-[0.93] opacity-60 bg-[#081220] border-gaming-blue/30 shadow-inner" 
                    : isStartingSoonOrLive
                    ? "active:scale-97 animate-pulse shadow-[0_0_20px_rgba(0,229,217,0.65)] border border-gaming-neon/40 ring-1 ring-gaming-blue/40"
                    : "active:scale-97 hover:shadow-[0_0_15px_rgba(0,180,216,0.35)]"
                }`}
                disabled={isTriggeringReg}
              >
                {isTriggeringReg ? (
                  <span className="flex items-center gap-1.5 animate-pulse">
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    INITIATING LOBBY ENTRY...
                  </span>
                ) : (
                  <>
                    {isStartingSoonOrLive && (
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gaming-neon opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gaming-neon"></span>
                      </span>
                    )}
                    REGISTER FOR TOURNAMENT <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </>
                )}
              </button>

              <button
                onClick={() => onRegister(event)}
                className="w-full py-2 bg-[#091b2c]/80 hover:bg-gaming-neon/15 border border-gaming-neon/40 hover:border-gaming-neon text-gaming-neon hover:text-white rounded-lg text-[9.5px] font-bold font-mono transition-all duration-200 flex items-center justify-center gap-1 uppercase tracking-wider cursor-pointer shadow-sm hover:shadow-[0_0_10px_rgba(0,225,217,0.25)]"
                title="Bypass transition animations and register instantly"
              >
                ⚡ INSTANT QUICK JOIN
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Match Requirements & Regulations Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div 
            className="w-full max-w-lg bg-[#0E121E] border border-gaming-blue/40 rounded-2xl shadow-[0_20px_50px_rgba(0,180,216,0.30)] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-205"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gaming-border bg-[#0B0F17]/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gaming-blue/10 border border-gaming-blue/20">
                  <FileText className="h-5 w-5 text-gaming-blue" />
                </div>
                <div>
                  <h4 className="text-sm font-display font-extrabold text-white uppercase tracking-tight">
                    {event.title}
                  </h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono font-bold flex items-center gap-1">
                    <span className="text-gaming-neon">●</span> Official Tournament Handbook
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-gaming-pink/20 hover:text-gaming-pink text-gray-400 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* In-Modal Navigation Tabs (Match Requirements vs Regulations & Conduct) */}
            <div className="flex border-b border-gaming-border/85 bg-[#0B0F17]/40 px-4 pt-2 gap-1">
              {[
                { id: "requirements", label: "Match Requirements" },
                { id: "regulations", label: "Regulations & Conduct" }
              ].map((tab) => {
                const isActive = rulesTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRulesTab(tab.id as "requirements" | "regulations")}
                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "border-gaming-blue text-gaming-blue bg-gaming-blue/5"
                        : "border-transparent text-gray-400 hover:text-gray-250 hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Body Scroll Space */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 max-h-[50vh]">
              {rulesTab === "requirements" ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-gaming-border/60">
                    <h5 className="text-[11px] font-mono font-black text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      🎮 SYSTEM & PLATFORM PROFILE
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                      <div className="bg-[#0B0F17] p-2 rounded border border-gaming-border/40">
                        <span className="text-gray-500 block">GAME MATCH</span>
                        <span className="text-white font-bold">{event.game}</span>
                      </div>
                      <div className="bg-[#0B0F17] p-2 rounded border border-gaming-border/40">
                        <span className="text-gray-500 block">DEVICE PERMITTED</span>
                        <span className="text-gaming-neon font-bold">Mobile Handhelds</span>
                      </div>
                      <div className="bg-[#0B0F17] p-2 rounded border border-gaming-border/40">
                        <span className="text-gray-500 block">EMULATORS BAN</span>
                        <span className="text-gaming-pink font-bold">Strictly Blocked</span>
                      </div>
                      <div className="bg-[#0B0F17] p-2 rounded border border-gaming-border/40">
                        <span className="text-gray-500 block">ACCOUNT MIN LVL</span>
                        <span className="text-gaming-blue font-bold">Lv. 35+ Required</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0B0F17]/40 border border-gaming-border/50 space-y-2.5">
                    <h5 className="text-[11px] font-mono font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      📋 MANDATORY REGISTRATION DETAILS
                    </h5>
                    <ul className="text-xs text-gray-300 space-y-2 list-disc pl-4 font-sans">
                      <li>You must register with your legal and exact <strong>In-Game Name (IGN)</strong> and <strong>In-Game ID (IGID)</strong>.</li>
                      <li>Double check the credentials. Typo input names will result in custom server lobby auto-kicks by the bot.</li>
                      <li>Make sure your IGN matches the lobby avatar during check-in to receive match points properly.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gaming-blue/5 border border-gaming-blue/20 flex items-start gap-2.5">
                    <ShieldAlert className="h-4.5 w-4.5 text-gaming-blue shrink-0 mt-0.5" />
                    <div>
                      <h6 className="text-[11px] font-bold text-white uppercase font-mono tracking-wider">Lobby Join Flow</h6>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Specific customized room keys, lobby credentials, and invitations are shared directly inside the real-time <strong>MatchCoord Chat</strong> 15 minutes before setup.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-gaming-border/60">
                    <h5 className="text-[11px] font-mono font-black text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      ⚔️ IN-GAME REGULATIONS
                    </h5>
                    <div className="space-y-2.5 font-sans">
                      {event.rules ? (
                        event.rules.split("\n").filter(line => line.trim().length > 0).map((rule, idx) => (
                          <div key={idx} className="flex gap-2.5 text-xs text-gray-300">
                            <span className="text-gaming-blue font-mono font-bold shrink-0">{idx + 1}.</span>
                            <span>{rule.startsWith("1.") || rule.startsWith("2.") ? rule.substring(2).trim() : rule}</span>
                          </div>
                        ))
                      ) : (
                        [
                          "Strict real-time anti-cheat algorithms are active. Use of modified clients, injectors, or third party overlays results in instant ban and disqualification.",
                          "Custom lobby coordinates are refreshed 15 minutes before kickoff inside the Live Coordinator Roster panel.",
                          "If connection delays occur, clients have exactly 3 minutes of grace window to rejoin before server telemetry defaults the results.",
                          "End-of-match screens and points are compiled automatically. In case of discrepancies, upload a screenshot to the moderator queue.",
                          "Unsportsmanlike actions like teamed matching with other team squads will result in immediate forfeiture of the tournament fee."
                        ].map((rule, idx) => (
                          <div key={idx} className="flex gap-2.5 text-xs text-gray-300">
                            <span className="text-gaming-blue font-mono font-bold shrink-0">{idx + 1}.</span>
                            <span>{rule}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gaming-pink/5 border border-gaming-pink/15 flex items-start gap-2.5">
                    <ShieldAlert className="h-4.5 w-4.5 text-gaming-pink shrink-0 mt-0.5" />
                    <div>
                      <h6 className="text-[11px] font-bold text-white uppercase font-mono tracking-wider">Disqualification policy</h6>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Failure to comply with standard gaming lobbies or using illegal tactics results in instant registration cancellation. Under such occurrences, the buy-in fee is non-refundable.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0B0F17]/80 border-t border-gaming-border flex items-center justify-between gap-4">
              <div className="text-[10px] text-gray-500 font-mono tracking-wide leading-tight max-w-[280px]">
                Registered players must be online and inside the lobby 10 mins before start.
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 bg-gaming-blue hover:bg-gaming-blue/90 text-white font-mono text-[11px] font-bold uppercase rounded-lg tracking-wider transition cursor-pointer"
              >
                Close HandBook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Live Broadcast Spectator Arena Modal */}
      {showBroadcastViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          <div 
            className="w-full max-w-5xl bg-[#080B11] border border-gaming-pink/40 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.30)] overflow-hidden flex flex-col md:max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Broadcaster Header Header */}
            <div className="p-4 bg-[#0d121f] border-b border-gaming-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-gaming-pink/20 text-gaming-pink border border-gaming-pink/30 p-2 rounded-xl text-center flex items-center justify-center animate-pulse">
                  <Tv className="h-5 w-5 shrink-0" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-gaming-pink text-white text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                      <Radio className="h-2.5 w-2.5 animate-spin" /> LIVE SPECTATOR
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider">ROOM #SPEC-{event.id.substring(0, 6).toUpperCase()}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight mt-0.5">
                    {event.title} - Virtual Stream Spectator Deck
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-[#121826] border border-gaming-border px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-gray-400">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>APAC-SOUTH-2 (9.2ms)</span>
                </div>
                <button
                  onClick={() => setShowBroadcastViewer(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-gaming-pink/20 hover:text-gaming-pink text-gray-400 transition cursor-pointer"
                  title="Disconnect Stream"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Broadcast Layout (2 Columns on Medium Screens) */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto">
              
              {/* Left Column: Video screen simulation & settings */}
              <div className="flex-1 p-4 flex flex-col justify-between gap-4 border-b md:border-b-0 md:border-r border-gaming-border/70 overflow-y-auto">
                <div className="space-y-3">
                  
                  {/* Outer Video Container with simulated video frame */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gaming-border bg-black shadow-2xl group flex flex-col justify-between p-4">
                    
                    {/* Simulated Screen Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.85))] pointer-events-none z-10" />
                    
                    {/* Moving Scanlines overlay */}
                    <div className="absolute inset-0 bg-scanlines mix-blend-overlay opacity-15 pointer-events-none z-10" />

                    {/* HUD Header */}
                    <div className="flex items-start justify-between z-20">
                      <div className="bg-black/75 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex flex-col gap-0.5">
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Active camera</span>
                        <span className="text-xs font-bold text-gaming-neon font-mono uppercase tracking-wide flex items-center gap-1.5 animate-pulse">
                          <Gamepad2 className="h-3.5 w-3.5 text-gaming-neon" /> {activeCam}
                        </span>
                      </div>

                      <div className="bg-black/75 backdrop-blur-sm border border-[#F43F5E]/30 rounded-lg py-1 px-2.5 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F43F5E] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F43F5E]"></span>
                        </span>
                        <span className="text-[10px] font-bold font-mono text-white tracking-widest uppercase">
                          REC
                        </span>
                      </div>
                    </div>

                    {/* Highly stylized animated game visualizer representation */}
                    <div className="absolute inset-x-0 top-1/4 bottom-1/4 flex flex-col items-center justify-center pointer-events-none z-0">
                      
                      {/* Pulse Ring Visualizer */}
                      <div className="relative h-28 w-28 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-gaming-blue/30 animate-ping duration-1000" />
                        <div className="absolute inset-2 rounded-full border border-gaming-pink/40 animate-ping duration-700" />
                        <div className="absolute inset-4 rounded-full border border-gaming-neon/20 animate-pulse" />
                        
                        {/* Dynamic Crosshair layout */}
                        <div className="h-10 w-10 border border-gaming-neon/40 rounded flex items-center justify-center relative bg-black/15">
                          <span className="h-1.5 w-1.5 rounded-full bg-gaming-pink animate-ping" />
                          {/* Compass Markers */}
                          <div className="absolute top-1 left-1.5 right-1.5 h-[0.5px] bg-gaming-neon/30" />
                          <div className="absolute bottom-1 left-1.5 right-1.5 h-[0.5px] bg-gaming-neon/30" />
                        </div>
                      </div>

                      {/* Moving live telemetric data lines */}
                      <div className="mt-3 text-center">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">TELEMETRY DECK FEED</span>
                        <div className="flex items-center gap-3 text-[10px] font-mono font-bold mt-1">
                          <span className="text-gaming-blue">MATCH COORD X: 114.908</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-gaming-pink">Y: -74.120</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-gaming-neon">PING: 14ms</span>
                        </div>
                      </div>
                    </div>

                    {/* HUD Footer status items */}
                    <div className="flex items-end justify-between z-20">
                      <div className="bg-black/75 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-[10px] text-white font-mono font-bold">4,812 viewers</span>
                        </div>
                        <span className="text-gray-600">|</span>
                        <div className="flex items-center gap-1.5">
                          <Wifi className="h-3.5 w-3.5 text-gaming-neon" />
                          <span className="text-[10px] text-gaming-neon font-mono font-bold">10.8 Mbps</span>
                        </div>
                      </div>

                      <div className="bg-black/75 backdrop-blur-sm border border-white/10 rounded-lg p-1.5 flex items-center gap-2">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="p-1 rounded hover:bg-white/10 text-white transition cursor-pointer"
                          title={isMuted ? "Unmute broadcast" : "Mute broadcast"}
                        >
                          {isMuted ? (
                            <VolumeX className="h-4 w-4 text-gaming-pink animate-pulse" />
                          ) : (
                            <Volume2 className="h-4 w-4 text-gaming-neon" />
                          )}
                        </button>
                        <select
                          value={streamQuality}
                          onChange={(e) => setStreamQuality(e.target.value)}
                          className="bg-[#121826]/95 border-0 text-[10px] text-gray-300 font-mono font-bold uppercase rounded p-1 cursor-pointer outline-none focus:ring-1 focus:ring-gaming-blue"
                        >
                          <option value="1080p (Source)">1080p60 fps</option>
                          <option value="720p60 fps">720p 60fps</option>
                          <option value="480p">480p Specs</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Broadcast Live Ticker / Match Status Info */}
                  <div className="p-3 bg-gradient-to-r from-gaming-blue/10 to-transparent border border-gaming-blue/20 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gaming-neon animate-ping" />
                      <span className="text-[10.5px] font-mono text-gray-400">
                        ESTIMATED FIRST PLACE REWARD:
                      </span>
                      <span className="text-xs font-bold text-gaming-neon font-mono">
                        🪙 {(event.firstPrize || event.prizePool / 2).toLocaleString("en-IN")} Coins
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono bg-black/45 px-2 py-0.5 rounded border border-gaming-border">
                      SPECTOR DECK #VR-22
                    </span>
                  </div>
                </div>

                {/* Spectating camera options */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">
                    🎥 SELECT BROADCASTER SPECTOR PERSPECTIVE
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: "Directorial POV", desc: "Dynamic director camera" },
                      { name: "Overhead Tactical", desc: "Full overhead map view" },
                      { name: "Alpha Leader POV", desc: "Alpha squad first person" },
                      { name: "Beta Leader POV", desc: "Beta squad first person" }
                    ].map((cam) => {
                      const isActive = activeCam === cam.name;
                      return (
                        <button
                          key={cam.name}
                          onClick={() => setActiveCam(cam.name)}
                          className={`p-2 rounded-xl text-left border text-xs font-mono transition-all uppercase cursor-pointer ${
                            isActive
                              ? "bg-gaming-blue/15 border-gaming-blue text-white shadow-[0_0_12px_rgba(0,180,216,0.2)] font-bold"
                              : "bg-[#0b0e17] border-gaming-border hover:border-white/20 text-gray-400 hover:text-white"
                          }`}
                        >
                          <div className="truncate">{cam.name}</div>
                          <div className="text-[8px] text-gray-500 normal-case font-sans mt-0.5 line-clamp-1">{cam.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Chat Feed Panel & Comment Box */}
              <div className="w-full md:w-[350px] bg-[#0a0d16] flex flex-col justify-between h-[380px] md:h-auto min-h-0">
                
                {/* Chat Panel Title */}
                <div className="p-3 bg-[#0e121f] border-b border-gaming-border flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                    🚀 Spectator Arena Chat
                  </span>
                  <span className="inline-block bg-[#1a2135] text-[9px] font-mono font-bold text-gaming-neon px-2 py-0.5 rounded">
                    EST. BROADCAST
                  </span>
                </div>

                {/* Scrolling Message Wall */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 flex flex-col-reverse justify-start min-h-0">
                  {[...liveChat].reverse().map((chat) => {
                    const isPresenter = chat.badge === "ME" || chat.author === username;
                    return (
                      <div 
                        key={chat.id} 
                        className={`text-xs p-2 rounded-lg border transition animate-in slide-in-from-bottom-1 duration-150 ${
                          isPresenter
                            ? "bg-gaming-blue/10 border-gaming-blue/25"
                            : "bg-white/2 border-[#121826]/70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            {chat.badge && (
                              <span className={`text-[8.5px] font-mono font-black uppercase px-1 rounded truncate tracking-tighter ${
                                chat.badge === "VIP" 
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                                  : chat.badge === "MOD" 
                                  ? "bg-gaming-pink/20 text-gaming-pink border border-gaming-pink/30 animate-pulse" 
                                  : chat.badge === "ME" 
                                  ? "bg-gaming-neon/25 text-gaming-neon border border-gaming-neon/40 font-extrabold"
                                  : "bg-gaming-blue/20 text-gaming-blue border border-gaming-blue/30"
                              }`}>
                                {chat.badge}
                              </span>
                            )}
                            <span className={`font-bold font-mono tracking-tight truncate ${isPresenter ? "text-gaming-neon" : "text-gray-300"}`}>
                              {chat.author}
                            </span>
                          </div>
                          <span className="text-[8px] text-gray-500 font-mono shrink-0">{chat.time}</span>
                        </div>
                        <p className="text-gray-400 mt-0.5 break-words font-sans">{chat.text}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Message Submission Area */}
                <form 
                  onSubmit={handleSendStreamChat} 
                  className="p-3 bg-[#0d121f] border-t border-gaming-border shrink-0 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={myChatMessage}
                    onChange={(e) => setMyChatMessage(e.target.value)}
                    placeholder="Type message in Spectator chat..."
                    className="flex-1 bg-[#05070a] text-xs font-sans text-white placeholder-gray-500 px-3 py-2.5 rounded-lg border border-gaming-border focus:border-gaming-blue/60 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 bg-gaming-blue hover:bg-gaming-blue/90 text-white text-xs font-mono font-bold uppercase rounded-lg tracking-wider transition hover:scale-[1.02] cursor-pointer"
                  >
                    SEND
                  </button>
                </form>
              </div>

            </div>

            {/* Arena Footer Info */}
            <div className="p-3 bg-[#0d121f] border-t border-gaming-border flex items-center justify-between gap-4 shrink-0 text-gray-500 font-mono text-[9px] uppercase tracking-wider">
              <span>Streaming engine v2.05 (Spectator Only Mode)</span>
              <span>Enjoy professional GamerZone broadcast streaming</span>
            </div>
          </div>
        </div>
      )}

      {/* QR Code and Social Invite Propagation Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div 
            className="w-full max-w-md bg-[#0E121E] border border-gaming-blue/40 rounded-2xl shadow-[0_20px_50px_rgba(0,180,216,0.30)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-205"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gaming-border bg-[#0B0F17]/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gaming-blue/10 border border-gaming-blue/20">
                  <QrCode className="h-5 w-5 text-gaming-blue" />
                </div>
                <div>
                  <h4 className="text-sm font-display font-extrabold text-white uppercase tracking-tight">
                    Invite Teammates & Friends
                  </h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono font-bold flex items-center gap-1">
                    <span className="text-gaming-neon animate-pulse">●</span> Share Tournament QR Code
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-gaming-pink/20 hover:text-gaming-pink text-gray-400 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col items-center text-center space-y-5">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-white uppercase tracking-wide">
                  {event.title}
                </h5>
                <p className="text-[10.5px] text-gray-400">
                  Let's play in the tournament for <strong className="text-gaming-blue">{event.game}</strong>!
                </p>
              </div>

              {/* QR Code Container with scanning corner frame */}
              <div className="relative p-3.5 bg-white rounded-2xl shadow-[0_0_24px_rgba(0,180,216,0.2)] border border-gaming-blue/30 flex items-center justify-center w-48 h-48 select-none group">
                {/* Corner Borders for Scan Area */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-gaming-blue rounded-tl" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-gaming-blue rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-gaming-blue rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-gaming-blue rounded-br" />
                
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=0b0e17&bgcolor=ffffff&qzone=1&data=${encodeURIComponent(`${window.location.origin}?tournament=${event.id}`)}`}
                  alt="Tournament Invitation QR Code"
                  className="w-full h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />

                {/* Scan effect laser line */}
                <div className="absolute left-0 right-0 h-0.5 bg-gaming-blue opacity-85 animate-bounce top-1/2 shadow-[0_0_10px_rgba(0,180,216,0.9)]" />
              </div>

              <div className="w-full space-y-1.5">
                <p className="text-[10px] text-gray-400 font-sans">
                  👉 Scan using phone camera to open / फोन कैमरा से स्कैन कर तुरंत खोलें!
                </p>
                <div className="text-[9px] text-gray-500 font-mono tracking-wider uppercase bg-[#0B0F17] py-1 px-2.5 rounded border border-gaming-border/40 inline-flex items-center gap-1">
                  <Share2 className="h-3 w-3 text-gaming-neon" /> {sharesCount} total shares generated
                </div>
              </div>

              {/* URL Display with Clipboard Copy */}
              <div className="w-full space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase text-left font-mono tracking-wider">
                  Invitation Link / इनविटेशन लिंक
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}?tournament=${event.id}`}
                    className="flex-1 bg-[#05070a] text-xs font-mono text-gray-300 px-3 py-2 rounded-lg border border-gaming-border/80 focus:outline-none select-all truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition duration-150 flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                      modalCopied
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-gaming-blue hover:bg-gaming-blue/90 text-white border-transparent"
                    }`}
                  >
                    {modalCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Optional Native Share System Trigger */}
              {typeof navigator !== "undefined" && navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-4 bg-[#141b2e] hover:bg-[#1b253f] border border-gaming-blue/35 text-gaming-blue font-mono text-[11px] font-bold uppercase rounded-xl tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(0,180,216,0.15)]"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> More System Share Options
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#0B0F17]/80 border-t border-gaming-border flex items-center justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[11px] font-bold uppercase rounded-lg tracking-wider transition cursor-pointer border border-gaming-border/60"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

