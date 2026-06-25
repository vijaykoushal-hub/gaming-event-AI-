import React, { useState, useMemo } from "react";
import { TournamentEvent, EventRegistration, UserProfile } from "../types";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Gamepad2, 
  Trophy, 
  Clock, 
  ArrowRight, 
  Users, 
  CheckCircle2, 
  Sparkles,
  Info
} from "lucide-react";

interface TournamentCalendarProps {
  events: TournamentEvent[];
  registrations: EventRegistration[];
  userProfile: UserProfile | null;
  onRegister: (event: TournamentEvent) => void;
  onOpenChat: (event: TournamentEvent) => void;
  isDarkMode: boolean;
}

export default function TournamentCalendar({
  events,
  registrations,
  userProfile,
  onRegister,
  onOpenChat,
  isDarkMode
}: TournamentCalendarProps) {
  // Always initialize calendar to June 2026 since initial data starts there (June 22, 2026 is current time)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June is 5 (0-indexed)
  const [selectedDay, setSelectedDay] = useState<number | null>(22); // Default to current day 22

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Helper: check if tournament date matches year, month (0-indexed), and day
  const getEventsForDay = (year: number, month: number, day: number) => {
    return events.filter(evt => {
      if (!evt.date) return false;
      const d = new Date(evt.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  // Build the days of the calendar grid
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Prev month padding cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        monthOffset: -1,
        events: getEventsForDay(
          currentMonth === 0 ? currentYear - 1 : currentYear,
          currentMonth === 0 ? 11 : currentMonth - 1,
          daysInPrevMonth - i
        )
      });
    }

    // Current month cells
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        dayNumber: i,
        isCurrentMonth: true,
        monthOffset: 0,
        events: getEventsForDay(currentYear, currentMonth, i)
      });
    }

    // Next month padding cells to round to multiple of 7
    const remainingCells = 42 - cells.length; // Max 6-row layout
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        dayNumber: i,
        isCurrentMonth: false,
        monthOffset: 1,
        events: getEventsForDay(
          currentMonth === 11 ? currentYear + 1 : currentYear,
          currentMonth === 11 ? 0 : currentMonth + 1,
          i
        )
      });
    }

    return cells;
  }, [currentYear, currentMonth, events]);

  // Handle month switches
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDay(null);
  };

  const handleGoToToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(5); // June
    setSelectedDay(22); // June 22, 2026 is today
  };

  // Selected Day Actions
  const activeEventsForSelectedDay = useMemo(() => {
    if (selectedDay === null) return [];
    return getEventsForDay(currentYear, currentMonth, selectedDay);
  }, [selectedDay, currentYear, currentMonth, events]);

  const getGameBadgeColor = (game: string) => {
    const gameLower = game.toLowerCase();
    if (gameLower.includes("bgmi") || gameLower.includes("battlegrounds")) {
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    } else if (gameLower.includes("valorant")) {
      return "bg-gaming-pink/20 text-gaming-pink border border-gaming-pink/30";
    } else if (gameLower.includes("free fire")) {
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    } else {
      return "bg-gaming-blue/20 text-gaming-blue border border-gaming-blue/30";
    }
  };

  return (
    <div id="tournament_calendar_root" className="animate-in fade-in duration-300">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Calendar Grid Panel */}
        <div className={`xl:col-span-3 rounded-2xl border p-5 flex flex-col ${
          isDarkMode ? "bg-gaming-card border-gaming-border" : "bg-white border-slate-200 shadow-sm"
        }`}>
          
          {/* Calendar Header Tools */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 border-b pb-4 border-gaming-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gaming-blue/15 border border-gaming-blue/35">
                <CalendarIcon className="h-5 w-5 text-gaming-blue" />
              </div>
              <div>
                <h3 className={`text-base font-display font-extrabold uppercase tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <p className="text-[10px] font-mono text-gray-400 uppercase font-black">
                  Select Days To Discover Slates
                </p>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleGoToToday}
                className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold uppercase border transition cursor-pointer ${
                  isDarkMode 
                    ? "bg-[#0B0F17] hover:bg-white/5 border-gaming-border hover:border-gray-500 text-gray-300"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                Today
              </button>
              
              <div className={`flex items-center rounded-lg border ${isDarkMode ? "bg-[#0B0F17] border-gaming-border" : "bg-slate-50 border-slate-200"}`}>
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:text-gaming-blue transition text-gray-400 border-r border-gaming-border/50 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:text-gaming-blue transition text-gray-400 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {daysOfWeek.map((day) => (
              <div 
                key={day} 
                className={`py-2 text-[10px] font-mono font-black uppercase tracking-wider ${
                  day === "Sun" || day === "Sat" ? "text-gaming-pink/80" : "text-gray-500"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Monthly Days View Grid */}
          <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-[380px]">
            {calendarCells.map((cell, idx) => {
              const hasEvents = cell.events.length > 0;
              const isSelected = cell.isCurrentMonth && selectedDay === cell.dayNumber;
              const isToday = cell.isCurrentMonth && currentYear === 2026 && currentMonth === 5 && cell.dayNumber === 22;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedDay(cell.dayNumber);
                    } else {
                      // Navigate to padding month
                      if (cell.monthOffset === -1) {
                        handlePrevMonth();
                      } else {
                        handleNextMonth();
                      }
                    }
                  }}
                  className={`min-h-[64px] sm:min-h-[76px] p-2 rounded-xl flex flex-col justify-between transition-all duration-200 cursor-pointer border relative select-none group ${
                    !cell.isCurrentMonth
                      ? isDarkMode 
                        ? "bg-[#0B0F17]/10 border-gaming-border/10 text-gray-600 opacity-30 hover:opacity-50"
                        : "bg-slate-50/20 border-slate-100 text-slate-300 opacity-40"
                      : isSelected
                      ? isDarkMode
                        ? "bg-gaming-blue/10 border-gaming-blue shadow-[0_0_15px_rgba(0,180,216,0.2)] text-white"
                        : "bg-blue-50 border-blue-500 shadow-sm text-blue-900"
                      : isToday
                      ? isDarkMode
                        ? "bg-[#0B0F17] border-gaming-neon text-white"
                        : "bg-amber-50 border-amber-500 text-slate-800"
                      : isDarkMode
                      ? "bg-[#0B0F17]/40 border-gaming-border/40 hover:border-gray-600 text-gray-300 hover:bg-white/5"
                      : "bg-slate-50/50 border-slate-200 hover:border-slate-350 text-slate-750 hover:bg-slate-100"
                  }`}
                >
                  {/* Day Indicator Number & Live Marker */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold rounded-md px-1 ${
                      isToday 
                        ? "bg-gaming-neon/20 text-gaming-neon border border-gaming-neon/30" 
                        : isSelected 
                        ? "text-gaming-blue-light" 
                        : "text-gray-400"
                    }`}>
                      {cell.dayNumber}
                    </span>

                    {/* Quick indicator of tournament numbers */}
                    {hasEvents && (
                      <span className="flex h-2 w-2 relative">
                        {cell.events.some(e => e.status === "live") && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gaming-pink opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          cell.events.some(e => e.status === "live") 
                            ? "bg-gaming-pink" 
                            : cell.events.some(e => e.status === "upcoming")
                            ? "bg-gaming-blue"
                            : "bg-gray-500"
                        }`}></span>
                      </span>
                    )}
                  </div>

                  {/* Day cell list of quick previews (only on larger displays) */}
                  <div className="hidden sm:block mt-1 space-y-1">
                    {cell.events.slice(0, 2).map((evt) => {
                      const isEventLive = evt.status === "live";
                      return (
                        <div 
                          key={evt.id} 
                          className={`text-[9px] font-mono leading-none truncate px-1.5 py-0.5 rounded border ${
                            isEventLive
                              ? "bg-gaming-pink/10 text-gaming-pink border-gaming-pink/25 animate-pulse"
                              : evt.status === "upcoming"
                              ? "bg-gaming-blue/10 text-gaming-blue border-gaming-blue/20"
                              : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          }`}
                        >
                          {evt.title.split(" ")[0] || "Tournament"}
                        </div>
                      );
                    })}
                    {cell.events.length > 2 && (
                      <div className="text-[8px] font-bold font-mono text-gray-500 text-right pr-0.5">
                        +{cell.events.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Agenda / Event Info Panel */}
        <div className={`rounded-2xl border p-5 flex flex-col justify-between ${
          isDarkMode ? "bg-gaming-card border-gaming-border" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-4 border-b pb-3.5 border-gaming-border/40">
              <Trophy className="h-4.5 w-4.5 text-gaming-blue" />
              <h4 className={`text-xs font-mono font-black uppercase tracking-wider ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
                Agenda Details
              </h4>
            </div>

            {selectedDay !== null ? (
              <div>
                <div className={`p-3 rounded-xl mb-4 text-center border ${
                  isDarkMode ? "bg-[#0B0F17]/60 border-gaming-border/60" : "bg-slate-50 border-slate-150"
                }`}>
                  <div className={`text-2xl font-mono font-black ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    {selectedDay}
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase font-mono font-black">
                    {monthNames[currentMonth]} {currentYear}
                  </div>
                </div>

                {activeEventsForSelectedDay.length > 0 ? (
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {activeEventsForSelectedDay.map((evt) => {
                      const isJoined = registrations.some(r => r.eventId === evt.id);
                      const isLive = evt.status === "live";
                      const dateObj = new Date(evt.date);
                      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div 
                          key={evt.id} 
                          className={`p-3 rounded-xl border transition-all ${
                            isDarkMode 
                              ? "bg-[#0B0F17]/80 border-gaming-border/60 hover:border-gaming-blue/40" 
                              : "bg-slate-50 border-slate-200 hover:border-blue-200"
                          }`}
                        >
                          {/* Badge header */}
                          <div className="flex items-center justify-between mb-1.5 gap-2">
                            <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${getGameBadgeColor(evt.game)}`}>
                              {evt.game.split(" (")[0]}
                            </span>
                            
                            {isJoined ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-gaming-neon font-mono uppercase bg-gaming-neon/15 px-1.5 py-0.5 rounded border border-gaming-neon/20">
                                <CheckCircle2 className="h-2.5 w-2.5" /> JOINED
                              </span>
                            ) : isLive ? (
                              <span className="inline-block text-[9px] font-bold text-gaming-pink font-mono uppercase bg-gaming-pink/10 px-1.5 py-0.5 rounded border border-gaming-pink/20 animate-pulse">
                                ● LIVE
                              </span>
                            ) : evt.status === "completed" ? (
                              <span className="inline-block text-[9px] font-bold text-gray-400 font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                COMPLETED
                              </span>
                            ) : (
                              <span className="inline-block text-[9px] font-semibold text-gray-400 font-mono">
                                UPCOMING
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h5 className={`text-xs font-bold uppercase tracking-tight line-clamp-1 ${isDarkMode ? "text-white" : "text-slate-800"}`} title={evt.title}>
                            {evt.title}
                          </h5>

                          {/* Time & Slots */}
                          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gaming-blue" />
                              {timeStr}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {evt.slotsFilled}/{evt.maxParticipants} slots
                            </span>
                          </div>

                          {/* Interactive Buy-in & Action Button */}
                          <div className="flex items-center justify-between border-t border-gaming-border/40 pt-2.5 mt-2.5 gap-2">
                            <div className="font-mono">
                              <span className="text-[9px] text-gray-500 block uppercase">Buy-in</span>
                              <span className={`text-xs font-extrabold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                                {evt.fee > 0 ? `🪙 ${evt.fee} Coins` : "FREE ENTRY"}
                              </span>
                            </div>

                            {isJoined ? (
                              <button
                                onClick={() => onOpenChat(evt)}
                                className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg bg-gaming-neon hover:bg-gaming-neon/80 text-black transition flex items-center gap-1 cursor-pointer"
                              >
                                Join Lobby <ArrowRight className="h-2.5 w-2.5" />
                              </button>
                            ) : evt.status === "upcoming" ? (
                              <button
                                onClick={() => onRegister(evt)}
                                className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg bg-gaming-blue hover:bg-gaming-blue/80 text-white transition flex items-center gap-1 cursor-pointer"
                              >
                                Register <ArrowRight className="h-2.5 w-2.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-500 italic font-mono">Unavailable</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 font-sans border border-dashed border-gaming-border/40 rounded-xl bg-black/10">
                    <Gamepad2 className="h-8 w-8 mx-auto text-gray-600 mb-2.5 animate-pulse" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Arena is Silent
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[160px] mx-auto">
                      No custom tournaments are scheduled for this day yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 font-sans">
                <Info className="h-7 w-7 mx-auto text-gaming-blue/50 mb-2" />
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  No Day Selected
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Click on any day inside the calendar sheet grid to access schedule lists instantly.
                </p>
              </div>
            )}
          </div>

          {/* Quick instructions / tips banner */}
          <div className={`p-3 rounded-xl border text-[10px] leading-relaxed mt-4 ${
            isDarkMode 
              ? "bg-[#0B0F17]/30 border-gaming-border/40 text-gray-400" 
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            <span className="flex items-center gap-1 font-bold text-gaming-blue font-mono uppercase border-b border-gaming-border/30 pb-1 mb-1">
              <Sparkles className="h-3 w-3 text-gaming-neon animate-pulse" /> PRO esports TIP
            </span>
            Clicking a day highlights specific matchups. You can preview formats, check prize pools, and secure slots directly from this agenda.
          </div>
        </div>
      </div>
    </div>
  );
}
