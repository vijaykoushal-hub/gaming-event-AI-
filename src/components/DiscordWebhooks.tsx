import React, { useState } from "react";
import { MessageSquare, Bell, Send, CheckCircle, HelpCircle, AlertCircle, Loader2 } from "lucide-react";

interface DiscordProps {
  userWebhookUrl: string;
  onSaveWebhook: (url: string) => void;
}

export default function DiscordWebhooks({ userWebhookUrl, onSaveWebhook }: DiscordProps) {
  const [webhookInput, setWebhookInput] = useState(userWebhookUrl);
  const [testMessage, setTestMessage] = useState("🎮 Alert: match matches are booting up! Check stand in room #12.");
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = () => {
    onSaveWebhook(webhookInput);
    setResponseMsg("Webhook saved to profile! Real-time alerts will automatically routing.");
    setTimeout(() => setResponseMsg(""), 4000);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookInput) {
      setErrorMsg("Please enter a Discord Webhook URL first");
      return;
    }
    setErrorMsg("");
    setResponseMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/discord-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: webhookInput,
          message: testMessage
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResponseMsg("🚀 Alert successfully received by Discord! Check your Discord channel.");
      } else {
        setErrorMsg(data.error || "Failed to trigger Webhook");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to contact proxy server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gaming-card border border-gaming-border rounded-xl p-5 shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-display font-bold text-white tracking-tight uppercase">DISCORD REAL-TIME ALERTS</h2>
          <p className="text-xs text-gray-400">Connect your server channel webhook to receive live tournament & lobby alerts!</p>
        </div>
      </div>

      <div className="bg-gaming-bg p-4 rounded-xl border border-gaming-border/80 text-xs text-gray-300 mb-5 space-y-2">
        <span className="font-bold text-white uppercase text-[10px] tracking-wider block">How to configure:</span>
        <ol className="list-decimal list-inside space-y-1 text-gray-400">
          <li>Open Discord → Server settings → Integrations → Webhooks.</li>
          <li>Click <strong className="text-white">New Webhook</strong>, customize name, choose your channel, and copy URL.</li>
          <li>Paste the copied URL below and click Send Test alert!</li>
        </ol>
      </div>

      {responseMsg && (
        <div className="bg-gaming-neon/10 border border-gaming-neon/30 text-gaming-neon p-3 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {responseMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-gaming-pink/10 border border-gaming-pink/30 text-gaming-pink p-3 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {errorMsg}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
            DISCORD WEBHOOK URL
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="flex-1 bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/60 transition font-mono"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-gaming-blue hover:opacity-95 text-xs font-bold text-white font-display transition active:scale-97 cursor-pointer"
            >
              SAVE Webhook
            </button>
          </div>
        </div>

        <form onSubmit={handleSendTest} className="space-y-3 pt-3 border-t border-gaming-border/40">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
              TEST PAYLOAD MESSAGECONTENT
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={2}
              className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue/60 transition font-sans"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !webhookInput}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white font-display transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> DISPATCHING TEST...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> SEND TEST ALERT
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
