import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Check, Sparkles, Trophy, Bell, Shield, SlidersHorizontal, Users,
  MessageSquare, Volume2, ArrowRight, ArrowLeft, Gamepad2, Settings
} from "lucide-react";

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export default function OnboardingOverlay({ isOpen, onClose, isDarkMode = true }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to Elite Esports Arena",
      subtitle: "Your Ultimate Gaming Tournament Companion",
      icon: <Gamepad2 className="h-10 w-10 text-gaming-neon animate-pulse" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            Welcome to the premier hub for competitive esports tournaments. Here, you can search and compete in elite tournaments, track match histories, manage earnings, and organize live lobbies with ease.
          </p>
          <div className="bg-[#0B0F17]/90 rounded-xl p-3.5 border border-gaming-border/60 space-y-3.5">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gaming-blue flex items-center gap-1.5">
              <SlidersHorizontal className="h-3 w-3" /> Quick Filter Search
            </h4>
            <p className="text-[10px] text-gray-400">
              Easily narrow down live matches using **Quick Terms** like <span className="text-gray-300 font-semibold px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px]">BGMI</span>, <span className="text-gray-300 font-semibold px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px]">Valorant</span>, or game types like <span className="text-gray-300 font-semibold px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px]">Solo</span> and <span className="text-gray-300 font-semibold px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px]">Squad</span>.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Lobby Social Proof & Registration",
      subtitle: "See Who's Playing & Secure Your Spot",
      icon: <Users className="h-10 w-10 text-gaming-blue" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            We've made lobby registration surgical and intuitive. Just click **Register**, fill in your Game Handle (IGN) and In-Game ID (IGID), and choose a payment method (Card, UPI, or your local in-app Wallet).
          </p>
          <div className="bg-[#0B0F17]/90 rounded-xl p-3.5 border border-gaming-border/60 space-y-3">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gaming-blue flex items-center gap-1.5">
              👥 Social Proof & Active Lobby Tracking
            </h4>
            <p className="text-[10px] text-gray-400">
              Check the bottom of each Tournament Card to find a small stacked sequence of circular gamer avatars. This represents the **first 3 registered players** to give you instant social proof and real-time lobby activity indicators before you jump in!
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex -space-x-2.5 overflow-visible">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=shroud" alt="shroud" className="h-6 w-6 rounded-full border border-[#0d111a] bg-[#0E1119]" />
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=ninja" alt="ninja" className="h-6 w-6 rounded-full border border-[#0d111a] bg-[#0E1119]" />
                <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=pro" alt="pro" className="h-6 w-6 rounded-full border border-[#0d111a] bg-[#0E1119]" />
                <div className="h-6 w-6 rounded-full border border-[#0d111a] bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center text-[7.5px] font-bold text-gray-300 select-none shadow-[0_0_6px_rgba(0,0,0,0.5)]">+12</div>
              </div>
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest ml-1">Lobby fills fast!</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Discord Live Webhook Alerts",
      subtitle: "Instant Room Keys & Password Syncing",
      icon: <MessageSquare className="h-10 w-10 text-[#5865F2]" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            Never miss a crucial match starting time or room credential! Connecting your personal or team server keeps you in sync automatically.
          </p>
          <div className="bg-[#5865F2]/10 rounded-xl p-3.5 border border-[#5865F2]/30 space-y-3">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5865F2] flex items-center gap-1.5">
              🎮 Automatic Webhook Integration
            </h4>
            <p className="text-[10px] text-gray-300">
              Paste your custom Discord server channel Webhook URL into the **Discord Settings box** on your profile page. Once connected, our platform dispatches room logins, passwords, bracket draws, and match results instantly to your channel!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Alert Center & Gentle Auto-Scroll",
      subtitle: "Immediate Match Credentials & Updates",
      icon: <Bell className="h-10 w-10 text-gaming-pink animate-bounce" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            The platform includes an elegant, real-time Alert & Notification Center in your dashboard layout. You will receive notifications about tournament approvals, room keys, or dispute responses instantly.
          </p>
          <div className="bg-[#0B0F17]/90 rounded-xl p-3.5 border border-gaming-border/60 space-y-3">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gaming-pink flex items-center gap-1.5">
              📜 Intelligent Auto-Scrolling Notifications
            </h4>
            <p className="text-[10px] text-gray-400">
              When the organizer issues a new **match-room credential** or **administrative update**, the alert center automatically detects the incoming live event and **gently auto-scrolls** the alerts list to highlight the most recent update so you never miss a lobby slot or tournament update!
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`w-full max-w-lg border rounded-2xl overflow-hidden shadow-2xl relative ${
            isDarkMode 
              ? "bg-[#07090E] border-gaming-border text-white" 
              : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          {/* Top colored light bar for cyber glow effect */}
          <div className="h-1 w-full bg-gradient-to-r from-gaming-blue via-gaming-pink to-gaming-neon" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Skip Onboarding"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step Indicator */}
          <div className="px-6 pt-6 flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-500">
              Gamer Onboarding • Step {currentStep + 1} of {steps.length}
            </span>
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 w-6 rounded-full transition-all duration-300 ${
                    idx === currentStep 
                      ? "bg-gaming-neon" 
                      : idx < currentStep 
                      ? "bg-gaming-blue" 
                      : "bg-gray-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Main content body */}
          <div className="p-6 space-y-6 text-center">
            {/* Step Icon */}
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                {steps[currentStep].icon}
              </div>
            </div>

            {/* Step Headers */}
            <div className="space-y-1">
              <h3 className="text-base font-display font-black uppercase tracking-wide">
                {steps[currentStep].title}
              </h3>
              <p className="text-[11px] text-gaming-neon font-mono font-semibold uppercase tracking-wider">
                {steps[currentStep].subtitle}
              </p>
            </div>

            {/* Step HTML content */}
            <div className="min-h-[140px] flex items-center justify-center">
              {steps[currentStep].content}
            </div>
          </div>

          {/* Footer Controls */}
          <div className={`px-6 py-4 flex items-center justify-between border-t ${
            isDarkMode ? "border-gaming-border/60 bg-black/20" : "border-slate-100 bg-slate-50"
          }`}>
            <button
              onClick={onClose}
              className="text-[10px] text-gray-500 hover:text-gaming-pink font-mono uppercase tracking-wider transition cursor-pointer font-bold"
            >
              Skip Onboarding
            </button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-display uppercase tracking-wider transition active:scale-95 cursor-pointer border ${
                    isDarkMode 
                      ? "border-gaming-border text-gray-300 hover:bg-white/5" 
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4.5 py-1.5 rounded-lg bg-gaming-neon text-black text-[10px] font-black font-display uppercase tracking-wider hover:bg-opacity-80 transition shadow-lg active:scale-95 cursor-pointer"
              >
                {currentStep === steps.length - 1 ? (
                  <>Ready, Let's Play! <Check className="h-3 w-3" /></>
                ) : (
                  <>Next <ArrowRight className="h-3 w-3" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
