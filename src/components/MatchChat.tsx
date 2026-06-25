import React, { useState, useEffect, useRef } from "react";
import { TournamentEvent, UserProfile, MatchMessage } from "../types";
import { X, Send, MessageSquare, Loader2, User, HelpCircle, Trophy, Star, UserCheck } from "lucide-react";
import { 
  dbSubscribeMatchMessages, 
  dbSendMatchMessage, 
  dbFetchRegistrations, 
  dbSubscribeMvpVotes, 
  dbCastMvpVote 
} from "../firebaseService";

interface MatchChatProps {
  event: TournamentEvent;
  user: UserProfile | null;
  onClose: () => void;
}

export default function MatchChat({ event, user, onClose }: MatchChatProps) {
  const [messages, setMessages] = useState<MatchMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // MVP Voting State Setup
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [votes, setVotes] = useState<any[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedForId, setVotedForId] = useState<string | null>(null);
  const [isCastingVote, setIsCastingVote] = useState(false);

  // Subscribe to real-time chat messages
  useEffect(() => {
    setLoading(true);
    const unsubscribe = dbSubscribeMatchMessages(event.id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // Scroll to bottom after message loading
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    });

    return () => {
      unsubscribe();
    };
  }, [event.id]);

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load tournament event registrations as nominee candidates
  useEffect(() => {
    if (event.status === "completed") {
      dbFetchRegistrations().then((allRegs) => {
        if (allRegs) {
          const filtered = allRegs.filter((r) => r.eventId === event.id);
          setRegistrations(filtered);
          
          if (user) {
            const registered = filtered.some((r) => r.userId === user.uid);
            setIsParticipant(registered);
          }
        }
      });
    }
  }, [event.id, event.status, user]);

  // Subscribe to real-time MVP votes cast
  useEffect(() => {
    if (event.status === "completed") {
      const unsubscribe = dbSubscribeMvpVotes(event.id, (mvpVotes) => {
        setVotes(mvpVotes);
        if (user) {
          const myVote = mvpVotes.find((v) => v.voterUserId === user.uid);
          if (myVote) {
            setHasVoted(true);
            setVotedForId(myVote.nomineeUserId);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [event.id, event.status, user]);

  const handleCastVote = async (nomineeUserId: string, nomineeUsername: string) => {
    if (!user) return;
    setIsCastingVote(true);
    try {
      await dbCastMvpVote(event.id, user.uid, nomineeUserId, nomineeUsername);
      setHasVoted(true);
      setVotedForId(nomineeUserId);
    } catch (err) {
      console.error("Failed to nominate MVP player:", err);
    } finally {
      setIsCastingVote(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    setSending(true);
    const messageContent = inputText.trim();
    setInputText(""); // Clear immediately for snappy UI feel

    try {
      await dbSendMatchMessage(event.id, messageContent, user);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  // Preset custom stickers/messages for quick strategy coordination
  const quickMessages = [
    "Assemble in Discord! 🎮",
    "Where is the lobby details?",
    "Need squad mates! 🤜🤛",
    "Ready to roll! Let's win this! 🔥",
    "Best of luck everyone!"
  ];

  const handleQuickSend = async (text: string) => {
    if (!user) return;
    try {
      await dbSendMatchMessage(event.id, text, user);
    } catch (err) {
      console.error("Quick message send error:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      {/* Container Card */}
      <div 
        id="match_chat_dialog"
        className="bg-[#0E1119] border border-gaming-border w-full max-w-2xl h-[85vh] sm:h-[75vh] rounded-2xl overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-fade-in"
      >
        {/* Header section */}
        <div className="px-5 py-4 border-b border-gaming-border/60 bg-gradient-to-r from-gaming-bg to-gaming-bg/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gaming-blue/15 border border-gaming-blue p-2 rounded-xl text-gaming-blue">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black font-mono tracking-wider bg-gaming-pink/15 text-gaming-pink px-2 py-0.5 rounded uppercase">
                  {event.game}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">LOBBY CHAT</span>
              </div>
              <h2 className="text-sm sm:text-base font-display font-black text-white uppercase tracking-tight line-clamp-1 mt-0.5">
                {event.title}
              </h2>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-gaming-border/80 text-gray-400 hover:text-white hover:bg-gaming-border/35 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Informative alert board */}
        <div className="bg-gaming-blue/5 border-b border-gaming-blue/15 px-5 py-2.5 text-[10px] text-gray-300 flex items-center gap-2 shrink-0 select-none">
          <span className="text-gaming-blue">📢</span>
          <span>Registered players can coordinate match timings, lobby passwords, and squad invites below. Keep it friendly!</span>
        </div>

        {/* MVP Voting Card - Only displayed when tournament status is 'completed' */}
        {event.status === "completed" && (
          <div className="bg-[#111524] border-b border-emerald-500/10 p-4 sm:p-5 shrink-0 animate-fade-in select-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-emerald-400 fill-emerald-400/10" />
                  <h3 className="text-xs sm:text-sm font-display font-black text-white uppercase tracking-tight">
                    Vote For Match MVP
                  </h3>
                  <span className="animate-pulse bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wider">
                    POLL ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Select a candidate to credit MVP Points on the Live Leaderboard!
                </p>
              </div>

              {user && (
                <div className="flex items-center gap-1 font-mono text-[9px] shrink-0">
                  {isParticipant ? (
                    <span className="bg-[#10b981]/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                      ✓ PLAYER VOTE ACTIVE
                    </span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                      ⚠️ SPECTATOR DEMO VOTE
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Voting Options Panel */}
            {!user ? (
              <div className="text-center py-2.5 bg-black/30 border border-gaming-border/50 rounded-xl text-[10px] text-gray-500 font-mono tracking-wider uppercase">
                🛑 Login to nomination poll access
              </div>
            ) : !hasVoted ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                {(registrations.length > 0 ? registrations : [
                  { userId: "user-alpha", username: "Hydra_Soul", teamName: "Team Hydra" },
                  { userId: "user-beta", username: "ViperGG", teamName: "Viper Esports" },
                  { userId: "user-gamma", username: "Mortal_OP", teamName: "Soul Clan" },
                  { userId: "user-delta", username: "Alpha_Sniper", teamName: "Alpha Squad" }
                ]).map((nominee) => {
                  const nomineeId = nominee.userId;
                  const nomineeUsername = nominee.username;
                  return (
                    <button
                      key={nomineeId}
                      disabled={isCastingVote}
                      onClick={() => handleCastVote(nomineeId, nomineeUsername)}
                      className="group bg-[#090C12] hover:bg-emerald-500/5 hover:border-emerald-500/40 border border-gaming-border/80 px-3 py-2 rounded-xl text-left transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-gaming-border/20 group-hover:bg-emerald-500/25 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 border border-gaming-border/40 group-hover:border-emerald-500/20 transition">
                          <Star className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white group-hover:text-emerald-300 transition">
                            {nomineeUsername}
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] bg-gaming-bg group-hover:bg-emerald-600 group-hover:text-white text-gray-400 px-2 py-1 border border-gaming-border group-hover:border-transparent rounded font-bold tracking-widest transition">
                        NOMINATE
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#090C12] border border-gaming-border/80 p-3 rounded-xl">
                <div className="flex items-center justify-between border-b border-gaming-border/50 pb-2 mb-2">
                  <div className="text-[10px] font-bold text-[#10b981] flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" /> NOMINATION REGISTERED
                  </div>
                  <div className="text-[9px] font-mono text-gray-500">
                    TOTAL MATCH VOTES: <span className="text-white font-extrabold">{votes.length}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                  {(registrations.length > 0 ? registrations : [
                    { userId: "user-alpha", username: "Hydra_Soul", teamName: "Team Hydra" },
                    { userId: "user-beta", username: "ViperGG", teamName: "Viper Esports" },
                    { userId: "user-gamma", username: "Mortal_OP", teamName: "Soul Clan" },
                    { userId: "user-delta", username: "Alpha_Sniper", teamName: "Alpha Squad" }
                  ]).map((nominee) => {
                    const nomineeId = nominee.userId;
                    const nomineeUsername = nominee.username;
                    const nomineeVoteCount = votes.filter((v) => v.nomineeUserId === nomineeId).length;
                    const percentage = votes.length > 0 ? Math.round((nomineeVoteCount / votes.length) * 100) : 0;
                    const isMyVote = votedForId === nomineeId;

                    return (
                      <div key={nomineeId} className="relative bg-[#111420] border border-gaming-border px-3 py-2 rounded-lg overflow-hidden">
                        {/* Visual Progress Bar */}
                        <div 
                          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-bold text-white truncate max-w-[100px]">{nomineeUsername}</span>
                            {isMyVote && (
                              <span className="bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[7px] font-extrabold px-1 rounded transform scale-90 shrink-0">
                                MY VOTE
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-black text-emerald-400 font-mono pr-2">{percentage}%</span>
                            <span className="text-[9px] text-gray-500 font-mono">({nomineeVoteCount})</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message body list */}
        <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-b from-[#0B0D14] to-[#0E1119] space-y-4">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-gaming-blue" />
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">LOADING CHAT SIGNAL...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-gaming-border/30 flex items-center justify-center text-gray-400">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-display">No lobby messages yet</h4>
                <p className="text-[10px] text-gray-500 mt-1 max-w-xs">Be the first to say hi and coordinate with the registered players!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isCurrentUser = user && msg.userId === user.uid;
              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-[85%] ${isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {/* Avatar or fallback */}
                  <div className="h-8 w-8 rounded-full border border-gaming-border/65 overflow-hidden bg-gaming-bg flex-shrink-0 flex items-center justify-center">
                    {msg.avatar ? (
                      <img src={msg.avatar} alt="avatar" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-gray-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    {/* User title info */}
                    <div className={`flex items-center gap-2 text-[10px] ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                      <span className={`font-bold font-display ${isCurrentUser ? "text-gaming-blue" : "text-gray-300"}`}>
                        {msg.username}
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Chat Bubble box */}
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed font-sans border break-all shadow-md ${
                      isCurrentUser 
                        ? "bg-gaming-blue border-gaming-blue/35 text-white rounded-tr-none" 
                        : "bg-[#151926] border-gaming-border text-gray-100 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Stickers list */}
        {user && (
          <div className="px-5 py-2 border-t border-gaming-border/40 bg-gaming-bg/40 flex items-center gap-2 overflow-x-auto shrink-0 select-none scrollbar-none">
            <span className="text-[9px] font-black text-gray-500 font-mono uppercase tracking-wider shrink-0">QUICK:</span>
            {quickMessages.map((sticker, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickSend(sticker)}
                className="bg-gaming-border/30 hover:bg-gaming-border/80 border border-gaming-border/50 rounded-lg px-2.5 py-1 text-[10px] text-gray-300 hover:text-white transition cursor-pointer whitespace-nowrap"
              >
                {sticker}
              </button>
            ))}
          </div>
        )}

        {/* Message send section footer form */}
        <div className="p-4 border-t border-gaming-border bg-gaming-bg/20 shrink-0">
          {user ? (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message here to coordinate with other players..."
                className="flex-1 bg-[#090C12] border border-gaming-border focus:border-gaming-blue/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition font-sans placeholder-gray-500"
                maxLength={300}
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="bg-gaming-blue hover:bg-gaming-blue/90 disabled:opacity-40 text-white font-bold p-3 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 border border-transparent active:scale-95"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-2 text-xs text-gray-500 font-mono">
              🛑 PLEASE LOGIN OR SIGNUP TO COMMUNICATE IN LOBBY CHAT
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
