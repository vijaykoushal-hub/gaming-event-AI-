import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ShieldAlert, CheckCircle2, Lock, ArrowRight, Loader2, Sparkles, X, RefreshCw, LogOut, Code } from "lucide-react";
import { UserProfile } from "../types";

interface OTPVerificationModalProps {
  user: UserProfile;
  onVerifySuccess: (emailAddress: string) => Promise<void>;
  onLogout: () => Promise<void>;
  isDarkMode: boolean;
}

export default function OTPVerificationModal({ user, onVerifySuccess, onLogout, isDarkMode }: OTPVerificationModalProps) {
  const [emailAddress, setEmailAddress] = useState(user.email || "");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
  const [testMailboxUrl, setTestMailboxUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"phone" | "otp">("phone"); // keeping state as "phone" for internal enum compatibility or simplicity
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [maxTimer, setMaxTimer] = useState(30);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

  // Generate particles when success is true
  useEffect(() => {
    if (success) {
      const newParticles = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320,
        y: (Math.random() - 0.5) * 320 - 40,
        color: ["#14beb0", "#146ef5", "#ff4a60", "#f59e0b", "#10b981"][Math.floor(Math.random() * 5)],
        size: Math.random() * 6 + 4,
        delay: Math.random() * 0.4,
      }));
      setParticles(newParticles);
    }
  }, [success]);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasSentRef = useRef(false);

  // Timer tick down for resend code cooldown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Automatically dispatch OTP to logged-in user email on mount
  useEffect(() => {
    const initialEmail = user.email || "";
    if (initialEmail && !hasSentRef.current) {
      hasSentRef.current = true;
      
      const autoSendOTP = async () => {
        setIsAutoSending(true);
        setError("");
        try {
          const response = await fetch("/api/auth/send-verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: initialEmail.trim() })
          });

          const data = await response.json();
          if (response.ok && data.success) {
            setGeneratedOTP(data.code);
            setTestMailboxUrl(data.testMailboxUrl || null);
            setStep("otp");
            setResendTimer(30);
            setMaxTimer(30);
            setTimeout(() => {
              otpRefs.current[0]?.focus();
            }, 150);
          } else {
            setError(data.error || "Failed to dispatch verification code.");
          }
        } catch (err: any) {
          setError("Failed to connect to authentication gateway: " + (err.message || err));
        } finally {
          setIsAutoSending(false);
        }
      };

      autoSendOTP();
    }
  }, [user.email]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const processedEmail = emailAddress.trim();
    
    if (!emailRegex.test(processedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: processedEmail })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setGeneratedOTP(data.code);
        setTestMailboxUrl(data.testMailboxUrl || null);
        setStep("otp");
        setResendTimer(30);
        setMaxTimer(30);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(data.error || "Failed to dispatch verification code.");
      }
    } catch (err: any) {
      setError("Failed to connect to authentication gateway: " + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setError("");
    setOtpCode(["", "", "", "", "", ""]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress.trim() })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setGeneratedOTP(data.code);
        setTestMailboxUrl(data.testMailboxUrl || null);
        setResendTimer(45);
        setMaxTimer(45);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(data.error || "Failed to dispatch verification code.");
      }
    } catch (err: any) {
      setError("Failed to connect to authentication gateway: " + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      const nextOtp = [...otpCode];
      nextOtp[index] = "";
      setOtpCode(nextOtp);
      return;
    }

    const nextOtp = [...otpCode];
    // If user pasted a longer code or typed multiple digits
    if (cleanVal.length > 1) {
      const digits = cleanVal.slice(0, 6).split("");
      for (let i = 0; i < digits.length; i++) {
        if (index + i < 6) {
          nextOtp[index + i] = digits[i];
        }
      }
      setOtpCode(nextOtp);
      const targetIndex = Math.min(index + digits.length, 5);
      otpRefs.current[targetIndex]?.focus();
      return;
    }

    nextOtp[index] = cleanVal;
    setOtpCode(nextOtp);

    // Auto focus next box
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpCode[index] && index > 0) {
        const nextOtp = [...otpCode];
        nextOtp[index - 1] = "";
        setOtpCode(nextOtp);
        otpRefs.current[index - 1]?.focus();
      } else {
        const nextOtp = [...otpCode];
        nextOtp[index] = "";
        setOtpCode(nextOtp);
      }
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const enteredCode = otpCode.join("");
    if (enteredCode.length < 6) {
      setError("Please complete the 6-digit confirmation code.");
      return;
    }

    if (enteredCode !== generatedOTP) {
      setError("Incorrect verification PIN. Please review the dispatched confirmation code and try again.");
      return;
    }

    setIsLoading(true);

    try {
      // Save verification status via the parent callback to update the active Firestore user profile
      await onVerifySuccess(emailAddress.trim());
      setSuccess(true);
    } catch (err: any) {
      setError("Failed to record lock authorization: " + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`w-full max-w-md rounded-2xl border shadow-2xl relative overflow-hidden transition-all duration-300 font-sans ${
          isDarkMode
            ? "bg-gaming-card border-gaming-border text-gray-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Animated Accent top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-gaming-pink via-gaming-blue to-gaming-neon animate-pulse" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                isDarkMode 
                  ? "bg-gaming-blue/15 text-gaming-blue border border-gaming-blue/20" 
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}>
                <Lock className="h-2.5 w-2.5" /> SECURE HANDSHAKE
              </span>
              <h3 className="text-lg font-display font-extrabold tracking-tight uppercase">
                Device Authorization
              </h3>
            </div>
            
            <button
              onClick={onLogout}
              className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                isDarkMode
                  ? "border-gaming-border hover:bg-white/5 text-gray-400 hover:text-white"
                  : "border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800"
              }`}
              title="Sign Out Account"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          </div>

          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
            isDarkMode
              ? "bg-[#12161F] border-gaming-border/60 text-gray-300"
              : "bg-slate-50 border-slate-150 text-slate-650"
          }`}>
            <Mail className={`h-5 w-5 shrink-0 ${isDarkMode ? "text-gaming-neon" : "text-emerald-500"}`} />
            <div>
              <p className="font-semibold text-white">Verification Mandate</p>
              <p className="mt-0.5">
                Verify your email address using an OTP security check to activate anti-cheat, bind your wallet payouts, and enter custom gaming lobbies.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2.5"
            >
              <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Render Steps */}
          <AnimatePresence mode="wait">
            {!success ? (
              isAutoSending ? (
                <motion.div
                  key="auto-sending-step"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-6 text-center space-y-4"
                >
                  <div className="flex justify-center">
                    <Loader2 className="h-10 w-10 text-gaming-blue animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-display font-extrabold text-white uppercase tracking-wider">
                      Sending Secure OTP Code...
                    </h4>
                    <p className="text-xs text-gray-400 font-mono">
                      {emailAddress}
                    </p>
                    <div className="max-w-xs mx-auto p-3.5 rounded-xl bg-gaming-blue/10 border border-gaming-blue/20 text-[11px] text-gray-300 space-y-2 leading-normal">
                      <p className="text-gaming-blue font-bold">📧 Direct Delivery Active (डायरेक्ट डिलीवरी):</p>
                      <p>We are dispatching the verification OTP directly to the email you used to login!</p>
                      <p className="opacity-90 text-gray-400">हम आपके लॉगिन ईमेल पर सीधे वेरिफिकेशन OTP भेज रहे हैं! कृपया प्रतीक्षा करें...</p>
                    </div>
                  </div>
                </motion.div>
              ) : step === "phone" ? (
                <motion.form
                  key="email-step"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleEmailSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-mono font-bold uppercase ${
                      isDarkMode ? "text-gray-400" : "text-slate-500"
                    }`}>
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type="email"
                        required
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="Enter your email address"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-1 transition-all ${
                          isDarkMode
                            ? "bg-[#0B0F17] border-gaming-border focus:border-gaming-blue/60 focus:ring-gaming-blue/30 text-white placeholder-gray-650"
                            : "bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-200 text-slate-800"
                        }`}
                      />
                    </div>
                    <div className="rounded-lg p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-400 space-y-1">
                      <p className="font-bold">⚠️ Notice (ध्यान दें):</p>
                      <p>Since this is a development preview container, real emails are simulated. Your 6-digit verification code will be displayed instantly in the <span className="text-gaming-neon font-black font-mono">Carrier Signal Relay</span> box on the next screen!</p>
                      <p className="opacity-90">चूंकि यह एक डेवलपमेंट सैंडबॉक्स है, वास्तविक ईमेल डिलीवर नहीं होगी। अगला बटन दबाने पर आपको <span className="text-gaming-neon font-black">Carrier Signal Relay</span> में तुरंत OTP कोड मिल जाएगा!</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      isLoading
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-gaming-blue hover:bg-gaming-blue/90 text-white shadow-[0_4px_14px_rgba(20,110,245,0.3)] active:scale-[0.98]"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>DISPATCHING SECURITY OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>DISPATCH SECURITY CODE</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="otp-step"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleVerifyOTP}
                  className="space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-mono font-bold uppercase ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
                        Enter Verification PIN
                      </span>
                      <span className="text-gray-500 truncate max-w-[200px]">Sent to: {emailAddress}</span>
                    </div>

                    {/* Numeric PIN grid inputs */}
                    <div className="flex justify-between gap-1.5 sm:gap-2">
                      {otpCode.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          ref={(el) => { otpRefs.current[idx] = el; }}
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={1}
                          required
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className={`w-12 h-14 sm:w-14 sm:h-14 rounded-xl text-center text-xl font-mono font-black focus:outline-none focus:ring-1 transition-all ${
                            isDarkMode
                              ? "bg-[#0B0F17] border-gaming-border focus:border-gaming-neon/60 focus:ring-gaming-neon/30 text-gaming-neon shadow-[0_0_8px_rgba(20,184,166,0.05)]"
                              : "bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-100 text-slate-800"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Simulation Console Banner displaying generated code */}
                    {generatedOTP && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3.5 rounded-xl border border-dashed bg-gaming-neon/10 border-gaming-neon/40 flex flex-col gap-2.5 text-xs font-mono shadow-[0_0_15px_rgba(20,184,166,0.15)] animate-pulse"
                      >
                        <div className="flex items-center justify-between gap-1.5 text-gaming-neon border-b border-gaming-neon/20 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Code className="h-4 w-4 shrink-0" />
                            <span className="font-extrabold uppercase tracking-wide">Carrier Signal OTP Relay</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-gaming-neon text-black font-extrabold">SANDBOX ACTIVE</span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                          <span className="text-gray-300 font-bold">YOUR LIVE CODE (आपका कोड):</span>
                          <strong className="text-[#FF4A60] dark:text-gaming-neon text-base tracking-widest px-2.5 py-1 rounded-md bg-black/50 border border-gaming-neon/30 font-black">
                            {generatedOTP}
                          </strong>
                        </div>
                        
                        {testMailboxUrl && (
                          <div className="bg-gaming-blue/15 border border-gaming-blue/35 p-3 rounded-lg flex flex-col gap-2 font-sans text-left">
                            <p className="text-[10px] text-gray-300 font-medium leading-normal">
                              📬 <span className="text-white font-black">Real Email Dispatched (वर्चुअल ईमेल भेजी गई):</span> This styled email with your security code was successfully sent over real SMTP to a temporary mailbox!
                            </p>
                            <a
                              href={testMailboxUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="w-full py-1.5 px-3 rounded bg-gaming-blue hover:bg-gaming-blue/95 border border-transparent shadow-[0_2px_8px_rgba(20,110,245,0.45)] text-white text-[10px] font-bold uppercase tracking-wider text-center transition flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-[0_0_12px_rgba(20,110,245,0.7)] active:scale-97"
                            >
                              <span>Open Real Email Inbox 📧 ↗</span>
                            </a>
                          </div>
                        )}

                        <div className="text-[10px] text-gray-400 font-sans leading-normal">
                          <p className="text-white font-medium">👉 Copy this 6-digit code and enter/paste it in the input boxes above to verify instantly!</p>
                          <p className="mt-0.5 text-gray-400">👉 इस 6-अंकों के कोड को कॉपी करें और सीधे ऊपर बॉक्सेस में डालकर तुरंत वेरीफाई करें!</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Countdown Timer Visual Progress */}
                  {resendTimer > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all duration-300 font-mono text-xs ${
                        isDarkMode 
                          ? "bg-gaming-pink/5 border-gaming-pink/15 text-gray-300 shadow-[0_0_15px_rgba(255,74,96,0.03)]" 
                          : "bg-pink-50 border-pink-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 text-gaming-pink animate-spin" style={{ animationDuration: "4s" }} />
                          <span className="font-bold uppercase tracking-wide">OTP REFRESH WINDOW</span>
                        </div>
                        <span className="text-gaming-pink font-black text-xs">
                          {resendTimer}s remaining
                        </span>
                      </div>
                      <div className="w-full bg-black/40 dark:bg-[#030712] rounded-full h-1.5 overflow-hidden border border-white/5">
                        <motion.div 
                          className="bg-gaming-pink h-full rounded-full"
                          initial={{ width: "100%" }}
                          animate={{ width: `${(resendTimer / maxTimer) * 100}%` }}
                          transition={{ duration: 1, ease: "linear" }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 leading-normal">
                        Please check your inbox or the signal relay above. You can request a fresh verification handshake code once this cooldown expires.
                      </p>
                    </motion.div>
                  )}

                  {/* Buttons */}
                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl bg-gaming-neon hover:bg-gaming-neon/90 text-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_4px_14px_rgba(20,184,166,0.3)] active:scale-[0.98] disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>INTERLINING HANDSHAKE...</span>
                        </>
                      ) : (
                        <>
                          <span>AUTHENTICATE & DEPLOY ACCESS</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    <div className="flex justify-between items-center text-[11px] font-mono select-none px-1">
                      <button
                        type="button"
                        onClick={() => setStep("phone")}
                        className="text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" /> Change Email
                      </button>

                      <button
                        type="button"
                        disabled={resendTimer > 0}
                        onClick={handleResendOTP}
                        className={`transition flex items-center gap-1 cursor-pointer ${
                          resendTimer > 0 
                            ? "text-gray-500 cursor-not-allowed" 
                            : "text-gaming-pink hover:text-gaming-pink/80"
                        }`}
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP Code"}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )
            ) : (
              <motion.div
                key="success-screen"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-5 relative overflow-visible"
              >
                {/* Floating particle burst */}
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      left: "50%",
                      top: "20%",
                    }}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x: p.x,
                      y: p.y,
                      scale: 0.2,
                      rotate: Math.random() * 360,
                    }}
                    transition={{
                      duration: 1.8,
                      delay: p.delay,
                      ease: "easeOut",
                    }}
                  />
                ))}

                <div className="flex justify-center relative py-4">
                  {/* Outer glowing ripple rings */}
                  <motion.div 
                    className="absolute rounded-full bg-gaming-neon/5 border border-gaming-neon/20"
                    initial={{ width: 60, height: 60, opacity: 0.8 }}
                    animate={{ width: 140, height: 140, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeOut" }}
                  />
                  <motion.div 
                    className="absolute rounded-full bg-gaming-neon/10 border border-gaming-neon/30"
                    initial={{ width: 60, height: 60, opacity: 0.6 }}
                    animate={{ width: 100, height: 100, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2.2, delay: 0.7, ease: "easeOut" }}
                  />

                  {/* Pulsing Icon container */}
                  <motion.div 
                    className="relative p-5 bg-gaming-neon/15 rounded-full border-2 border-gaming-neon shadow-[0_0_30px_rgba(20,184,166,0.3)]"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: [0, 1.15, 1], rotate: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    >
                      <CheckCircle2 className="h-10 w-10 text-gaming-neon" />
                    </motion.div>
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-display font-extrabold text-white uppercase tracking-wider">
                    Lock authorization Success!
                  </h4>
                  <p className="text-[11.5px] text-gray-400 max-w-sm mx-auto">
                    Device secure handshake successful! Email <span className="font-mono text-white font-bold">{emailAddress}</span> is now provisioned & cryptographically locked to your profile.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[10px] text-gray-500 font-mono text-left space-y-1 max-w-sm mx-auto">
                  <div>• PROFILE NODE: verified</div>
                  <div>• DEVICE HASH: SHA-256 SECURED</div>
                  <div>• SHARP SHOOTER: active</div>
                </div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-gaming-neon to-gaming-blue text-black font-display font-black text-xs uppercase tracking-wider active:scale-[0.98] transition cursor-pointer"
                >
                  ENTER ARENA TOURNAMENTS
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
