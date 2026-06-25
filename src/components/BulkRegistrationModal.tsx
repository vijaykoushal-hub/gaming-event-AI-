import React, { useState } from "react";
import { TournamentEvent, EventRegistration, UserProfile } from "../types";
import { X, CreditCard, ArrowRight, ShieldCheck, Check, Loader2, AlertTriangle, Coins, Gamepad2 } from "lucide-react";
import { dbRegisterForTournament, dbRecordWalletTransaction } from "../firebaseService";

interface BulkModalProps {
  events: TournamentEvent[];
  user: UserProfile | null;
  onClose: () => void;
  onSuccess: (regs: EventRegistration[]) => void;
  onUpdateWallet: (newBalance: number) => void;
}

export default function BulkRegistrationModal({ events, user, onClose, onSuccess, onUpdateWallet }: BulkModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [inGameName, setInGameName] = useState(user?.username || "");
  const [inGameId, setInGameId] = useState("");
  const [teamName, setTeamName] = useState("");
  
  const totalFee = events.reduce((sum, e) => sum + (e.fee || 0), 0);
  
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "wallet">(
    user && user.walletBalance >= totalFee ? "wallet" : "upi"
  );
  
  // UPI Form
  const [upiId, setUpiId] = useState("");
  
  // Card Form
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inGameName.trim()) {
      setErrorMsg("Please enter your In-Game Username (IGN)");
      return;
    }
    if (!inGameId.trim()) {
      setErrorMsg("Please enter your In-Game ID (IGID)");
      return;
    }
    setErrorMsg("");
    if (totalFee === 0) {
      // Free tournament bypasses checkout
      handleFreeRegistration();
    } else {
      setStep(2);
    }
  };

  const handleFreeRegistration = async () => {
    setLoading(true);
    try {
      const createdRegs: EventRegistration[] = [];
      for (const event of events) {
        const regId = "REG-" + Math.floor(100000 + Math.random() * 900000);
        const newReg: EventRegistration = {
          id: regId,
          userId: user?.uid || "dev-guest",
          eventId: event.id,
          username: inGameName,
          inGameId: inGameId,
          teamName: teamName || "Solo Warrior",
          status: "registered",
          paid: true,
          createdAt: new Date().toISOString()
        };
        await dbRegisterForTournament(newReg);
        createdRegs.push(newReg);
      }
      onSuccess(createdRegs);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize registration");
    } finally {
      setLoading(false);
    }
  };

  const handlePayAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    // Validate entries
    if (paymentMethod === "upi" && !upiId.includes("@")) {
      setErrorMsg("Please enter a valid UPI ID (e.g., gamer@okaxis)");
      setLoading(false);
      return;
    }
    if (paymentMethod === "card") {
      if (cardNumber.length < 12 || !expiry || cvc.length < 3) {
        setErrorMsg("Please fill valid card information.");
        setLoading(false);
        return;
      }
    }
    if (paymentMethod === "wallet" && user && user.walletBalance < totalFee) {
      setErrorMsg("Insufficient wallet balance. Please choose another method.");
      setLoading(false);
      return;
    }

    try {
      // Execute proxy checkout API for total sum
      const checkoutRes = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName,
          cardNumber,
          expiry,
          cvc,
          upiId,
          method: paymentMethod,
          amount: totalFee,
          tournamentTitle: `Bulk Registration: ${events.length} events`
        })
      });

      const paymentData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        setErrorMsg(paymentData.error || "Payment verification declined.");
        setLoading(false);
        return;
      }

      // Payment success -> Record Document in Firestore
      const createdRegs: EventRegistration[] = [];
      for (const event of events) {
        const regId = "REG-" + Math.floor(100000 + Math.random() * 900000);
        const newReg: EventRegistration = {
          id: regId,
          userId: user?.uid || "dev-guest",
          eventId: event.id,
          username: inGameName,
          inGameId: inGameId,
          teamName: teamName || "Solo Warrior",
          status: "registered",
          paid: true,
          createdAt: new Date().toISOString()
        };
        await dbRegisterForTournament(newReg);
        createdRegs.push(newReg);
      }

      // If user paid from wallet, notify parent to reduce parent wallet state
      if (paymentMethod === "wallet" && user) {
        onUpdateWallet(user.walletBalance - totalFee);
        
        // Log wallet transaction for entry fee deduction
        await dbRecordWalletTransaction(
          user.uid,
          "deduction",
          totalFee,
          `Bulk entry fee deduction: ${events.length} tournaments`,
          "completed"
        );
      }

      onSuccess(createdRegs);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong during payment processing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0D111A] border border-gaming-border p-6 shadow-2xl relative animate-fade-in text-white">
        {/* Header close trigger */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="mb-6">
          <span className="text-[9px] font-black tracking-widest text-gaming-neon uppercase font-mono border border-gaming-neon/30 px-2 py-0.5 rounded bg-gaming-neon/5">
            ⚡ MULTI-LOBBY SECURITY ENTRY
          </span>
          <h2 className="text-xl font-extrabold font-display uppercase italic tracking-wide mt-2 text-white flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-gaming-blue" />
            Bulk Registration ({events.length} Events)
          </h2>
          <p className="text-[11px] text-gray-400 mt-1 font-sans">
            Submit your profile details once to auto-register into all selected tournaments simultaneously.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-start gap-2 animate-pulse">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-4">
            {/* Tournaments List Preview */}
            <div className="bg-[#080B11] border border-gaming-border/60 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Selected Tournaments</div>
              {events.map((evt) => (
                <div key={evt.id} className="flex justify-between items-center text-xs border-b border-gaming-border/30 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-gaming-blue font-bold font-mono text-[10px] shrink-0">🎮 {evt.game}</span>
                    <span className="text-gray-200 font-semibold truncate">{evt.title}</span>
                  </div>
                  <span className="font-mono text-gaming-neon shrink-0 ml-2">
                    {evt.fee === 0 ? "FREE" : `🪙 ${evt.fee} Coins`}
                  </span>
                </div>
              ))}
            </div>

            {/* Profile Credentials */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">
                  In-Game Username (IGN) *
                </label>
                <input
                  type="text"
                  required
                  value={inGameName}
                  onChange={(e) => setInGameName(e.target.value)}
                  placeholder="e.g. Sc0ut_OP"
                  className="w-full bg-[#080B11] border border-gaming-border focus:border-gaming-blue focus:ring-1 focus:ring-gaming-blue/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">
                  In-Game ID (IGID) *
                </label>
                <input
                  type="text"
                  required
                  value={inGameId}
                  onChange={(e) => setInGameId(e.target.value)}
                  placeholder="e.g. 5410928471"
                  className="w-full bg-[#080B11] border border-gaming-border focus:border-gaming-blue focus:ring-1 focus:ring-gaming-blue/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">
                  Team/Squad Name (Optional)
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Mortal Esports (Leave empty for Solo)"
                  className="w-full bg-[#080B11] border border-gaming-border focus:border-gaming-blue focus:ring-1 focus:ring-gaming-blue/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition font-sans"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gaming-border/40 text-xs">
              <div className="font-mono text-gray-400">
                TOTAL FEES: <span className="text-white font-extrabold text-sm font-sans ml-1">🪙 {totalFee} Coins</span>
              </div>
              <button
                type="submit"
                className="bg-gaming-blue hover:bg-gaming-blue/90 text-white text-xs font-bold font-display py-2.5 px-5 rounded-xl flex items-center gap-1.5 transition active:scale-97 cursor-pointer uppercase italic"
              >
                {totalFee === 0 ? "Register All Free" : "Proceed To Checkout"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePayAndRegister} className="space-y-4">
            {/* Pay Summary */}
            <div className="bg-[#080B11] border border-gaming-border/60 rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Secure Payment Amount</div>
                <div className="text-xl font-black text-white font-mono mt-0.5">🪙 {totalFee} Coins</div>
              </div>
              <div className="text-right text-[10px] font-mono text-gray-400">
                📥 {events.length} Lobbies Included
              </div>
            </div>

            {/* Selector list of payment channels */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Wallet Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod("wallet")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                  paymentMethod === "wallet"
                    ? "border-gaming-neon bg-gaming-neon/10 text-gaming-neon"
                    : "border-gaming-border bg-[#080B11] text-gray-400 hover:text-white"
                }`}
              >
                <Coins className="h-5 w-5" />
                <span className="text-[10px] font-bold font-display">WALLET</span>
                <span className="text-[8px] font-mono opacity-80">{user?.walletBalance || 0} Coins</span>
              </button>

              {/* UPI Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                  paymentMethod === "upi"
                    ? "border-gaming-blue bg-gaming-blue/10 text-gaming-blue"
                    : "border-gaming-border bg-[#080B11] text-gray-400 hover:text-white"
                }`}
              >
                <div className="h-5 w-5 flex items-center justify-center font-bold text-xs">UPI</div>
                <span className="text-[10px] font-bold font-display">UPI APP</span>
                <span className="text-[8px] font-mono opacity-80">Instant Direct</span>
              </button>

              {/* Card Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                  paymentMethod === "card"
                    ? "border-gaming-pink bg-gaming-pink/10 text-gaming-pink"
                    : "border-gaming-border bg-[#080B11] text-gray-400 hover:text-white"
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-[10px] font-bold font-display">CREDIT CARD</span>
                <span className="text-[8px] font-mono opacity-80">Visa/Master</span>
              </button>
            </div>

            {/* Option specific inputs */}
            {paymentMethod === "wallet" && (
              <div className="p-3 rounded-xl bg-slate-800/20 border border-gaming-border/60 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400 font-mono">Available Wallet:</span>
                  <span className="font-mono text-white font-bold">🪙 {user?.walletBalance || 0} Coins</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400 font-mono">Total Deduction:</span>
                  <span className="font-mono text-gaming-pink font-bold">-🪙 {totalFee} Coins</span>
                </div>
                <div className="h-px bg-gaming-border/40 my-1" />
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400 font-mono">New Balance:</span>
                  <span className="font-mono text-gaming-neon font-bold">
                    🪙 {user ? Math.max(0, user.walletBalance - totalFee) : 0} Coins
                  </span>
                </div>
                {user && user.walletBalance < totalFee && (
                  <div className="text-[9px] text-red-400 mt-2 font-mono flex items-center gap-1">
                    ⚠️ INSUFFICIENT WALLET BALANCE. PLEASE BUY COINS OR CHOOSE UPI/CARD TO REGISTER DIRECTLY.
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "upi" && (
              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                  ENTER YOUR UPI ID *
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. scout@okaxis"
                  className="w-full bg-[#080B11] border border-gaming-border focus:border-gaming-blue focus:ring-1 focus:ring-gaming-blue/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition font-sans"
                />
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1">
                    CARDHOLDER NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="e.g. Scout Gaming Pvt Ltd"
                    className="w-full bg-[#080B11] border border-gaming-border focus:border-gaming-pink rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1">
                    CARD NUMBER
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1111 2222 3333 4444"
                    className="w-full bg-[#080B11] border border-gaming-border focus:border-gaming-pink rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1">
                      EXPIRY DATE
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full bg-[#080B11] border border-gaming-border focus:border-gaming-pink rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1">
                      CVC CODE
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      placeholder="•••"
                      className="w-full bg-[#080B11] border border-gaming-border focus:border-gaming-pink rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer controls */}
            <div className="flex justify-between items-center pt-3 border-t border-gaming-border/40">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-gray-300 rounded-xl text-xs font-bold transition uppercase cursor-pointer"
              >
                Back
              </button>
              
              <button
                type="submit"
                disabled={loading || (paymentMethod === "wallet" && user && user.walletBalance < totalFee)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold font-display uppercase italic tracking-wide flex items-center gap-1.5 cursor-pointer border border-transparent transition-all duration-200 ${
                  paymentMethod === "wallet" && user && user.walletBalance < totalFee
                    ? "bg-slate-800 text-gray-500 cursor-not-allowed"
                    : paymentMethod === "card"
                    ? "bg-gaming-pink hover:bg-rose-500 text-white"
                    : "bg-gaming-blue hover:bg-sky-400 text-white"
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    AUTHORIZING GATE...
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 shrink-0" /> Pay & Register ({events.length} Lobbies)
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
