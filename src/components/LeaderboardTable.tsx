import React, { useState } from "react";
import { LeaderboardRank } from "../types";
import { Search, Trophy, ShieldCheck, Flame, Star, Medal, Skull, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface BoardProps {
  ranks: LeaderboardRank[];
  currentUserId?: string;
}

export default function LeaderboardTable({ ranks, currentUserId }: BoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "wins" | "earnings" | "kills" | "mvpPoints">("points");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");

  // Find highest kill count to assign dynamic MVP honors
  const maxKills = ranks.length > 0 ? Math.max(...ranks.map((r) => r.kills ?? 0)) : 0;

  // Filter and Sort ranks list
  const filteredRanks = ranks
    .filter((r) => r.username.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((r) => {
      if (selectedPlatform === "All") return true;
      return (r.platform || "PC") === selectedPlatform;
    })
    .filter((r) => {
      if (selectedRegion === "All") return true;
      return (r.region || "India") === selectedRegion;
    })
    .sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      return valB - valA;
    });

  // Medal indicator helper
  const getRankBadge = (pos: number) => {
    switch (pos) {
      case 1:
        return (
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Trophy className="h-4 w-4 fill-amber-500/20" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-300/20 text-slate-300 border border-slate-300/30">
            <Medal className="h-4 w-4" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-700/20 text-amber-700 border border-amber-700/30">
            <Medal className="h-4 w-4 text-amber-600" />
          </div>
        );
      default:
        return <span className="font-mono text-gray-500 text-xs pl-3.5 font-bold">#{pos}</span>;
    }
  };

  // Render Rank Up/Down/Unchanged indicators based on original seed previousRank VS dynamic calculation rank
  const renderRankTrend = (player: LeaderboardRank) => {
    const current = player.rank;
    const previous = player.previousRank;

    if (!previous || !current) {
      return (
        <span className="text-gray-600 text-[10px] w-5 flex justify-center font-bold" title="No preceding rank revision recorded">—</span>
      );
    }

    const diff = previous - current; // difference: e.g. was 4, now 2 = +2 (moved up!)
    
    if (diff > 0) {
      return (
        <div 
          className="flex items-center gap-0.5 text-emerald-400 text-[10px] font-mono font-bold w-5 shrink-0"
          title={`Rank enhanced by +${diff} ${diff === 1 ? 'place' : 'places'} since last snapshot update`}
        >
          <ArrowUp className="h-3 w-3 text-emerald-400 animate-bounce" />
          <span>{diff}</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div 
          className="flex items-center gap-0.5 text-rose-500 text-[10px] font-mono font-bold w-5 shrink-0"
          title={`Rank slipped by ${diff} ${Math.abs(diff) === 1 ? 'place' : 'places'} since last snapshot update`}
        >
          <ArrowDown className="h-3 w-3 text-rose-500" />
          <span>{Math.abs(diff)}</span>
        </div>
      );
    } else {
      return (
        <div 
          className="flex items-center justify-center text-gray-500 text-[10px] w-5 shrink-0"
          title="Rank sustained steady since last checklist update"
        >
          <Minus className="h-3 w-3 text-gray-550" />
        </div>
      );
    }
  };

  return (
    <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-display font-bold text-white tracking-tight uppercase flex items-center gap-2">
            <Flame className="h-5 w-5 text-gaming-pink fill-gaming-pink/10 animate-pulse" /> GLOBAL LEADERBOARD
          </h2>
          <p className="text-xs text-gray-400">Track elite pro-players, clans, tournament standouts, and earnings totals</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Player alias..."
            className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-gaming-blue/60 transition"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
        </div>
      </div>

      {/* Filtering Options Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 p-3.5 bg-gaming-bg/60 border border-gaming-border/60 rounded-xl">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 font-mono tracking-wider">
            📶 Filter Platform
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {["All", "PC", "Mobile", "Console"].map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`py-1 px-3 rounded-md text-[10px] font-bold font-mono tracking-wider transition cursor-pointer select-none uppercase border ${
                  selectedPlatform === plat
                    ? "bg-gaming-blue/15 text-gaming-blue border-gaming-blue/50"
                    : "bg-[#090b11] text-gray-400 border-gaming-border hover:bg-[#121622] hover:text-white"
                }`}
              >
                {plat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 font-mono tracking-wider">
            🌍 Geographical Regions
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {["All", "India", "Global"].map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`py-1 px-3 rounded-md text-[10px] font-bold font-mono tracking-wider transition cursor-pointer select-none uppercase border ${
                  selectedRegion === reg
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/50"
                    : "bg-[#090b11] text-gray-400 border-gaming-border hover:bg-[#121622] hover:text-white"
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sorting Tabs bar */}
      <div className="flex gap-1 bg-gaming-bg p-1 rounded-lg border border-gaming-border mb-4 max-w-xl overflow-x-auto">
        <button
          onClick={() => setSortBy("points")}
          className={`flex-y py-1.5 px-3 rounded-md text-[10px] sm:text-xs font-bold font-display transition cursor-pointer ${
            sortBy === "points"
              ? "bg-gaming-blue text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          BY PTS
        </button>
        <button
          onClick={() => setSortBy("mvpPoints")}
          className={`flex-y py-1.5 px-3 rounded-md text-[10px] sm:text-xs font-bold font-display transition cursor-pointer whitespace-nowrap ${
            sortBy === "mvpPoints"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          🏆 MVP PTS
        </button>
        <button
          onClick={() => setSortBy("kills")}
          className={`flex-y py-1.5 px-3 rounded-md text-[10px] sm:text-xs font-bold font-display transition cursor-pointer ${
            sortBy === "kills"
              ? "bg-gaming-blue text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          KILLS
        </button>
        <button
          onClick={() => setSortBy("wins")}
          className={`flex-y py-1.5 px-3 rounded-md text-[10px] sm:text-xs font-bold font-display transition cursor-pointer ${
            sortBy === "wins"
              ? "bg-gaming-blue text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          WINS
        </button>
        <button
          onClick={() => setSortBy("earnings")}
          className={`flex-y py-1.5 px-3 rounded-md text-[10px] sm:text-xs font-bold font-display transition cursor-pointer ${
            sortBy === "earnings"
              ? "bg-gaming-blue text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          EARNINGS
        </button>
      </div>

      {/* Ranks list table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gaming-border/80 text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
              <th className="py-3 px-4 w-24 text-center">RANK</th>
              <th className="py-3 px-4">GAMER</th>
              <th className="py-3 px-4 text-center font-mono">PTS</th>
              <th className="py-3 px-4 text-center font-mono text-emerald-400">MVP PTS</th>
              <th className="py-3 px-4 text-center font-mono">KILLS</th>
              <th className="py-3 px-4 text-center font-mono">CHAMPION WINS</th>
              <th className="py-3 px-4 text-right font-mono">TOTAL EARNED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gaming-border/50">
            {filteredRanks.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-xs text-gray-400">
                  No players found match the query term.
                </td>
              </tr>
            ) : (
              filteredRanks.map((player, idx) => {
                const visualRank = idx + 1;
                const isCurrentUser = currentUserId && player.userId === currentUserId;

                return (
                  <tr 
                    key={player.id} 
                    className={`transition-all duration-300 relative ${
                      isCurrentUser
                        ? "bg-gaming-blue/20 border-y border-gaming-blue/40 shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:bg-gaming-blue/25"
                        : idx === 0 
                        ? "bg-amber-500/5 hover:bg-gaming-bg/30" 
                        : idx === 1 
                        ? "bg-slate-300/5 hover:bg-gaming-bg/30" 
                        : idx === 2 
                        ? "bg-amber-700/5 hover:bg-gaming-bg/30" 
                        : "hover:bg-gaming-bg/30"
                    }`}
                  >
                    {/* Rank metal icon & trend indicator */}
                    <td className={`py-3.5 px-4 text-center align-middle ${
                      isCurrentUser ? "border-l-4 border-gaming-blue shadow-[inset_4px_0_0_#6366f1]" : ""
                    }`}>
                      <div className="flex items-center justify-center gap-2.5">
                        {getRankBadge(visualRank)}
                        {renderRankTrend(player)}
                      </div>
                    </td>

                    {/* Gamer Username and bio placeholder */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <img
                          src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`}
                          alt={player.username}
                          className={`h-7 w-7 rounded-md p-0.5 object-cover bg-gaming-border border ${
                            isCurrentUser ? "border-gaming-blue/80 shadow-[0_0_8px_rgba(99,102,241,0.4)]" : "border-gaming-border"
                          }`}
                        />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                            <span className={isCurrentUser ? "text-white font-extrabold" : ""}>{player.username}</span>
                            {isCurrentUser && (
                              <span className="inline-flex items-center bg-gaming-blue/20 text-gaming-blue border border-gaming-blue/40 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-[0_0_6px_rgba(99,102,241,0.2)] tracking-wider">
                                YOU
                              </span>
                            )}
                            {player.kills > 0 && player.kills === maxKills && (
                              <span className="inline-flex items-center gap-0.5 bg-gaming-pink/15 text-gaming-pink border border-gaming-pink/30 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-[0_0_8px_rgba(236,72,153,0.35)] tracking-wider">
                                <Skull className="h-2 w-2 text-gaming-pink" /> MVP
                              </span>
                            )}
                            {visualRank <= 3 && !isCurrentUser && (
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400 animate-pulse" />
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2 flex-wrap mt-0.5">
                            <span>UID: {player.userId}</span>
                            <span className="text-gray-650">•</span>
                            <span className="text-gaming-blue font-extrabold uppercase text-[9px] bg-gaming-blue/5 border border-gaming-blue/20 rounded px-1">{player.platform || "PC"}</span>
                            <span className="text-gray-650">•</span>
                            <span className="text-amber-500 font-extrabold uppercase text-[9px] bg-amber-500/5 border border-amber-500/20 rounded px-1">{player.region || "India"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Points values */}
                    <td className={`py-3.5 px-4 text-center font-mono text-xs font-bold ${
                      isCurrentUser ? "text-white" : "text-gray-300"
                    }`}>
                      {player.points.toLocaleString()}
                    </td>

                    {/* MVP Points values */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-bold font-mono text-emerald-400">
                        <Star className="h-3.5 w-3.5 fill-emerald-500/20" />
                        <span>{player.mvpPoints ?? 0}</span>
                      </div>
                    </td>

                    {/* Kills count badge */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-gaming-pink/10 border border-gaming-pink/30 px-2 py-0.5 rounded text-[11px] font-bold font-mono text-gaming-pink">
                        <Skull className="h-3 w-3" />
                        <span>{player.kills ?? 0}</span>
                      </div>
                    </td>

                    {/* Wins values */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-400">
                      <span className={`inline-block px-2.5 py-0.5 rounded border font-black text-white ${
                        isCurrentUser ? "bg-gaming-blue/30 border-gaming-blue/50" : "bg-gaming-bg/85 border-gaming-border/80"
                      }`}>
                        {player.wins}
                      </span>
                    </td>

                    {/* Earnings size */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-gaming-neon font-black">
                      🪙 {player.earnings.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
