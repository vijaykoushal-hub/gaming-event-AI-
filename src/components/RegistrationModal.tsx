import React, { useState } from "react";
import { TournamentEvent, EventRegistration, UserProfile } from "../types";
import { X, CreditCard, Laptop, ArrowRight, ShieldCheck, HelpCircle, Check, Loader2, AlertTriangle } from "lucide-react";
import { dbRegisterForTournament, dbRecordWalletTransaction } from "../firebaseService";

interface ModalProps {
  event: TournamentEvent;
  user: UserProfile | null;
  onClose: () => void;
  onSuccess: (reg: EventRegistration) => void;
  onUpdateWallet: (newBalance: number) => void;
}

export default function RegistrationModal({ event, user, onClose, onSuccess, onUpdateWallet }: ModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [inGameName, setInGameName] = useState(user?.username || "");
  const [inGameId, setInGameId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "wallet">(
    user && user.walletBalance >= event.fee ? "wallet" : "upi"
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
    if (event.fee === 0) {
      // Free tournament bypasses checkout
      handleFreeRegistration();
    } else {
      setStep(2);
    }
  };

  const handleFreeRegistration = async () => {
    setLoading(true);
    try {
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
      onSuccess(newReg);
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
        setErrorMsg("Please fill valid card information elements.");
        setLoading(false);
        return;
      }
    }
    if (paymentMethod === "wallet" && user && user.walletBalance < event.fee) {
      setErrorMsg("Insufficient wallet balance. Please choose another method.");
      setLoading(false);
      return;
    }

    try {
      // Execute proxy checkout API
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
          amount: event.fee,
          tournamentTitle: event.title
        })
      });

      const paymentData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        setErrorMsg(paymentData.error || "Payment verification declined.");
        setLoading(false);
        return;
      }

      // Payment success -> Record Document in Firestore
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

      // If user paid from wallet, notify parent to reduce parent wallet state
      if (paymentMethod === "wallet" && user) {
        onUpdateWallet(user.walletBalance - event.fee);
        
        // Log wallet transaction for entry fee deduction
        await dbRecordWalletTransaction(
          user.uid,
          "deduction",
          event.fee,
          `Entry fee deduction: ${event.title}`,
          "completed"
        );
      }

      onSuccess(newReg);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong during payment gate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gaming-bg/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-gaming-card border border-gaming-border p-6 shadow-2xl relative animate-fade-in">
        {/* Header close trigger */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white hover:bg-gaming-border p-1.5 rounded-lg transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <span className="text-[10px] font-bold font-mono text-gaming-blue tracking-widest uppercase">TOURNAMENT REGISTRATION</span>
          <h2 className="text-xl font-display font-black text-white tracking-tight uppercase leading-snug">{event.title}</h2>
          <div className="flex gap-4 mt-2 text-xs text-gray-400 font-mono">
            <span>GAME: <strong className="text-white">{event.game}</strong></span>
            <span>ENTRY FEE: <strong className="text-gaming-neon font-bold">{event.fee === 0 ? "FREE" : `🪙 ${event.fee} Coins`}</strong></span>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-gaming-pink/10 border border-gaming-pink/30 text-gaming-pink p-3 rounded-lg text-xs font-semibold mb-4 text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* STEP 1: Gamer Info Profile matching */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            {user && event.fee > 0 && user.walletBalance < event.fee && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3.5 rounded-xl text-xs space-y-1.5 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                <div className="flex items-center gap-2 font-bold font-display uppercase tracking-wide">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
                  <span>Entry Fee Warning (कम बैलेंस चेतावनी)</span>
                </div>
                <p className="leading-normal text-gray-300">
                  Your current wallet balance is <strong className="text-white">🪙 {user.walletBalance} Coins</strong>, which is lower than the required tournament entry fee of <strong className="text-white">🪙 {event.fee} Coins</strong>.
                </p>
                <p className="text-[10px] text-gray-400">
                  You can still proceed to step 2 to pay with <strong className="text-gaming-blue font-bold">UPI</strong> or <strong className="text-gaming-blue font-bold">Card</strong> to purchase coins directly, or top up your wallet beforehand.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                In-Game Username (IGN) *
              </label>
              <input
                type="text"
                value={inGameName}
                onChange={(e) => setInGameName(e.target.value)}
                placeholder="e.g. Mortal_OP"
                required
                className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-gaming-blue/60 transition font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">This will be shared in tournament standings and team charts.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                In-Game ID (IGID) *
              </label>
              <input
                type="text"
                value={inGameId}
                onChange={(e) => setInGameId(e.target.value)}
                placeholder="e.g. 518491048"
                required
                className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-gaming-blue/60 transition font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">Your numeric or alphanumeric account identifier needed to invite you.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Team / Clan Name (Optional)
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. SOULeSports (Write 'Solo' if registering single)"
                className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-gaming-blue/60 transition"
              />
            </div>

            <div className="pt-4 border-t border-gaming-border/50 flex justify-end">
              <button
                type="submit"
                id="btn_reg_step1_next"
                className="px-6 py-2.5 rounded-lg bg-gaming-blue font-display text-xs font-bold text-white hover:bg-opacity-95 flex items-center gap-1.5 transition active:scale-97 cursor-pointer"
              >
                {event.fee === 0 ? "CONFIRM FREE ENTRY" : "CONTINUE TO PAYMENT"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Checkout / Pay Entry Fee */}
        {step === 2 && (
          <form onSubmit={handlePayAndRegister} className="space-y-4">
            <div className="bg-gaming-bg p-4 rounded-xl border border-gaming-border/80 flex justify-between items-center mb-2">
              <div>
                <span className="text-xs text-gray-400">Total Entry Fee Payable</span>
                <div className="text-xl font-mono font-black text-white">🪙 {event.fee} Coins</div>
              </div>
              <div className="text-[10px] text-gray-500 font-mono text-right">
                <span>Safe SEC-3D Payment Gate</span>
                <div className="text-gaming-neon font-bold">100% Secure Coin Checkout</div>
              </div>
            </div>

            {/* Select Method Tab */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Choose Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("wallet")}
                  className={`border p-3 rounded-lg text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === "wallet"
                      ? "border-gaming-blue bg-gaming-blue/5 text-white"
                      : "border-gaming-border text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-[10px] font-mono block">🪙 Wallet</span>
                  <span className="text-[10px] font-bold text-amber-500">{user?.walletBalance || 0} Coins</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`border p-3 rounded-lg text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === "upi"
                      ? "border-gaming-blue bg-gaming-blue/5 text-white"
                      : "border-gaming-border text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-[10px] font-mono block">⚡ UPI (Instant)</span>
                  <span className="text-[10px] text-gray-500">BHIM / GPAY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`border p-3 rounded-lg text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === "card"
                      ? "border-gaming-blue bg-gaming-blue/5 text-white"
                      : "border-gaming-border text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-[10px] font-mono block">💳 Debit/Credit</span>
                  <span className="text-[10px] text-gray-500">Visa / Mcard</span>
                </button>
              </div>
            </div>

            {/* Form corresponding to selections */}
            {paymentMethod === "wallet" && (
              <div className="bg-gaming-bg/50 p-3.5 rounded-lg border border-gaming-border text-xs text-gray-400 space-y-1">
                <p>Register immediately using your wallet balance.</p>
                <div className="flex justify-between font-mono pt-1 text-white">
                  <span>Current Balance:</span>
                  <span>🪙 {user?.walletBalance} Coins</span>
                </div>
                <div className="flex justify-between font-mono text-gaming-pink">
                  <span>Deduction:</span>
                  <span>-🪙 {event.fee} Coins</span>
                </div>
                {user && user.walletBalance < event.fee && (
                  <p className="text-[10px] text-gaming-pink font-bold pt-2">❌ Insufficient balance! Please buy coins or use UPI/Card directly to register.</p>
                )}
              </div>
            )}

            {paymentMethod === "upi" && (
              <div className="space-y-2">
                <label className="block text-[10px] font-mono font-bold text-gray-400">
                  ENTER YOUR UPI HANDLE
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. user_op@okicici"
                  className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-gaming-blue/60 transition font-mono"
                />
                <p className="text-[10px] text-gray-500">Payment notification request will be sent to your UPI app.</p>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="space-y-2.5">
                <div>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Cardholder Name"
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-gaming-blue/60 transition"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                    maxLength={19}
                    placeholder="Card Number"
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-gaming-blue/60 transition font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-gaming-blue/60 transition font-mono text-center"
                  />
                  <input
                    type="password"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="CVV"
                    maxLength={4}
                    className="bg-gaming-bg border border-gaming-border rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-gaming-blue/60 transition font-mono text-center"
                  />
                </div>
              </div>
            )}

            {/* Trusted payment badges */}
            <div className="flex items-center gap-1.5 justify-center py-2 text-gray-500 text-[10px]">
              <ShieldCheck className="h-3.5 w-3.5 text-gaming-neon" />
              <span>PCI-DSS SSL Secured Gateway. Payment held in trusted winner escrow.</span>
            </div>

            {/* Buttons */}
            <div className="pt-2 border-t border-gaming-border/50 flex gap-2 justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gaming-border rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-gaming-border transition"
              >
                BACK
              </button>
              <button
                type="submit"
                id="btn_pay_confirm"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-gaming-neon font-display text-xs font-bold text-white hover:opacity-95 flex items-center gap-1.5 transition active:scale-97 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> AUTHORIZING TRANSACTION...
                  </>
                ) : (
                  <>COMFIRM PAYMENT & JOIN</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
