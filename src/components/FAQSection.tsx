import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  HelpCircle, 
  Search, 
  Trophy, 
  Coins, 
  MessageSquare, 
  ShieldAlert, 
  ChevronDown, 
  Sparkles,
  BookOpen,
  ArrowRight,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

interface FAQCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

export default function FAQSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  const categories: FAQCategory[] = [
    {
      id: "rules",
      title: "Tournament Rules & Formats",
      description: "Code of conduct, slot restrictions, and lobby rejoin specifications.",
      icon: <Trophy className="h-4 w-4 text-gaming-blue" />,
      items: [
        {
          question: "How do I register and join a tournament?",
          answer: "Access the 'Events' panel from the top navigation. Browse active tournaments for your favorite games like BGMI, Call of Duty, Free Fire, or Valorant. Click the 'Register' button on any open tournament, pick your payment option (Simulated UPI, card, or your available wallet coin balance), and authorize the seat. Your slot will be locked instantly!",
        },
        {
          question: "What is the Anti-Cheat Protection & Emulator policy?",
          answer: "All matches operate under highly stringent electronic monitoring rules. Running external macro setups, script overlays, console modifications, or playing mobile specific brackets via PC-emulators is strictly banned. Violating fair-play parameters will trigger an instant hardware-wide ban from the platform.",
          icon: <ShieldAlert className="h-3.5 w-3.5 text-gaming-pink" />
        },
        {
          question: "What happens if I disconnect mid-match?",
          answer: "Custom lobby codes and setup timings are synchronized in real-time within the Tournament Match Coord Chat. If you suffer connection drops, you have a 3-minute grace window to rejoin the custom lobby manually. Beyond this timeframe, match points are registered based on standard server telemetry, and the match proceeds without pause.",
          icon: <Clock className="h-3.5 w-3.5 text-gaming-blue" />
        },
        {
          question: "How are slot allocations and limits handled?",
          answer: "Every event lists a strict maximum participant limit to ensure servers don't lag and brackets remain clean. Slots are assigned entirely on a first-come, first-served basis. If you register, make sure to join custom rooms on time; seats cannot be refunded once bracket generation is triggered."
        }
      ]
    },
    {
      id: "finances",
      title: "Wallet Coins & UPI Cashouts",
      description: "Simulated sandbox deposits, coin deductions, and real-time ledger audits.",
      icon: <Coins className="h-4 w-4 text-gaming-neon" />,
      items: [
        {
          question: "What are Wallet Coins (🪙)?",
          answer: "Wallet Coins are our built-in virtual gaming balance. You can pre-load coins to register for paid events swiftly without manually filling card sheets for every single lobby. One coin corresponds structurally to ₹1 INR.",
        },
        {
          question: "How do I top up my Sandbox Wallet balance?",
          answer: "Navigate to 'My Profile' and select the 'Transaction History' or 'Wallet' options. We have implemented a fully custom simulated top-up card. You can buy popular preloaded packages (e.g. 200, 500, 1000 Coins) to top up your virtual budget in real-time in our interactive sandbox testing container.",
        },
        {
          question: "How do I submit and track a UPI Cashout claim?",
          answer: "Under 'My Profile' and the 'Wallet' tab, enter your registered UPI Address (e.g. gameplay@okpay) and draft your requested claim amount. Once clicked, a pending withdrawal record registers in the secure blockchain-styled Ledger. Organizers can instantly approve or reject your claim via the Admin Console to test payouts.",
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-gaming-neon" />
        },
        {
          question: "Are there any service fees for tournament registration?",
          answer: "No, we strictly charge zero platform middle fees. 100% of the tournament entry fee collections are redistributed back into the specific prize pool allocation matrix for active competitive brackets."
        }
      ]
    },
    {
      id: "comms",
      title: "Match Chats & Discord Sync",
      description: "Real-time communication channels and automated Discord webhook alerts.",
      icon: <MessageSquare className="h-4 w-4 text-gaming-blue" />,
      items: [
        {
          question: "How do I chat and coordinate with match opponents?",
          answer: "Once you successfully register for any tournament, a bright green '💬 Open Match Coord Chat' action unlocks directly inside that specific tournament's card! Click it to enter our real-time, low-latency lobby chat room to sync details, room keys, and set up team rosters.",
        },
        {
          question: "How do I configure active Discord Webhook sync?",
          answer: "Go to the 'Alerts' tab from the top nav bar. You will find a 'Discord Webhooks Sync' panel. Simply paste a custom Discord server channel webhook integration URL and hit save. This instructs our servers to dispatch real-time rich embeds whenever new tournaments publish, or when notifications occur!",
          icon: <Sparkles className="h-3.5 w-3.5 text-gaming-blue" />
        },
        {
          question: "What is the guidelines on player chat etiquette?",
          answer: "Keep all communication competitive yet respectful. Zero tolerance is maintained for racial slurs, harassment, or personal threats in the Match Coord Lobby chats. Violating accounts face instant suspensions and forfeiture of existing wallet balances.",
          icon: <AlertTriangle className="h-3.5 w-3.5 text-gaming-pink" />
        }
      ]
    }
  ];

  // Helper to filter items based on category and search query
  const getFilteredItems = () => {
    let allItems: { categoryTitle: string; categoryId: string; item: FAQItem; idx: number }[] = [];
    
    categories.forEach((cat) => {
      cat.items.forEach((item, idx) => {
        allItems.push({
          categoryTitle: cat.title,
          categoryId: cat.id,
          item,
          idx
        });
      });
    });

    return allItems.filter((entry) => {
      // Filter by category
      if (activeCategory !== "all" && entry.categoryId !== activeCategory) {
        return false;
      }
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesQ = entry.item.question.toLowerCase().includes(query);
        const matchesA = entry.item.answer.toLowerCase().includes(query);
        return matchesQ || matchesA;
      }
      return true;
    });
  };

  const filtered = getFilteredItems();

  const toggleExpand = (uniqueId: string) => {
    if (expandedIndex === uniqueId) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(uniqueId);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="faq-section">
      
      {/* Banner Hero */}
      <div className="bg-gradient-to-r from-gaming-bg via-[#0F1219] to-gaming-bg border border-gaming-border rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-1/4 w-40 h-40 bg-gaming-blue/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-gaming-pink/5 rounded-full blur-3xl"></div>
        
        <div className="inline-flex p-3 bg-gaming-blue/15 border border-gaming-blue/40 rounded-xl text-gaming-blue mb-4">
          <HelpCircle className="h-6 w-6" />
        </div>
        
        <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
          FAQ & COMMUNITY PLAYGROUND RULES
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-xl mx-auto font-sans leading-relaxed">
          Need support coordinating rosters, understanding coin cashouts, or setting up Discord? Review our esports rules and platform guidelines below.
        </p>

        {/* Live Search Input Bar */}
        <div className="mt-6 max-w-lg mx-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search questions (e.g. Emulator, Cashout, Webhook)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#07090F] border border-gaming-border focus:border-gaming-blue rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition font-sans font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] uppercase font-mono font-bold text-gray-500 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Categories Selector on the left, Accordion on the right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Category selection buttons (3 cols desktop, full width mobile) */}
        <div className="md:col-span-4 space-y-2.5">
          <span className="block text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest pl-1 select-none">
            CATEGORIES
          </span>
          <div className="bg-[#0E1119] border border-gaming-border/80 rounded-xl p-2.5 space-y-1.5 shadow-md">
            <button
              onClick={() => setActiveCategory("all")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider text-left transition cursor-pointer border ${
                activeCategory === "all"
                  ? "bg-gaming-blue/15 text-gaming-blue border-gaming-blue/30"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-gaming-border/20"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Show All Guides ({categories.reduce((acc, c) => acc + c.items.length, 0)})</span>
            </button>
            
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider text-left transition cursor-pointer border ${
                  activeCategory === cat.id
                    ? "bg-gaming-blue/15 text-gaming-blue border-gaming-blue/30"
                    : "border-transparent text-gray-400 hover:text-white hover:bg-gaming-border/20"
                }`}
              >
                {cat.icon}
                <div className="min-w-0">
                  <div className="truncate">{cat.title}</div>
                  <span className="block text-[8px] font-mono text-gray-500 normal-case font-normal mt-0.5 leading-none">
                    {cat.items.length} guidelines
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Prompt card on helper */}
          <div className="bg-gaming-blue/5 border border-gaming-blue/20 rounded-xl p-4 text-[11px] text-gray-400 space-y-2 select-none">
            <div className="flex items-center gap-2 text-gaming-blue font-bold font-display uppercase text-[10px]">
              <Info className="h-3.5 w-3.5" /> NEED DIRECT ESCALATION?
            </div>
            <p className="font-sans leading-relaxed">
              If you discover bracket errors or have a dispute regarding tournament points, flag your organizer inside Discord immediately using webhook notifications!
            </p>
            <div className="flex items-center gap-1.5 text-white font-mono font-bold text-[9px] hover:text-gaming-blue transition">
              <span>VISIT DISCORD DEVELOPER LAB</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Dynamic Accordion list (8 cols desktop) */}
        <div className="md:col-span-8 space-y-3">
          <div className="flex justify-between items-center pl-1 select-none">
            <span className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">
              GUIDELINES & ACCORDIONS
            </span>
            <span className="text-[10px] font-mono font-black text-gaming-blue">
              {filtered.length} RESULTS FOUND
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((entry, idx) => {
                const uniqueId = `${entry.categoryId}-${entry.item.question}`;
                const isExpanded = expandedIndex === uniqueId;

                return (
                  <motion.div
                    key={uniqueId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    className={`bg-[#0E1119] border rounded-xl overflow-hidden shadow relative group transition-colors duration-200 ${
                      isExpanded 
                        ? "border-gaming-blue/50" 
                        : "border-gaming-border hover:border-gaming-border/90"
                    }`}
                  >
                    {/* Header bar trigger */}
                    <button
                      onClick={() => toggleExpand(uniqueId)}
                      className="w-full text-left p-4 sm:p-5 flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        {entry.item.icon ? (
                          <div className="shrink-0 p-1.5 bg-gaming-bg border border-gaming-border rounded-lg">
                            {entry.item.icon}
                          </div>
                        ) : (
                          <div className="shrink-0 h-2 w-2 rounded-full bg-gaming-blue/60 group-hover:bg-gaming-blue transition-colors" />
                        )}
                        <div>
                          <span className="block text-[8px] font-mono font-bold text-gray-500 uppercase tracking-wider mb-1">
                            {entry.categoryTitle}
                          </span>
                          <h4 className="text-xs sm:text-xs font-bold text-white tracking-wide leading-snug group-hover:text-gaming-blue transition">
                            {entry.item.question}
                          </h4>
                        </div>
                      </div>
                      
                      <div className={`p-1.5 rounded-lg border border-gaming-border transition-transform ${
                        isExpanded ? "rotate-180 bg-gaming-blue/15 text-gaming-blue border-gaming-blue/30" : "text-gray-500"
                      }`}>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </button>

                    {/* Expandable answer panel */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 border-t border-gaming-border/40 bg-gradient-to-b from-[#0F1219]/20 to-[#0A0D14]/80">
                            <p className="text-xs text-gray-300 leading-relaxed font-sans mt-2 whitespace-pre-line">
                              {entry.item.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

      </div>

    </div>
  );
}
