import React, { useState, useEffect } from "react";
import { Trophy, Users, ShieldAlert, Cpu, Gamepad2, Skull, Zap } from "lucide-react";
import { TournamentEvent } from "../types";

interface HeroProps {
  liveTournamentsCount: number;
  upcomingCount: number;
  completedCount: number;
  onClickJoin: () => void;
}

export default function LandingHero({ liveTournamentsCount, upcomingCount, completedCount, onClickJoin }: HeroProps) {
  const [activeAdIndex, setActiveAdIndex] = useState(0);

  const banners = [
    {
      title: "BGMI INDIA CLASH 2026",
      subtitle: "भारत का सबसे बड़ा मोबाइल एस्पोर्ट्स महामुकाबला - 50,000 Coins पूल!",
      bannerImg: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
      badge: "REGISTRATIONS OPEN",
      accent: "from-emerald-500 to-teal-600"
    },
    {
      title: "VALORANT SHOWDOWN",
      subtitle: "Join tactical 5v5 action and showcase your Radiant plays!",
      bannerImg: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=1200&auto=format&fit=crop",
      badge: "LIVE NOW",
      accent: "from-blue-600 to-indigo-700"
    },
    {
      title: "COMPETE & WIN PRIZES",
      subtitle: "Register, climb the ranks, earn instantly, and withdraw with ease!",
      bannerImg: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
      badge: "INSTANT CASHOUTS",
      accent: "from-pink-600 to-rose-700"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const b = banners[activeAdIndex];

  return (
    <div className="relative mb-8 rounded-2xl overflow-hidden border border-gaming-border bg-gaming-card">
      {/* Live Marquee Ticker */}
      <div className="bg-gaming-pink/10 border-b border-gaming-border py-2 px-4 overflow-hidden whitespace-nowrap text-xs text-white flex items-center">
        <span className="flex items-center gap-1 text-gaming-pink font-bold uppercase tracking-wider mr-4 animate-pulse">
          <Zap className="h-3 w-3 fill-gaming-pink animate-bounce" /> LIVE UPDATES:
        </span>
        <div className="inline-block animate-infinite-scroll pl-[100%] hover:pause flex gap-8">
          <span className="text-gray-300 font-mono">🔥 BGMI India Classic: 48/64 Slots filled!</span>
          <span className="text-gray-300 font-mono">🏆 Congratulations to @Mortal_OP for winning 8,900 Coins in Free Fire cup!</span>
          <span className="text-gray-400 font-mono">💬 Discord Webhook integration is fully active. Turn on alerts in settings!</span>
          <span className="text-gray-300 font-mono">⌛ Valorant Neon Strike Finals matches are live stream casting right now!</span>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-infinite-scroll {
          animation: scroll 22s linear infinite;
        }
        .pause:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Hero Banner Showcase */}
      <div className="relative h-[280px] sm:h-[350px] overflow-hidden flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-gaming-bg via-gaming-bg/80 to-transparent z-10" />
        <img
          src={b.bannerImg}
          alt={b.title}
          className="absolute inset-0 w-full h-full object-cover opacity-35 object-center scale-105 transition-all duration-1000"
        />

        <div className="relative z-20 px-6 sm:px-12 max-w-2xl select-none">
          <span className="inline-block bg-gaming-pink text-white text-[10px] sm:text-xs font-bold font-mono tracking-widest px-2.5 py-0.5 rounded-full mb-3 uppercase">
            {b.badge}
          </span>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-white mb-2 uppercase">
            {b.title}
          </h1>
          <p className="text-gray-300 text-sm sm:text-base mb-6 font-sans">
            {b.subtitle}
          </p>
          <button
            onClick={onClickJoin}
            id="btn_hero_join"
            className="px-6 py-2.5 rounded-lg font-display text-xs sm:text-sm font-semibold bg-gradient-to-r from-gaming-blue to-gaming-neon text-white hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center gap-2 uppercase"
          >
            <Gamepad2 className="h-4 w-4" /> Browse Live & Upcoming Events
          </button>
        </div>
      </div>

      {/* Statistics Counter Segment */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gaming-border/80 border-t border-gaming-border">
        <div className="bg-gaming-card/90 p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gaming-neon/10 text-gaming-neon">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-mono font-extrabold text-white">4</div>
            <div className="text-[11px] sm:text-xs text-gray-400 font-sans tracking-wide">Supported Games</div>
          </div>
        </div>

        <div className="bg-gaming-card/90 p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gaming-pink/10 text-gaming-pink">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-mono font-extrabold text-white">48+</div>
            <div className="text-[11px] sm:text-xs text-gray-400 font-sans tracking-wide">Pro Clans Registered</div>
          </div>
        </div>

        <div className="bg-gaming-card/90 p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gaming-blue/10 text-gaming-blue">
            <Cup className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-mono font-extrabold text-white">{liveTournamentsCount} Active</div>
            <div className="text-[11px] sm:text-xs text-gray-400 font-sans tracking-wide">Tournaments Live</div>
          </div>
        </div>

        <div className="bg-gaming-card/90 p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <Skull className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-mono font-extrabold text-white">1.8L+ Coins</div>
            <div className="text-[11px] sm:text-xs text-gray-400 font-sans tracking-wide">Total Prizes Paid</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick inner Cup icon for simplicity helper
import { Award as Cup } from "lucide-react";
