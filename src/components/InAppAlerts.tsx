import React, { useState, useEffect, useRef } from "react";
import { InAppNotification } from "../types";
import { Bell, BellOff, CheckCheck, Trash2, Calendar, Gamepad, Award, Volume2, VolumeX } from "lucide-react";

interface NoticeProps {
  notifications: InAppNotification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onSimulateReminder?: () => void;
}

export default function InAppAlerts({ notifications, onMarkRead, onClearAll, onSimulateReminder }: NoticeProps) {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (!notifications || notifications.length === 0) {
      seenIdsRef.current = new Set();
      isFirstLoadRef.current = true;
      return;
    }

    // On first load of notifications, mark existing as seen and don't scroll
    if (isFirstLoadRef.current) {
      seenIdsRef.current = new Set(notifications.map((n) => n.id));
      isFirstLoadRef.current = false;
      return;
    }

    // Check for unseen notifications
    const newNotifications = notifications.filter((n) => !seenIdsRef.current.has(n.id));
    if (newNotifications.length > 0) {
      // Check if any new notification is a match-room notification or administrative update
      const hasTargetAlert = newNotifications.some((n) => {
        const title = n.title.toLowerCase();
        const body = n.body.toLowerCase();

        const isMatchRoom = 
          title.includes("room") || title.includes("lobby") || title.includes("match") || 
          title.includes("bracket") || title.includes("schedule") || title.includes("start") ||
          body.includes("room") || body.includes("password") || body.includes("lobby") || 
          body.includes("bracket") || body.includes("match");

        const isAdminUpdate = 
          title.includes("admin") || title.includes("organizer") || title.includes("system") || 
          title.includes("update") || title.includes("sandbox") || title.includes("dispute") ||
          body.includes("admin") || body.includes("system") || body.includes("update");

        return isMatchRoom || isAdminUpdate;
      });

      if (hasTargetAlert) {
        // Gently scroll to the top of the container where new alerts are prepended
        setTimeout(() => {
          if (listContainerRef.current) {
            listContainerRef.current.scrollTo({
              top: 0,
              behavior: "smooth"
            });
          }
        }, 100);
      }

      // Track all current notifications as seen
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
    }
  }, [notifications]);

  // Ask for simulated/real browser Notification permissions
  const handleTogglePush = () => {
    if (!isPushEnabled) {
      if ("Notification" in window) {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            setIsPushEnabled(true);
            new Notification("🎮 GamerZone Hub Alerts Enabled", {
              body: "You will now receive match start confirmations in real-time!",
              icon: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=100&auto=format&fit=crop"
            });
          } else {
            // Simulated permission check fallback
            setIsPushEnabled(true);
          }
        });
      } else {
        setIsPushEnabled(true);
      }
    } else {
      setIsPushEnabled(false);
    }
  };

  const getAlertIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("started") || t.includes("live") || t.includes("schedule")) {
      return (
        <div className="p-2 rounded-lg bg-gaming-neon/10 text-gaming-neon">
          <Gamepad className="h-4 w-4" />
        </div>
      );
    } else if (t.includes("won") || t.includes("win") || t.includes("withdr") || t.includes("payout")) {
      return (
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 font-bold">
          <Award className="h-4 w-4" />
        </div>
      );
    } else {
      return (
        <div className="p-2 rounded-lg bg-gaming-blue/10 text-gaming-blue">
          <Calendar className="h-4 w-4" />
        </div>
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-gaming-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bell className="h-5 w-5 text-gaming-neon" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-gaming-pink text-white font-mono font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-display font-extrabold text-white uppercase tracking-wider">MATCH ALERTS & NOTIFICATIONS</h2>
            <p className="text-xs text-gray-400">Receive live push reminders and check custom in-game announcements</p>
          </div>
        </div>

        {/* Notifications Control toggler */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleTogglePush}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold font-display uppercase tracking-wide transition flex items-center gap-1 cursor-pointer ${
              isPushEnabled
                ? "bg-gaming-neon/10 text-gaming-neon border-gaming-neon/30"
                : "border-gaming-border text-gray-450 hover:text-white"
            }`}
          >
            {isPushEnabled ? (
              <>
                <Bell className="h-3 w-3" /> PUSH ALERTS: ON
              </>
            ) : (
              <>
                <BellOff className="h-3 w-3" /> PUSH ALERTS: OFF
              </>
            )}
          </button>

          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-1 px-2 border border-gaming-border rounded-lg text-gray-400 hover:text-white hover:bg-gaming-border transition flex items-center"
            title={isSoundEnabled ? "Sound Enabled" : "Sound Muted"}
          >
            {isSoundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {onSimulateReminder && (
            <button
              onClick={onSimulateReminder}
              className="px-2.5 py-1.5 bg-gaming-blue/20 text-gaming-blue hover:bg-gaming-blue hover:text-white border border-gaming-blue/30 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
              title="Manually simulate a 15-Minute reminder right now"
            >
              🧪 TEST 15M ALERT
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={onClearAll}
              className="p-1 px-2 bg-gaming-pink/15 text-gaming-pink hover:bg-gaming-pink hover:text-white rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" /> Dismiss
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xs text-gray-400 font-sans">No alerts or push confirmations registered.</p>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">Real-time alerts will trigger when admin updates tournaments.</p>
        </div>
      ) : (
        <div ref={listContainerRef} className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
          {notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => onMarkRead(n.id)}
              className={`p-3.5 rounded-xl border transition-all flex gap-3.5 items-start cursor-pointer ${
                n.read 
                  ? "bg-gaming-bg/25 border-gaming-border/40 opacity-70" 
                  : "bg-gaming-bg border-gaming-border hover:border-gaming-blue/40"
              }`}
            >
              {getAlertIcon(n.title)}

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2.5">
                  <div className={`text-xs font-bold ${n.read ? "text-gray-300" : "text-white"}`}>
                    {n.title}
                  </div>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-gaming-neon block animate-pulse" />
                  )}
                </div>
                <p className="text-gray-400 text-xs">{n.body}</p>
                <div className="text-[9px] text-gray-500 font-mono mt-0.5">{new Date(n.createdAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
