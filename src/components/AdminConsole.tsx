import React, { useState, useEffect } from "react";
import { TournamentEvent, WithdrawalRequest, UserProfile, EventRegistration } from "../types";
import { 
  Plus, Check, X, ShieldAlert, Award, RefreshCw, Layers, Calendar, 
  DollarSign, CloudLightning, Users, Search, Coins, ShieldCheck, UserCheck,
  TrendingUp, BarChart2, PieChart as PieIcon, Activity, UserX, Shield
} from "lucide-react";
import { 
  dbAddEvent, dbUpdateEvent, dbProcessWithdrawal, 
  dbFetchAllUsers, dbAdminUpdateUserProfile, dbFetchRegistrations, dbUpdateRegistration
} from "../firebaseService";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell 
} from "recharts";

interface AdminProps {
  events: TournamentEvent[];
  withdrawalRequests: WithdrawalRequest[];
  onRefreshEvents: () => Promise<void>;
  onRefreshWithdrawals: () => Promise<void>;
  discordWebhook: string;
}

export default function AdminConsole({ events, withdrawalRequests, onRefreshEvents, onRefreshWithdrawals, discordWebhook }: AdminProps) {
  // New event Form
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("BGMI (Battlegrounds Mobile India)");
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState<number>(0);
  const [prizePool, setPrizePool] = useState<number>(10000);
  const [date, setDate] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number>(64);
  const [rules, setRules] = useState("1. Play fair.\n2. Emulator not allowed.");
  const [duration, setDuration] = useState("2h 30m");
  const [mapPoolInput, setMapPoolInput] = useState("Erangel, Miramar, Sanhok, Vikendi");
  
  // Tiered Prizes state variables with live automatic defaults
  const [firstPrize, setFirstPrize] = useState<number>(6000);
  const [secondPrize, setSecondPrize] = useState<number>(3000);
  const [thirdPrize, setThirdPrize] = useState<number>(1000);

  useEffect(() => {
    setFirstPrize(Math.round(prizePool * 0.60));
    setSecondPrize(Math.round(prizePool * 0.30));
    setThirdPrize(Math.round(prizePool * 0.10));
  }, [prizePool]);

  useEffect(() => {
    const g = game.toLowerCase();
    if (g.includes("bgmi") || g.includes("pubg") || g.includes("battlegrounds")) {
      setMapPoolInput("Erangel, Miramar, Sanhok, Vikendi");
    } else if (g.includes("valorant")) {
      setMapPoolInput("Bind, Ascent, Haven, Split, Icebox");
    } else if (g.includes("free fire") || g.includes("freefire")) {
      setMapPoolInput("Bermuda, Kalahari, Purgatory, Alpine");
    } else if (g.includes("cod") || g.includes("call of duty")) {
      setMapPoolInput("Nuketown, Firing Range, Standoff, Crash");
    } else if (g.includes("apex")) {
      setMapPoolInput("Kings Canyon, Worlds Edge, Storm Point, Olympus");
    } else {
      setMapPoolInput("Los Santos, Blaine County, Cayo Perico");
    }
  }, [game]);
  
  const [savingEvent, setSavingEvent] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Managing active statuses
  const [targetEventId, setTargetEventId] = useState("");
  const [newStatus, setNewStatus] = useState<"upcoming" | "live" | "completed">("upcoming");
  const [winnerName, setWinnerName] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Custom administrative tabs state
  const [adminModeTab, setAdminModeTab] = useState<"tournaments" | "player_moderation">("tournaments");
  const [activeTab, setActiveTab] = useState<"events" | "withdrawals" | "users" | "analytics">("events");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editBalance, setEditBalance] = useState<number>(0);
  const [editEarnings, setEditEarnings] = useState<number>(0);
  const [editVerified, setEditVerified] = useState<boolean>(false);
  const [editBanned, setEditBanned] = useState<boolean>(false);
  const [editBadges, setEditBadges] = useState<string[]>([]);
  const [userMessage, setUserMessage] = useState("");

  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [useHistoricSimulation, setUseHistoricSimulation] = useState(true);

  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [editRankAchieved, setEditRankAchieved] = useState("");
  const [editWinnings, setEditWinnings] = useState<number>(0);
  const [savingRegResult, setSavingRegResult] = useState(false);

  const fetchUsersList = async () => {
    setLoadingUsers(true);
    setUserMessage("");
    try {
      const data = await dbFetchAllUsers();
      setAllUsers(data);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setUserMessage("⚠️ Failed to load user profiles. Please ensure Rules allow reading user nodes.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRegistrationsList = async () => {
    setLoadingRegs(true);
    try {
      const data = await dbFetchRegistrations();
      setRegistrations(data);
    } catch (err: any) {
      console.error("Error loading registrations:", err);
    } finally {
      setLoadingRegs(false);
    }
  };

  const handleSaveRegResult = async (regId: string) => {
    setSavingRegResult(true);
    try {
      await dbUpdateRegistration(regId, {
        rankAchieved: editRankAchieved || "Participant",
        winnings: Number(editWinnings) || 0
      });
      const data = await dbFetchRegistrations();
      setRegistrations(data);
      setEditingRegId(null);
    } catch (err) {
      console.error("Error setting registration result:", err);
    } finally {
      setSavingRegResult(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsersList();
    } else if (activeTab === "analytics") {
      fetchRegistrationsList();
    }
  }, [activeTab]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserMessage("");
    try {
      const updates = {
        role: editRole,
        walletBalance: Number(editBalance),
        earnings: Number(editEarnings),
        verified: editVerified,
        banned: editBanned,
        badges: editBadges
      };
      await dbAdminUpdateUserProfile(editingUser.uid, updates);
      setUserMessage(`🎉 Account for ${editingUser.username} updated!`);
      setAllUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, ...updates } : u));
      setEditingUser(null);
    } catch (err: any) {
      setUserMessage(`⚠️ Save Error: ${err.message}`);
    }
  };

  const handleToggleUserBan = async (user: UserProfile) => {
    setUserMessage("");
    const newBannedState = !user.banned;
    try {
      await dbAdminUpdateUserProfile(user.uid, { banned: newBannedState });
      setUserMessage(`🎉 Banned state for ${user.username} set to ${newBannedState ? "BANNED" : "ACTIVE"}`);
      setAllUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, banned: newBannedState } : u));
    } catch (err: any) {
      setUserMessage(`⚠️ Failed to update ban status: ${err.message}`);
    }
  };

  const handleToggleUserVerification = async (user: UserProfile) => {
    setUserMessage("");
    const newVerifiedState = !user.verified;
    try {
      await dbAdminUpdateUserProfile(user.uid, { verified: newVerifiedState });
      setUserMessage(`🎉 Verification for ${user.username} set to ${newVerifiedState ? "VERIFIED" : "UNVERIFIED"}`);
      setAllUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, verified: newVerifiedState } : u));
    } catch (err: any) {
      setUserMessage(`⚠️ Failed to update verification: ${err.message}`);
    }
  };

  // Submission handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      setStatusMsg("⚠️ Please enter Title and Launch Date");
      return;
    }

    setSavingEvent(true);
    setStatusMsg("");

    try {
      const eId = "EVT-" + Math.floor(100000 + Math.random() * 900000);
      const newEvt: TournamentEvent = {
        id: eId,
        title,
        game,
        description,
        fee: Number(fee),
        prizePool: Number(prizePool),
        date,
        status: "upcoming",
        maxParticipants: Number(maxParticipants),
        slotsFilled: 0,
        rules,
        firstPrize: Number(firstPrize),
        secondPrize: Number(secondPrize),
        thirdPrize: Number(thirdPrize),
        duration: duration || "2h 30m",
        mapPool: mapPoolInput.split(",").map(m => m.trim()).filter(m => m.length > 0),
        createdAt: new Date().toISOString()
      };

      await dbAddEvent(newEvt);

      // Try sending a Discord notice if webhook is configured
      if (discordWebhook) {
        await fetch("/api/discord-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webhookUrl: discordWebhook,
            title,
            game,
            prizePool: Number(prizePool),
            entryFee: Number(fee),
            date: date
          })
        });
      }

      setStatusMsg("🎉 Event created successfully & Discord alert dispatched!");
      setTitle("");
      setDescription("");
      setDuration("2h 30m");
      // Reset map pool to default
      const g = game.toLowerCase();
      if (g.includes("bgmi") || g.includes("pubg") || g.includes("battlegrounds")) {
        setMapPoolInput("Erangel, Miramar, Sanhok, Vikendi");
      } else if (g.includes("valorant")) {
        setMapPoolInput("Bind, Ascent, Haven, Split, Icebox");
      } else {
        setMapPoolInput("Bermuda, Kalahari, Purgatory, Alpine");
      }
      await onRefreshEvents();
    } catch (err: any) {
      setStatusMsg(`⚠️ Error: ${err.message}`);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleUpdateStatus = async (eventId: string) => {
    if (!eventId) return;
    setUpdatingStatus(true);
    try {
      const isCompleted = newStatus === "completed";
      const updates: Partial<TournamentEvent> = {
        status: newStatus
      };
      if (isCompleted && winnerName) {
        updates.winners = winnerName;
      }
      
      await dbUpdateEvent(eventId, updates);

      // Trigger discord match update alert!
      if (discordWebhook) {
        const stateWord = newStatus === "live" ? "🔥 MATCH HAS STARTED LIVE!" : "🏁 TOURNAMENT COMPLETED!";
        const alertBody = isCompleted 
          ? `Status update: ${stateWord} Winners declared as: ${winnerName || "Standout Gamers"}!`
          : `Status update: ${stateWord} Join lobby room channels on our board!`;

        await fetch("/api/discord-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webhookUrl: discordWebhook,
            title: events.find(e => e.id === eventId)?.title || "Esports Match",
            message: alertBody
          })
        });
      }

      setWinnerName("");
      setTargetEventId("");
      await onRefreshEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Withdraw approvals
  const handleWithdrawAction = async (requestId: string, status: "approved" | "rejected", userId: string, amount: number) => {
    try {
      await dbProcessWithdrawal(requestId, status, userId, amount);
      await onRefreshWithdrawals();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gaming-pink/10 text-gaming-pink animate-pulse">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-md font-display font-bold text-white tracking-tight uppercase">ORGANIZER PORTAL & ADMIN PANEL</h2>
            <p className="text-xs text-gray-400">Manage tournament schedules, distribute gaming prize pools, approve player cashouts, and moderate community rosters</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await onRefreshEvents();
            await onRefreshWithdrawals();
            if (activeTab === "users") {
              await fetchUsersList();
            } else if (activeTab === "analytics") {
              await fetchRegistrationsList();
            }
          }}
          className="p-2 px-3.5 rounded-lg bg-gaming-bg hover:bg-gaming-border border border-gaming-border flex items-center gap-1.5 text-xs text-gray-300 transition cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <RefreshCw className="h-3.5 w-3.5" /> REFRESH DATA
        </button>
      </div>

      {/* View Toggle */}
      <div className="grid grid-cols-2 p-1 bg-[#0E1119] border border-gaming-border rounded-xl">
        <button
          onClick={() => {
            setAdminModeTab("tournaments");
            setActiveTab("events");
          }}
          className={`py-3 px-4 rounded-lg text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            adminModeTab === "tournaments"
              ? "bg-gradient-to-r from-gaming-blue to-indigo-600 text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-gaming-bg/50"
          }`}
        >
          🏆 Tournament Suite View
        </button>
        <button
          onClick={() => {
            setAdminModeTab("player_moderation");
            setActiveTab("users");
            fetchUsersList();
          }}
          className={`py-3 px-4 rounded-lg text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            adminModeTab === "player_moderation"
              ? "bg-gradient-to-r from-gaming-pink to-rose-600 text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-gaming-bg/50"
          }`}
        >
          🛡️ Player Moderation View
        </button>
      </div>

      {/* Admin Tab Control links */}
      {adminModeTab === "tournaments" && (
        <div className="flex flex-wrap gap-1 bg-[#12161F] p-1 rounded-lg border border-gaming-border">
          <button
            onClick={() => {
              setActiveTab("events");
              setUserMessage("");
            }}
            className={`py-2 px-4 rounded-md text-xs font-bold font-display uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "events"
                ? "bg-gaming-blue text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🏆 Tournament Settings
          </button>

          <button
            onClick={() => {
              setActiveTab("withdrawals");
              setUserMessage("");
            }}
            className={`py-2 px-4 rounded-md text-xs font-bold font-display uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === "withdrawals"
                ? "bg-gaming-blue text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            💰 Pending Withdrawals
            {withdrawalRequests.filter(w => w.status === "pending").length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-gaming-pink text-white font-mono font-bold animate-pulse">
                {withdrawalRequests.filter(w => w.status === "pending").length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("analytics");
              fetchRegistrationsList();
            }}
            className={`py-2 px-4 rounded-md text-xs font-bold font-display uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "analytics"
                ? "bg-gaming-blue text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📈 Analytics & Trends
          </button>
        </div>
      )}

      {/* 1. TOURNAMENTS TAB */}
      {activeTab === "events" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Side: Create Event */}
          <div className="lg:col-span-12 xl:col-span-5 bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-md">
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider mb-4 border-b border-gaming-border/60 pb-2 flex items-center gap-1.5 text-gaming-blue">
              <Plus className="h-4 w-4" /> PUBLISH NEW TOURNAMENT
            </h3>

            {statusMsg && (
              <div className="bg-[#12161F] border border-gaming-neon/30 text-gaming-neon p-3 rounded-lg text-xs font-semibold mb-4 text-center">
                {statusMsg}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Tournament Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Call of Duty Mobile War"
                  className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Esports Game</label>
                  <select
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65"
                  >
                    <option value="BGMI (Battlegrounds Mobile India)">BGMI (PUBG Mobile)</option>
                    <option value="Valorant (PC)">Valorant</option>
                    <option value="Free Fire">Free Fire</option>
                    <option value="Call of Duty Mobile">Call of Duty Mobile</option>
                    <option value="GTA V Roleplay">GTA V Roleplay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Launch Match Date</label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Expected Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 2h 30m"
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Entry Fee (Coins)</label>
                  <input
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono font-medium">Prize Pool (Coins)</label>
                  <input
                    type="number"
                    value={prizePool}
                    onChange={(e) => setPrizePool(Math.max(100, Number(e.target.value)))}
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono font-medium">Max Brackets</label>
                  <input
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Math.max(2, Number(e.target.value)))}
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 text-center font-mono"
                  />
                </div>
              </div>

              {/* Tiered Prizes Custom Split */}
              <div className="bg-black/20 p-3 rounded-lg border border-gaming-border/60 space-y-2">
                <div className="text-[9px] font-black font-mono text-gaming-neon uppercase tracking-wider">
                  Tiered Rewards Split Configuration (Live Auto-calculation with override)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-amber-400 uppercase mb-1 font-mono">👑 1st Rank (Coins)</label>
                    <input
                      type="number"
                      value={firstPrize}
                      onChange={(e) => setFirstPrize(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#0E1119] border border-gaming-border/80 rounded py-1.5 px-2 text-[11px] text-white focus:outline-none focus:border-amber-450/40 text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-350 uppercase mb-1 font-mono">🥈 2nd Rank (Coins)</label>
                    <input
                      type="number"
                      value={secondPrize}
                      onChange={(e) => setSecondPrize(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#0E1119] border border-gaming-border/80 rounded py-1.5 px-2 text-[11px] text-white focus:outline-none focus:border-slate-350/40 text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-amber-600 uppercase mb-1 font-mono">🥉 3rd Rank (Coins)</label>
                    <input
                      type="number"
                      value={thirdPrize}
                      onChange={(e) => setThirdPrize(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#0E1119] border border-gaming-border/80 rounded py-1.5 px-2 text-[11px] text-white focus:outline-none focus:border-amber-650/40 text-center font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Short Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Escrow cash distribution, lobby room setup etc..."
                  className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 bg-[#12161F]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Map Pool (Comma-separated list)</label>
                <input
                  type="text"
                  value={mapPoolInput}
                  onChange={(e) => setMapPoolInput(e.target.value)}
                  placeholder="e.g. Erangel, Miramar, Sanhok"
                  className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 font-mono bg-[#12161F]"
                />
                <span className="text-[9px] text-gray-500 mt-0.5 block font-sans">
                  Default maps are auto-selected for standard games but can be overridden.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Match Rules & Guidelines</label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  rows={2}
                  className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 font-mono bg-[#12161F]"
                />
              </div>

              <button
                type="submit"
                disabled={savingEvent}
                className="w-full py-2 bg-gaming-blue font-display text-xs font-bold text-white rounded-lg hover:opacity-90 active:scale-97 transition cursor-pointer"
              >
                {savingEvent ? "SAVING..." : "PUBLISH TOURNAMENT"}
              </button>
            </form>
          </div>

          {/* Right Side: Manage Brackets */}
          <div className="lg:col-span-12 xl:col-span-7">
            <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-md h-full flex flex-col">
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider mb-4 border-b border-gaming-border/60 pb-2 flex items-center gap-1.5 text-gaming-pink">
                <Layers className="h-4 w-4" /> TOURNAMENT STATUS & ACTIVE BRACKETS
              </h3>

              {events.length === 0 ? (
                <p className="text-xs text-gray-400 py-12 text-center my-auto">No tournaments published yet to configure.</p>
              ) : (
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[500px]">
                  {events.map((evt) => (
                    <div key={evt.id} className="p-3.5 rounded-lg bg-gaming-bg border border-gaming-border flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <div className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                          {evt.title}
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans uppercase ${
                            evt.status === "live"
                              ? "bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse"
                              : evt.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          }`}>
                            {evt.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">Game Category: {evt.game}</div>
                        <div className="flex gap-4 mt-2">
                          <span className="text-[10px] text-gray-450 font-mono">Entry: <strong className="text-white">🪙 {evt.fee}</strong></span>
                          <span className="text-[10px] text-gray-450 font-mono">Prize: <strong className="text-gaming-neon">🪙 {evt.prizePool}</strong></span>
                          <span className="text-[10px] text-gray-450 font-mono">Slots: <strong className="text-white">{evt.slotsFilled}/{evt.maxParticipants}</strong></span>
                        </div>
                        {evt.winners && (
                          <div className="text-[10px] text-gaming-neon bg-gaming-neon/5 border border-gaming-neon/20 px-2 py-0.5 mt-2 rounded font-mono inline-block">
                            🏆 Declared Winner: {evt.winners}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {targetEventId === evt.id ? (
                          <div className="flex flex-col gap-1.5 bg-gaming-card p-2.5 rounded border border-gaming-border">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-mono uppercase text-gray-450">Set Match Status</label>
                              <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as any)}
                                className="bg-gaming-bg text-[10px] text-white border border-gaming-border p-1 rounded font-mono"
                              >
                                <option value="upcoming">Upcoming</option>
                                <option value="live">Live</option>
                                <option value="completed">Completed</option>
                              </select>

                              {newStatus === "completed" && (
                                <>
                                  <label className="text-[9px] font-mono uppercase text-gray-450 mt-1">Declare Winner Name</label>
                                  <input
                                    type="text"
                                    value={winnerName}
                                    onChange={(e) => setWinnerName(e.target.value)}
                                    placeholder="e.g. SlayerClan"
                                    className="bg-gaming-bg text-[10px] text-white border border-gaming-border p-1 rounded font-mono w-40"
                                  />
                                </>
                              )}
                            </div>

                            <div className="flex gap-1 justify-end mt-2">
                              <button
                                type="button"
                                onClick={() => setTargetEventId("")}
                                className="p-1 px-2.5 rounded bg-gaming-bg border border-gaming-border text-[9px] text-gray-400 font-bold"
                              >
                                CANCEL
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(evt.id)}
                                className="p-1 px-3.5 rounded bg-gaming-neon text-white text-[9px] font-bold shadow hover:opacity-90"
                              >
                                APPLY
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetEventId(evt.id);
                              setNewStatus(evt.status);
                              setWinnerName(evt.winners || "");
                            }}
                            className="px-3 py-1.5 rounded bg-gaming-border hover:bg-gaming-pink hover:text-white transition text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                          >
                            CHANGE STATUS
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. WITHDRAWALS TAB */}
      {activeTab === "withdrawals" && (
        <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-gaming-border/60 pb-3 mb-4">
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-gaming-neon">
              <Award className="h-4 w-4" /> CASHOUTS SECURE CLEARING
            </h3>
            <span className="text-[10px] text-gray-450 font-mono">
              Pending: {withdrawalRequests.filter(w => w.status === "pending").length} requests
            </span>
          </div>

          {withdrawalRequests.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-xs text-gray-400 font-mono">No withdraw cashout claims found in system.</p>
              <p className="text-[11px] text-gray-500">Players can request custom withdrawals from their dashboard profiles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
              {withdrawalRequests.map((req) => (
                <div key={req.id} className="p-4 bg-gaming-bg border border-gaming-border rounded-lg flex flex-col justify-between gap-3.5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 h-1.5 w-1.5 bg-gaming-pink rounded-bl"></div>
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          <span className="text-gray-450 font-mono">Player:</span>
                          <strong className="text-gaming-blue">{req.username}</strong>
                        </div>
                        <div className="text-[9px] text-gray-500 font-mono mt-0.5">UID: {req.userId}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-gaming-neon block">🪙 {req.amount}</span>
                        <span className="text-[9px] text-gray-500 font-mono">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-[#12161F] border border-gaming-border rounded text-[11px] font-mono flex flex-col gap-1 text-slate-300">
                      <div><span className="text-gray-500">UPI ID/Address:</span> {req.upi}</div>
                      <div><span className="text-gray-500">Processing ID:</span> {req.id}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gaming-border/50 pt-3">
                    <span className="text-[9px] font-mono text-gray-400">
                      CURRENT STATE: <strong className="capitalize text-white">{req.status}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {req.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleWithdrawAction(req.id, "rejected", req.userId, req.amount)}
                            className="p-1 px-3 rounded bg-gaming-pink/10 hover:bg-gaming-pink hover:text-white text-gaming-pink transition text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="h-3 w-3" /> REJECT
                          </button>
                          <button
                            onClick={() => handleWithdrawAction(req.id, "approved", req.userId, req.amount)}
                            className="p-1 px-3 rounded bg-gaming-neon/10 hover:bg-gaming-neon hover:text-white text-gaming-neon transition text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="h-3 w-3" /> APPROVE
                          </button>
                        </>
                      ) : (
                        <div className={`p-1 px-3 rounded text-[10px] font-bold uppercase tracking-wider ${
                          req.status === "approved"
                            ? "bg-gaming-neon/10 text-gaming-neon border border-gaming-neon/20"
                            : "bg-gaming-pink/10 text-gaming-pink border border-gaming-pink/20"
                        }`}>
                          {req.status}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. PLAYERS DIRECTORY TAB */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {userMessage && (
            <div className="bg-[#12161F] border border-gaming-blue/30 text-gaming-blue p-3.5 rounded-lg text-xs font-semibold text-center animate-pulse">
              {userMessage}
            </div>
          )}

          {editingUser ? (
            /* Editing single gamer profile details */
            <div className="bg-gaming-card border border-gaming-border rounded-xl p-6 shadow-md max-w-xl mx-auto">
              <div className="flex items-center justify-between border-b border-gaming-border/60 pb-3 mb-5">
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-gaming-blue">
                  <UserCheck className="h-5 w-5" /> MODERATE USER: {editingUser.username}
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 hover:bg-gaming-border rounded text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="flex items-center gap-4 bg-gaming-bg p-3 rounded border border-gaming-border">
                  <img
                    src={editingUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${editingUser.username}`}
                    alt="avatar"
                    className="h-12 w-12 rounded bg-[#12161F]"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{editingUser.username}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{editingUser.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Platform Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65"
                    >
                      <option value="user">User (Standard Gamer)</option>
                      <option value="admin">Admin (Organizer)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center gap-2 mt-4 pl-2">
                    <label className="flex items-center gap-2 text-xs text-gray-300 font-mono select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editVerified}
                        onChange={(e) => setEditVerified(e.target.checked)}
                        className="rounded border-gaming-border bg-gaming-bg text-gaming-blue focus:ring-0 focus:ring-offset-0 h-4.5 w-4.5"
                      />
                      <span>Verified Gamer Badge</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-red-500 font-mono select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editBanned}
                        onChange={(e) => setEditBanned(e.target.checked)}
                        className="rounded border-gaming-border bg-gaming-bg text-red-500 focus:ring-0 focus:ring-offset-0 h-4.5 w-4.5"
                      />
                      <span className="font-bold">Banned / Suspended</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Wallet Coins Balance (Coins)</label>
                    <div className="relative">
                      <Coins className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-500" />
                      <input
                        type="number"
                        value={editBalance || 0}
                        onChange={(e) => setEditBalance(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-mono">Total Esports Earnings (Coins)</label>
                    <div className="relative">
                      <DollarSign className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-500" />
                      <input
                        type="number"
                        value={editEarnings || 0}
                        onChange={(e) => setEditEarnings(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-gaming-blue/65 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#12161F] p-4 rounded-xl border border-gaming-border/80 space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase font-mono tracking-wider">ESPORTS ELITE HONOR BADGES</label>
                  <p className="text-[10px] text-gray-500 font-sans">Tap to decorate this profile with official tournament achievements. These are immediately visible on their Gamer Passports!</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Aim God", "Clutch Master", "Rampage Killer", "Tactical Brain", "Esports Star", "Fair Player"].map((badge) => {
                      const isActive = editBadges.includes(badge);
                      return (
                        <button
                          key={badge}
                          type="button"
                          onClick={() => {
                            setEditBadges(prev =>
                              prev.includes(badge) ? prev.filter(b => b !== badge) : [...prev, badge]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition duration-200 cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? "bg-gaming-blue/20 border-gaming-blue text-white shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                              : "bg-gaming-bg/60 border-gaming-border text-gray-400 hover:text-white hover:border-gaming-blue/30"
                          }`}
                        >
                          {isActive && <Check className="h-3 w-3 text-gaming-neon" />}
                          {badge}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-2 rounded bg-gaming-bg text-gray-400 border border-gaming-border text-xs font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded bg-gaming-blue text-white text-xs font-bold shadow hover:opacity-90"
                  >
                    SAVE CHANGES
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Listing all platform users */
            <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-gaming-border/60">
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-gaming-blue">
                  <Users className="h-4 w-4" /> PLAYERS REGISTRY ({allUsers.length})
                </h3>

                <div className="relative min-w-[200px] sm:min-w-[255px]">
                  <Search className="h-3.5 w-3.5 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search gamers by ID or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gaming-bg border border-gaming-border rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 font-mono w-full focus:outline-none focus:border-gaming-blue/60"
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <RefreshCw className="h-7 w-7 animate-spin text-gaming-blue" />
                  <p className="text-xs text-gray-400 font-mono">SYNCING WITH USER PROFILES DATABASE...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-gaming-border/80 text-[10px] font-bold text-gray-450 uppercase tracking-wider font-mono">
                        <th className="py-2.5 px-3">Gamer</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3 text-center">Gamer Badge (Instant Verification)</th>
                        <th className="py-2.5 px-3 text-center">Ban Status (Instant Ban Control)</th>
                        <th className="py-2.5 px-3 text-center">Platform Role</th>
                        <th className="py-2.5 px-3 text-right">Coins Wallet</th>
                        <th className="py-2.5 px-3 text-right">Esports Gains</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gaming-border/40 font-mono">
                      {allUsers
                        .filter(u => 
                          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((user) => (
                          <tr key={user.uid} className={`hover:bg-gaming-bg/40 transition-all ${user.banned ? 'bg-red-500/5 hover:bg-red-500/10 border-l-2 border-red-500' : ''}`}>
                            <td className="py-3 px-3 flex items-center gap-2 text-white font-bold font-sans">
                              <img
                                src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                                alt="avatar"
                                className="h-7 w-7 rounded bg-[#12161F]"
                              />
                              <div className="flex flex-col">
                                <span className={user.banned ? "line-through text-gray-400" : ""}>{user.username}</span>
                                {user.banned && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest font-mono">🚫 SUSPENDED</span>}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-gray-400 max-w-[150px] truncate" title={user.email}>{user.email}</td>
                            
                            {/* Verification status toggle */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleUserVerification(user)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 mx-auto cursor-pointer ${
                                  user.verified
                                    ? "bg-gaming-neon/10 text-gaming-neon border border-gaming-neon/25 hover:bg-gaming-neon hover:text-black"
                                    : "bg-gray-500/10 text-gray-500 border border-gray-500/20 hover:bg-gaming-neon hover:text-black hover:border-transparent"
                                }`}
                                title="Click to instantly toggle verification status"
                              >
                                {user.verified ? "✓ Verified" : "Unverified"}
                              </button>
                            </td>

                            {/* Ban status toggle */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleUserBan(user)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider transition-all flex items-center gap-1 mx-auto cursor-pointer ${
                                  user.banned
                                    ? "bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/25"
                                    : "bg-gray-500/10 text-gray-500 border border-gray-500/20 hover:bg-red-500 hover:text-white"
                                }`}
                                title={user.banned ? "Click to pardon and lift ban" : "Click to instantly ban user"}
                              >
                                {user.banned ? "🚫 Banned" : "🟢 Active"}
                              </button>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {user.role === "admin" ? (
                                <span className="inline-flex items-center gap-1 font-bold text-[9px] px-2 py-0.2 bg-gaming-pink/10 text-gaming-pink border border-gaming-pink/20 rounded">
                                  🛡️ ADMIN
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[10px]">GAMER</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right text-white">🪙 {user.walletBalance ?? 0}</td>
                            <td className="py-3 px-3 text-right text-gaming-neon font-black">🪙 {user.earnings ?? 0}</td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditRole(user.role as any || "user");
                                  setEditBalance(user.walletBalance ?? 0);
                                  setEditEarnings(user.earnings ?? 0);
                                  setEditVerified(user.verified || false);
                                  setEditBanned(user.banned || false);
                                  setEditBadges(user.badges || []);
                                }}
                                className="px-2 py-1 rounded bg-gaming-border text-gray-300 hover:text-white hover:bg-gaming-blue transition text-[10px]"
                              >
                                EDIT
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {allUsers.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-8 font-mono">No users found registered in this database instance.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. ANALYTICS & TRENDS TAB Panel */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Status and Mode Switch */}
          <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-gaming-blue" />
                DASHBOARD METRICS & TRENDS (LAST 30 DAYS)
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Real-time tracking of gamer signups, entry fees, and registration milestones across the ecosystem.
              </p>
            </div>
            <div className="flex items-center gap-3 self-stretch md:self-auto justify-between bg-gaming-bg border border-gaming-border p-1.5 rounded-lg font-mono text-[10px]">
              <span className="font-bold text-gray-400 uppercase pl-2">Data Stream Mode:</span>
              <button
                type="button"
                onClick={() => setUseHistoricSimulation(!useHistoricSimulation)}
                className={`py-1 px-3 font-bold rounded cursor-pointer uppercase tracking-wider transition ${
                  useHistoricSimulation 
                    ? "bg-gaming-pink text-white shadow-sm" 
                    : "bg-gaming-blue text-white shadow-sm"
                }`}
              >
                {useHistoricSimulation ? "🧪 Sandbox Simulation" : "📡 Live DB Only"}
              </button>
            </div>
          </div>

          {/* Key Indicators Rows (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gaming-card border border-gaming-border p-4 rounded-xl shadow">
              <p className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider">Total Registrations</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-display text-white text-glow-blue">
                  {((registrations.length === 0 && useHistoricSimulation)
                    ? Array.from({ length: 30 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (29 - i));
                        const dateStr = d.toISOString().split("T")[0];
                        const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                        const baseVal = dayOfWeek === 6 || dayOfWeek === 0 ? 15 : 6;
                        const seedVariance = (i * 11) % 7;
                        return baseVal + seedVariance;
                      }).reduce((sum, curr) => sum + curr, 0)
                    : registrations.length
                  )}
                </span>
                <span className="text-[10px] font-mono text-gaming-neon font-bold">+12.4%</span>
              </div>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">Cumulative client slots claimed</p>
            </div>

            <div className="bg-gaming-card border border-gaming-border p-4 rounded-xl shadow">
              <p className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider">Daily Average Slots</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-display text-white">
                  {(((registrations.length === 0 && useHistoricSimulation)
                    ? Array.from({ length: 30 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (29 - i));
                        const dateStr = d.toISOString().split("T")[0];
                        const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                        const baseVal = dayOfWeek === 6 || dayOfWeek === 0 ? 15 : 6;
                        const seedVariance = (i * 11) % 7;
                        return baseVal + seedVariance;
                      }).reduce((sum, curr) => sum + curr, 0)
                    : registrations.length) / 30).toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-gray-400">slots / day</span>
              </div>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">Average tournament intake rate</p>
            </div>

            <div className="bg-gaming-card border border-gaming-border p-4 rounded-xl shadow">
              <p className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider">Peak Intake / Day</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-display text-white">
                  {((registrations.length === 0 && useHistoricSimulation)
                    ? Math.max(...Array.from({ length: 30 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (29 - i));
                        const dateStr = d.toISOString().split("T")[0];
                        const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                        const baseVal = dayOfWeek === 6 || dayOfWeek === 0 ? 15 : 6;
                        const seedVariance = (i * 11) % 7;
                        return baseVal + seedVariance;
                      }))
                    : Math.max(...Array.from({ length: 30 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (29 - i));
                        const dateStr = d.toISOString().split("T")[0];
                        return registrations.filter(r => r.createdAt && r.createdAt.substring(0, 10) === dateStr).length;
                      }), 0)
                  )}
                </span>
                <span className="text-[10px] font-mono text-gaming-pink font-bold">Intense</span>
              </div>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">Highest registrees in 24 hrs</p>
            </div>

            <div className="bg-gaming-card border border-gaming-border p-4 rounded-xl shadow">
              <p className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider">Est. Ecosystem Fees</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-display text-gaming-neon">
                  🪙 {((registrations.length === 0 && useHistoricSimulation)
                    ? Array.from({ length: 30 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (29 - i));
                        const dateStr = d.toISOString().split("T")[0];
                        const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                        const baseVal = dayOfWeek === 6 || dayOfWeek === 0 ? 15 : 6;
                        const seedVariance = (i * 11) % 7;
                        return baseVal + seedVariance;
                      }).reduce((sum, curr) => sum + curr, 0) * 150
                    : registrations.reduce((sum, r) => {
                        const ev = events.find(e => e.id === r.eventId);
                        return sum + (ev?.fee || 0);
                      }, 0)
                  )}
                </span>
                <span className="text-[10px] font-mono text-gray-400">Coins</span>
              </div>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">Aggregate pool funds in escrow</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 30-Day Area Chart Column */}
            <div className="lg:col-span-8 bg-gaming-card border border-gaming-border rounded-xl p-5 shadow">
              <div className="flex items-center justify-between mb-4 border-b border-gaming-border pb-3">
                <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-gaming-blue" />
                  30-DAY TOURNAMENT INTENSITY CURVE
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-gaming-bg border border-gaming-border rounded-full text-gray-400">
                  Daily Player Registrations
                </span>
              </div>

              {loadingRegs ? (
                <div className="h-72 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-gaming-blue" />
                  <p className="text-xs font-mono text-gray-400">CALCULATING COORDINATES...</p>
                </div>
              ) : (
                <div className="h-72 w-full text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={Array.from({ length: 30 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (29 - i));
                        const dateStr = d.toISOString().split("T")[0];
                        
                        let total = 0;
                        if (registrations.length === 0 && useHistoricSimulation) {
                          const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                          const baseVal = dayOfWeek === 6 || dayOfWeek === 0 ? 15 : 6;
                          const seedVariance = (i * 11) % 7;
                          total = baseVal + seedVariance;
                        } else {
                          total = registrations.filter(r => r.createdAt && r.createdAt.substring(0, 10) === dateStr).length;
                        }

                        let displayLabel = "";
                        try {
                          const split = dateStr.split("-");
                          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                          const mIdx = parseInt(split[1], 10) - 1;
                          displayLabel = `${monthNames[mIdx]} ${parseInt(split[2], 10)}`;
                        } catch {
                          displayLabel = dateStr;
                        }

                        return {
                          label: displayLabel,
                          total: total
                        };
                      })} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#12161F",
                          borderColor: "#1e293b",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontFamily: "monospace",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        name="New Signups"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Game shares Column */}
            <div className="lg:col-span-4 bg-gaming-card border border-gaming-border rounded-xl p-5 shadow flex flex-col justify-between">
              <div className="mb-4 border-b border-gaming-border pb-3">
                <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4 text-gaming-pink" />
                  ESTIMATED GAME CAPTURE SHARE
                </h3>
              </div>

              {loadingRegs ? (
                <div className="h-56 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-gaming-blue" />
                </div>
              ) : (registrations.length === 0 && !useHistoricSimulation) ? (
                <div className="h-56 flex flex-col items-center justify-center text-center space-y-2">
                  <PieIcon className="h-8 w-8 text-gray-600" />
                  <p className="text-xs font-mono text-gray-550">NO REGISTRATION DATA RECORDED YET</p>
                  <p className="text-[10px] text-gray-500 max-w-[200px]">Turn on the Sandbox switch above to view realistic live simulated data trees!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Miniature progress-bar representation / list */}
                  <div className="space-y-3 font-semibold font-mono text-[10px]">
                    {[
                      "BGMI (Battlegrounds Mobile India)",
                      "Valorant (PC)",
                      "Free Fire",
                      "Call of Duty Mobile",
                      "GTA V Roleplay"
                    ].map(gFullName => {
                      let count = 0;
                      if (registrations.length === 0 && useHistoricSimulation) {
                        // Deterministic distribution ratios
                        const totalSim = Array.from({ length: 30 }, (_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (29 - i));
                          const dateStr = d.toISOString().split("T")[0];
                          const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                          const baseVal = dayOfWeek === 6 || dayOfWeek === 0 ? 15 : 6;
                          const seedVariance = (i * 11) % 7;
                          return baseVal + seedVariance;
                        }).reduce((sum, curr) => sum + curr, 0);

                        const ratio = gFullName.startsWith("BGMI") ? 0.4 : gFullName.startsWith("Valorant") ? 0.3 : gFullName.startsWith("Free Fire") ? 0.15 : gFullName.startsWith("Call of Duty") ? 0.1 : 0.05;
                        count = Math.round(totalSim * ratio);
                      } else {
                        count = registrations.filter(r => {
                          const ev = events.find(e => e.id === r.eventId);
                          return (ev?.game || "Valorant (PC)") === gFullName;
                        }).length;
                      }

                      const shortName = gFullName.startsWith("BGMI") ? "BGMI" : gFullName.startsWith("Valorant") ? "Valorant" : gFullName.startsWith("Free Fire") ? "Free Fire" : gFullName.startsWith("Call of Duty") ? "COD Mobile" : "GTA V RP";
                      const GAME_COLORS: Record<string, string> = {
                        "BGMI (Battlegrounds Mobile India)": "#6366f1",
                        "Valorant (PC)": "#ef4444",
                        "Free Fire": "#f59e0b",
                        "Call of Duty Mobile": "#3b82f6",
                        "GTA V Roleplay": "#10b981"
                      };
                      const finalColor = GAME_COLORS[gFullName] || "#6366f1";
                      
                      const totalCountForAllGames = (registrations.length === 0 && useHistoricSimulation)
                        ? Array.from({ length: 30 }, (_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() - (29 - i));
                            const dateStr = d.toISOString().split("T")[0];
                            const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                            const baseVal = dayOfWeek === 6 || dayOfWeek === 0 ? 15 : 6;
                            const seedVariance = (i * 11) % 7;
                            return baseVal + seedVariance;
                          }).reduce((sum, curr) => sum + curr, 0)
                        : registrations.length;

                      const percent = totalCountForAllGames > 0 ? ((count / totalCountForAllGames) * 100).toFixed(1) : "0.0";

                      return (
                        <div key={gFullName} className="space-y-1">
                          <div className="flex items-center justify-between text-gray-300">
                            <span className="truncate max-w-[130px] sm:max-w-[180px] text-white">
                              🕹️ {shortName}
                            </span>
                            <span>
                              {count} entries ({percent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gaming-bg rounded-full overflow-hidden border border-gaming-border">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percent}%`, backgroundColor: finalColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recharts quick visual mini Bar Chart for game comparisons */}
                  <div className="h-20 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: "BGMI", value: (registrations.length === 0 && useHistoricSimulation) ? 40 : registrations.filter(r => events.find(e => e.id === r.eventId)?.game?.toLowerCase().includes("bgmi")).length },
                          { name: "Valorant", value: (registrations.length === 0 && useHistoricSimulation) ? 30 : registrations.filter(r => events.find(e => e.id === r.eventId)?.game?.toLowerCase().includes("val")).length },
                          { name: "Free Fire", value: (registrations.length === 0 && useHistoricSimulation) ? 15 : registrations.filter(r => events.find(e => e.id === r.eventId)?.game?.toLowerCase().includes("free")).length },
                          { name: "COD", value: (registrations.length === 0 && useHistoricSimulation) ? 10 : registrations.filter(r => events.find(e => e.id === r.eventId)?.game?.toLowerCase().includes("duty")).length },
                          { name: "GTA V", value: (registrations.length === 0 && useHistoricSimulation) ? 5 : registrations.filter(r => events.find(e => e.id === r.eventId)?.game?.toLowerCase().includes("gta")).length }
                        ]} 
                        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                      >
                        <XAxis dataKey="name" fontSize={7} stroke="#94a3b8" tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={7} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#12161F",
                            borderColor: "#1e293b",
                            borderRadius: "6px",
                            fontSize: "10px",
                            color: "#fff",
                            fontFamily: "monospace"
                          }}
                        />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                          <Cell fill="#6366f1" />
                          <Cell fill="#ef4444" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#10b981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Registrations audit table */}
          <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow">
            <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider mb-4 border-b border-gaming-border pb-3 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gaming-neon" />
              RECENT SYSTEM REGISTERED AUDIT ROSTER
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-gaming-border/80 text-[10px] font-bold text-gray-450 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Registration ID</th>
                    <th className="py-2.5 px-3">Gamer Name</th>
                    <th className="py-2.5 px-3">Target Tournament</th>
                    <th className="py-2.5 px-3">Squad/Team Tag</th>
                    <th className="py-2.5 px-3 text-center">Payment Status</th>
                    <th className="py-2.5 px-3">Rank Achieved</th>
                    <th className="py-2.5 px-3">Winnings</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gaming-border/30">
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-500 py-8 text-xs font-sans">
                        No custom live registrations found in Firestore database. Try signing up users or joining tournaments!
                      </td>
                    </tr>
                  ) : (
                    registrations.slice(0, 8).map((reg) => {
                      const evName = events.find(e => e.id === reg.eventId)?.title || "Tournament " + reg.eventId;
                      const isEditing = editingRegId === reg.id;
                      return (
                        <tr key={reg.id} className="hover:bg-gaming-bg/20 transition">
                          <td className="py-3 px-3 text-gaming-blue max-w-[124px] truncate" title={reg.id}>#{reg.id}</td>
                          <td className="py-3 px-3 text-white font-bold">
                            <div>{reg.username}</div>
                            {reg.inGameId && (
                              <div className="text-[10px] text-[#A5B4FC]/80 font-mono tracking-wider font-normal mt-0.5" title="In-Game ID">
                                ID: {reg.inGameId}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-300 font-medium font-sans truncate max-w-[160px]" title={evName}>{evName}</td>
                          <td className="py-3 px-3 text-gray-400">Team {reg.teamName || "N/A"}</td>
                          <td className="py-3 px-3 text-center">
                            {reg.paid ? (
                              <span className="inline-flex text-[9px] font-bold px-2 py-0.2 bg-gaming-neon/10 text-gaming-neon border border-gaming-neon/20 rounded">
                                ESCROW PAID
                              </span>
                            ) : (
                              <span className="inline-flex text-[9px] font-bold px-2 py-0.2 bg-gaming-pink/10 text-gaming-pink border border-gaming-pink/20 rounded">
                                ESCROW FREE
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input 
                                type="text"
                                value={editRankAchieved}
                                onChange={(e) => setEditRankAchieved(e.target.value)}
                                placeholder="e.g. 1st Place"
                                className="bg-[#0B0E14] border border-gaming-border text-xs px-2 py-1 rounded text-white w-28 focus:outline-none focus:border-gaming-blue"
                              />
                            ) : (
                              <span className="text-white font-semibold">{reg.rankAchieved || "—"}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input 
                                type="number"
                                value={editWinnings}
                                onChange={(e) => setEditWinnings(Number(e.target.value))}
                                className="bg-[#0B0E14] border border-gaming-border text-xs px-2 py-1 rounded text-white w-18 focus:outline-none focus:border-gaming-blue"
                              />
                            ) : (
                              <span className={reg.winnings ? "text-gaming-neon font-bold" : "text-gray-400"}>
                                {reg.winnings ? `🪙 ${reg.winnings.toLocaleString()}` : "🪙 0"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isEditing ? (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleSaveRegResult(reg.id)}
                                  disabled={savingRegResult}
                                  className="px-2 py-1 rounded text-[9px] font-bold bg-gaming-neon/15 hover:bg-gaming-neon/25 text-gaming-neon transition duration-200 cursor-pointer"
                                >
                                  {savingRegResult ? "SAVING" : "SAVE"}
                                </button>
                                <button
                                  onClick={() => setEditingRegId(null)}
                                  className="px-2 py-1 rounded text-[9px] font-bold bg-gaming-pink/15 hover:bg-gaming-pink/25 text-gaming-pink transition duration-200 cursor-pointer"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingRegId(reg.id);
                                  setEditRankAchieved(reg.rankAchieved || "");
                                  setEditWinnings(reg.winnings || 0);
                                }}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-gaming-blue/10 border border-gaming-blue/25 text-gaming-blue hover:bg-gaming-blue hover:text-white transition duration-200 cursor-pointer"
                              >
                                EDIT STANDING
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
