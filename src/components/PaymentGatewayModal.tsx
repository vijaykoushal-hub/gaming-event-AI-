import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, ShieldCheck, Lock, CreditCard, Landmark, CheckCircle2, 
  AlertCircle, Smartphone, KeyRound, Loader2, ArrowRight
} from "lucide-react";
import { SavedPaymentMethod } from "./UserDashboard";

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  paymentMethod: SavedPaymentMethod | null;
  onSuccess: () => void;
  isDarkMode?: boolean;
  isSoundMuted?: boolean;
}

export default function PaymentGatewayModal({
  isOpen,
  onClose,
  amount,
  paymentMethod,
  onSuccess,
  isDarkMode = true,
  isSoundMuted = false
}: PaymentGatewayModalProps) {
  const [pin, setPin] = useState<string>("");
  const [cvv, setCvv] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [step, setStep] = useState<"auth" | "otp" | "processing" | "success" | "error">("auth");
  const [loadingText, setLoadingText] = useState<string>("Initializing encrypted connection...");
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setCvv("");
      setOtp("");
      setStep("auth");
      setProgress(0);
      setErrorMsg("");
    }
  }, [isOpen]);

  if (!isOpen || !paymentMethod) return null;

  // Sound play helper
  const playSfx = (url: string, vol: number = 0.45) => {
    if (!isSoundMuted && "Audio" in window) {
      const sfx = new Audio(url);
      sfx.volume = vol;
      sfx.play().catch((e) => console.log("SFX play failed", e));
    }
  };

  const startProcessing = () => {
    setStep("processing");
    setProgress(15);
    setLoadingText("Establishing 256-bit secure gateway connection...");

    // Step 1: Gateway Hook
    setTimeout(() => {
      setProgress(45);
      setLoadingText(`Routing ₹${amount.toLocaleString("en-IN")} INR request to buy ${amount} Coins through NPCI / Bank Servers...`);
      playSfx("https://assets.mixkit.co/active_storage/sfx/2568/2568-200.wav", 0.2);
    }, 1200);

    // Step 2: Bank Approval
    setTimeout(() => {
      setProgress(80);
      setLoadingText("Verifying security parameters and account balance...");
    }, 2400);

    // Step 3: Success Action
    setTimeout(() => {
      setProgress(100);
      setStep("success");
      playSfx("https://assets.mixkit.co/active_storage/sfx/2019/2019-200.wav", 0.55);
    }, 3800);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod.type === "upi") {
      if (pin.length < 4) {
        setErrorMsg("Please enter a valid 4 or 6-digit UPI PIN");
        return;
      }
      startProcessing();
    } else {
      if (cvv.length < 3) {
        setErrorMsg("Please enter a valid 3-digit CVV number");
        return;
      }
      // Cards trigger a simulated 3D Secure OTP verification
      setStep("otp");
      playSfx("https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav", 0.3);
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setErrorMsg("Please enter the 6-digit OTP sent to your registered mobile");
      return;
    }
    startProcessing();
  };

  const handleKeyPress = (num: string) => {
    setErrorMsg("");
    if (paymentMethod.type === "upi") {
      if (pin.length < 6) {
        setPin(prev => prev + num);
        playSfx("https://assets.mixkit.co/active_storage/sfx/2568/2568-200.wav", 0.15);
      }
    } else if (step === "otp") {
      if (otp.length < 6) {
        setOtp(prev => prev + num);
        playSfx("https://assets.mixkit.co/active_storage/sfx/2568/2568-200.wav", 0.15);
      }
    }
  };

  const handleBackspace = () => {
    if (paymentMethod.type === "upi") {
      setPin(prev => prev.slice(0, -1));
    } else if (step === "otp") {
      setOtp(prev => prev.slice(0, -1));
    }
    playSfx("https://assets.mixkit.co/active_storage/sfx/2568/2568-200.wav", 0.1);
  };

  const handleClear = () => {
    if (paymentMethod.type === "upi") {
      setPin("");
    } else if (step === "otp") {
      setOtp("");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/85">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full max-w-md border rounded-2xl overflow-hidden shadow-2xl relative ${
            isDarkMode 
              ? "bg-[#06080C] border-gaming-border text-white" 
              : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          {/* Header Glow Band */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#5865F2] via-gaming-blue to-gaming-neon" />

          {/* Close button - only show if not processing/success */}
          {step !== "processing" && step !== "success" && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}

          {/* Secure gateway badge */}
          <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-gaming-border/30 bg-[#0A0D14]/50">
            <div className="flex items-center gap-1.5 text-gaming-neon">
              <ShieldCheck className="h-4.5 w-4.5" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                Elite Payment Gateway
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-mono">
              <Lock className="h-3 w-3 text-gray-500" /> Secure 256-bit SSL
            </div>
          </div>

          <div className="p-6">
            {/* Step 1: Authentication Input */}
            {step === "auth" && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest block">Checkout Amount</span>
                  <h2 className="text-2xl font-mono font-black text-white">
                    🪙 {amount.toLocaleString("en-IN")} Coins
                  </h2>
                  <div className="text-[11px] text-gray-400 mt-1">Cost: ₹{amount.toLocaleString("en-IN")} INR (1 Coin = ₹1 INR)</div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 mt-1">
                    {paymentMethod.type === "upi" ? (
                      <Smartphone className="h-3.5 w-3.5 text-gaming-blue" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5 text-gaming-blue" />
                    )}
                    <span className="text-[11px] font-medium font-mono text-gray-300">
                      Paying via {paymentMethod.alias} ({paymentMethod.details})
                    </span>
                  </div>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="bg-gaming-pink/10 border border-gaming-pink/30 text-gaming-pink p-2.5 rounded-lg text-[10px] flex items-center gap-1.5 font-mono">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errorMsg}
                    </div>
                  )}

                  {paymentMethod.type === "upi" ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5 text-center">
                        <label className="block text-[11px] text-gray-300 uppercase font-mono tracking-wider font-bold">
                          Enter UPI PIN
                        </label>
                        <p className="text-[9px] text-gray-500 font-sans">
                          Enter your bank transaction PIN to authorize this transfer
                        </p>
                        
                        {/* Dot indicator fields */}
                        <div className="flex justify-center gap-3.5 py-3">
                          {[0, 1, 2, 3, 4, 5].map((idx) => (
                            <div
                              key={idx}
                              className={`h-4.5 w-4.5 rounded-full border transition-all duration-150 ${
                                pin.length > idx
                                  ? "bg-gaming-neon border-gaming-neon scale-110 shadow-[0_0_8px_rgba(54,211,153,0.6)]"
                                  : "border-gaming-border bg-transparent"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Custom Tactile Keypad */}
                      <div className="grid grid-cols-3 gap-2 bg-[#090C12] p-3.5 rounded-xl border border-gaming-border/40 max-w-[280px] mx-auto">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleKeyPress(num)}
                            className="h-11 rounded-lg bg-gaming-card/40 border border-gaming-border/40 hover:border-gaming-blue hover:text-white font-mono font-bold text-sm text-gray-300 flex items-center justify-center transition active:scale-90 cursor-pointer"
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleClear}
                          className="h-11 rounded-lg bg-gaming-card/25 text-[10px] font-bold font-mono text-gray-500 hover:text-gaming-pink flex items-center justify-center transition active:scale-90 cursor-pointer"
                        >
                          RESET
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKeyPress("0")}
                          className="h-11 rounded-lg bg-gaming-card/40 border border-gaming-border/40 hover:border-gaming-blue hover:text-white font-mono font-bold text-sm text-gray-300 flex items-center justify-center transition active:scale-90 cursor-pointer"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={handleBackspace}
                          className="h-11 rounded-lg bg-gaming-card/25 text-[10px] font-bold font-mono text-gray-500 hover:text-amber-500 flex items-center justify-center transition active:scale-90 cursor-pointer"
                        >
                          DELETE
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={pin.length < 4}
                        className="w-full py-2.5 bg-gaming-neon text-black font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-opacity-90 transition active:scale-97 cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Authorize & Buy {amount} Coins (Pay ₹{amount.toLocaleString("en-IN")} INR) <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    // Card payment CVV input
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-gray-300 uppercase font-mono tracking-wider font-bold">
                          Confirm CVV / Security Code
                        </label>
                        <p className="text-[9.5px] text-gray-500 font-sans leading-normal">
                          Please verify your payment by entering the 3-digit CVV printed on the back of your card.
                        </p>
                        <div className="relative mt-2">
                          <input
                            type="password"
                            maxLength={3}
                            placeholder="•••"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                            className="w-full text-center tracking-widest bg-gaming-card/80 border border-gaming-border rounded-xl py-2 px-3 text-lg font-mono font-black text-white focus:outline-none focus:border-gaming-blue"
                            required
                          />
                          <KeyRound className="absolute right-3.5 top-3 text-gray-500 h-4.5 w-4.5" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={cvv.length < 3}
                        className="w-full py-2.5 bg-gaming-blue text-white font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-opacity-90 transition active:scale-97 cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-40"
                      >
                        Confirm Security CVV <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Step 2: simulated OTP Screen for cards */}
            {step === "otp" && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest block">Two-Factor OTP Security</span>
                  <h2 className="text-lg font-bold text-white">Confirm Simulated Bank OTP</h2>
                  <p className="text-[9.5px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                    A verification passcode has been dispatched to your bank registered mobile number (••••• ••901).
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="bg-gaming-pink/10 border border-gaming-pink/30 text-gaming-pink p-2.5 rounded-lg text-[10px] flex items-center gap-1.5 font-mono">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {errorMsg}
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Simulated code indicator box */}
                    <div className="bg-gaming-neon/5 border border-gaming-neon/20 rounded-lg p-2 text-center text-[10px] font-mono text-gaming-neon">
                      💡 SIMULATED CODE DISPATCHED: <strong className="text-white text-[11px] tracking-wide">482093</strong>
                    </div>

                    <div className="flex justify-center gap-2 py-1">
                      {[0, 1, 2, 3, 4, 5].map((idx) => (
                        <div
                          key={idx}
                          className={`h-9 w-9 rounded-lg border flex items-center justify-center font-mono font-bold text-sm transition-all duration-150 ${
                            otp.length > idx
                              ? "border-gaming-blue bg-gaming-blue/10 text-white"
                              : "border-gaming-border text-gray-500"
                          }`}
                        >
                          {otp[idx] ? "•" : ""}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tactile Keypad */}
                  <div className="grid grid-cols-3 gap-2 bg-[#090C12] p-3.5 rounded-xl border border-gaming-border/40 max-w-[280px] mx-auto">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeyPress(num)}
                        className="h-11 rounded-lg bg-gaming-card/40 border border-gaming-border/40 hover:border-gaming-blue hover:text-white font-mono font-bold text-sm text-gray-300 flex items-center justify-center transition active:scale-90 cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="h-11 rounded-lg bg-gaming-card/25 text-[10px] font-bold font-mono text-gray-500 hover:text-gaming-pink flex items-center justify-center transition active:scale-90 cursor-pointer"
                    >
                      RESET
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeyPress("0")}
                      className="h-11 rounded-lg bg-gaming-card/40 border border-gaming-border/40 hover:border-gaming-blue hover:text-white font-mono font-bold text-sm text-gray-300 flex items-center justify-center transition active:scale-90 cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="h-11 rounded-lg bg-gaming-card/25 text-[10px] font-bold font-mono text-gray-500 hover:text-amber-500 flex items-center justify-center transition active:scale-90 cursor-pointer"
                    >
                      DELETE
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={otp.length < 6}
                    className="w-full py-2.5 bg-gaming-neon text-black font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-opacity-90 transition active:scale-97 cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-40"
                  >
                    Confirm & Complete Checkout
                  </button>
                </form>
              </div>
            )}

            {/* Step 3: Processing loader screen */}
            {step === "processing" && (
              <div className="py-8 text-center space-y-6">
                <div className="relative flex justify-center items-center">
                  <Loader2 className="h-16 w-16 text-gaming-blue animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono font-black text-gaming-neon">
                      {progress}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-white">
                    🔒 PROCESSING TRANSACTION
                  </h3>
                  <p className="text-[10.5px] text-gray-400 font-mono leading-relaxed max-w-xs mx-auto animate-pulse">
                    {loadingText}
                  </p>
                </div>

                {/* Micro linear bar */}
                <div className="h-1 w-44 bg-white/5 rounded-full mx-auto overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-gaming-blue to-gaming-neon transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Success confirmation screen */}
            {step === "success" && (
              <div className="py-6 text-center space-y-6">
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0.6, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="h-16 w-16 rounded-full bg-gaming-neon/10 border-2 border-gaming-neon flex items-center justify-center shadow-[0_0_20px_rgba(54,211,153,0.35)]"
                  >
                    <CheckCircle2 className="h-9 w-9 text-gaming-neon" />
                  </motion.div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-gaming-neon uppercase tracking-widest font-extrabold block">
                    TRANSACTION SUCCESSFUL
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    🪙 {amount.toLocaleString("en-IN")} Coins Purchased
                  </h3>
                  <p className="text-[10.5px] text-gray-400 leading-relaxed max-w-xs mx-auto font-sans">
                    Your wallet balance has been successfully topped up with 🪙 {amount} Coins (Cost: ₹{amount} INR). The funds are immediately available for tournament buy-ins!
                  </p>
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1 font-mono max-w-xs mx-auto text-left">
                  <div className="flex justify-between text-[9px] text-gray-400">
                    <span>TRANSACTION ID</span>
                    <span className="text-white">TXN-{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400">
                    <span>PAYMENT METHOD</span>
                    <span className="text-white">{paymentMethod.alias} ({paymentMethod.details})</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400">
                    <span>SETTLEMENT STATUS</span>
                    <span className="text-gaming-neon font-bold">SETTLED (INSTANT)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSuccess}
                  className="w-full py-2.5 bg-gaming-neon text-black font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-opacity-90 transition active:scale-97 cursor-pointer"
                >
                  Done, Go back
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
