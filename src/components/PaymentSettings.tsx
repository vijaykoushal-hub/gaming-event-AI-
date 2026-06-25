import React, { useState } from "react";
import { UserProfile, PaymentMethod } from "../types";
import { CreditCard, Plus, Trash2, QrCode, AlertTriangle, Check, ShieldCheck, Landmark, DollarSign, Info, Loader2 } from "lucide-react";

interface PaymentSettingsProps {
  user: UserProfile | null;
  onUpdatePaymentMethods: (methods: PaymentMethod[]) => Promise<void>;
}

export default function PaymentSettings({ user, onUpdatePaymentMethods }: PaymentSettingsProps) {
  const currentMethods = user?.paymentMethods || [];

  const [type, setType] = useState<"upi" | "bank" | "paypal">("upi");
  const [alias, setAlias] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Field states
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!alias.trim()) {
      setErrorMsg("Please enter an alias (e.g., 'Primary GPay', 'My Savings Account').");
      return;
    }

    let details = "";
    let cleanUpiId = "";
    let cleanPaypalEmail = "";
    let cleanBankName = "";
    let cleanAccountNumber = "";
    let cleanIfsc = "";
    let cleanAccountHolder = "";

    if (type === "upi") {
      cleanUpiId = upiId.trim();
      if (!cleanUpiId || !cleanUpiId.includes("@")) {
        setErrorMsg("Please enter a valid UPI address (e.g., gamer@okaxis).");
        return;
      }
      details = cleanUpiId;
    } else if (type === "paypal") {
      cleanPaypalEmail = paypalEmail.trim();
      if (!cleanPaypalEmail || !cleanPaypalEmail.includes("@")) {
        setErrorMsg("Please enter a valid PayPal email address.");
        return;
      }
      details = cleanPaypalEmail;
    } else if (type === "bank") {
      cleanBankName = bankName.trim();
      cleanAccountNumber = accountNumber.trim();
      cleanIfsc = ifsc.trim();
      cleanAccountHolder = accountHolder.trim();

      if (!cleanBankName || !cleanAccountNumber || !cleanIfsc || !cleanAccountHolder) {
        setErrorMsg("All Bank Account fields are required.");
        return;
      }
      if (cleanAccountNumber.length < 9 || isNaN(Number(cleanAccountNumber))) {
        setErrorMsg("Please enter a valid bank account number (minimum 9 digits).");
        return;
      }
      if (cleanIfsc.length !== 11) {
        setErrorMsg("IFSC code must be exactly 11 characters.");
        return;
      }

      // Mask the bank account number for security
      const visibleDigits = cleanAccountNumber.slice(-4);
      details = `${cleanBankName} (•••• ${visibleDigits})`;
    }

    const newMethod: PaymentMethod = {
      id: `pm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      alias: alias.trim(),
      details,
      upiId: type === "upi" ? cleanUpiId : undefined,
      bankName: type === "bank" ? cleanBankName : undefined,
      accountNumber: type === "bank" ? cleanAccountNumber : undefined,
      ifsc: type === "bank" ? cleanIfsc : undefined,
      accountHolder: type === "bank" ? cleanAccountHolder : undefined,
      paypalEmail: type === "paypal" ? cleanPaypalEmail : undefined,
      createdAt: new Date().toISOString()
    };

    setLoading(true);
    try {
      const updatedList = [...currentMethods, newMethod];
      await onUpdatePaymentMethods(updatedList);
      setSuccessMsg(`🎉 Successfully added payment method: "${newMethod.alias}"`);
      
      // Reset form
      setAlias("");
      setUpiId("");
      setBankName("");
      setAccountNumber("");
      setIfsc("");
      setAccountHolder("");
      setPaypalEmail("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save payment method to profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!user) return;
    setErrorMsg("");
    setSuccessMsg("");

    const target = currentMethods.find(m => m.id === id);
    if (!target) return;

    if (!confirm(`Are you sure you want to remove "${target.alias}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const updatedList = currentMethods.filter(m => m.id !== id);
      await onUpdatePaymentMethods(updatedList);
      setSuccessMsg(`🗑️ Removed "${target.alias}" successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove payment method.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="payment-settings-component">
      <div className="border-b border-gaming-border/60 pb-3.5 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-gaming-neon" /> PAYMENT SETTINGS
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">
            Manage your payment channels for lightning-fast payouts & withdrawals.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gaming-neon/10 border border-gaming-neon/20 rounded-full text-gaming-neon text-[9px] font-mono font-bold tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" /> SECURE ENDPOINT
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: List of Methods */}
        <div className="lg:col-span-7 space-y-4 bg-gaming-bg border border-gaming-border rounded-xl p-5">
          <div className="flex justify-between items-center border-b border-gaming-border/60 pb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">
              SAVED WITHDRAWAL METHODS ({currentMethods.length})
            </span>
            <span className="text-[9px] text-gray-500 font-mono">ENCRYPTED DATA</span>
          </div>

          {currentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="p-3 bg-gaming-border/20 rounded-full border border-gaming-border/40">
                <CreditCard className="h-7 w-7 text-gray-500" />
              </div>
              <p className="text-xs text-gray-400 font-semibold">No payment methods configured yet</p>
              <p className="text-[10px] text-gray-500 max-w-sm">
                Add an active UPI address, PayPal email, or Bank Account on the right to receive fast, automatic cashout settlements.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
              {currentMethods.map((m) => (
                <div
                  key={m.id}
                  className={`relative p-4 rounded-xl border transition flex flex-col justify-between h-32 overflow-hidden group select-none ${
                    m.type === "bank"
                      ? "bg-gradient-to-br from-[#1E1B4B] to-[#121620] border-indigo-500/30 hover:border-indigo-500/50"
                      : m.type === "paypal"
                      ? "bg-gradient-to-br from-[#1E3A8A] to-[#121620] border-blue-500/30 hover:border-blue-500/50"
                      : "bg-gradient-to-br from-[#064E3B] to-[#121620] border-emerald-500/30 hover:border-emerald-500/50"
                  }`}
                >
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteMethod(m.id)}
                    title="Remove method"
                    disabled={loading}
                    className="absolute top-2.5 right-2.5 p-1 rounded-md bg-black/40 hover:bg-gaming-pink/20 hover:text-gaming-pink text-gray-400 opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer disabled:opacity-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1">
                      {m.type === "bank" && (
                        <>
                          <Landmark className="h-3.5 w-3.5 text-indigo-400" />
                          BANK ACCOUNT
                        </>
                      )}
                      {m.type === "paypal" && (
                        <>
                          <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                          PAYPAL
                        </>
                      )}
                      {m.type === "upi" && (
                        <>
                          <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                          UPI PAY
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-[10px] font-mono text-gray-400 truncate pr-5">{m.alias}</div>
                    <div className="text-xs font-mono font-bold text-white mt-0.5 tracking-wider truncate">
                      {m.details}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[8px] font-mono text-gray-400 mt-2 pt-1.5 border-t border-white/5">
                    <span className="truncate max-w-[120px]">
                      {m.type === "bank" ? m.accountHolder : user?.username.toUpperCase()}
                    </span>
                    <span>
                      {m.type === "bank" ? `IFSC: ${m.ifsc}` : "INSTANT"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-gaming-blue/5 border border-gaming-blue/15 rounded-xl flex items-start gap-2.5">
            <Info className="h-4 w-4 text-gaming-blue mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-white uppercase block">Verification Rule Note</span>
              <p className="text-[9.5px] text-gray-400 leading-normal">
                Cashout requests undergo matching checks. Bank Account transfers might require up to 24 hours of approval pending RBI processing window clearances. UPI and PayPal are settled almost instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Add New Form */}
        <div className="lg:col-span-5 bg-gaming-bg border border-gaming-border rounded-xl p-5">
          <span className="block text-[10px] font-bold text-white uppercase font-mono border-b border-gaming-border pb-2 mb-4">
            ADD PAYMENT METHOD
          </span>

          {successMsg && (
            <div className="bg-gaming-neon/15 border border-gaming-neon/30 text-gaming-neon p-2.5 rounded-lg text-[10px] font-semibold mb-3">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="bg-gaming-pink/15 border border-gaming-pink/30 text-gaming-pink p-2.5 rounded-lg text-[10px] font-semibold mb-3">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddMethod} className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1.5 font-bold">Withdrawal Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setType("upi"); setErrorMsg(""); }}
                  className={`py-2 px-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition border cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    type === "upi"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-[#121620] border-gaming-border text-gray-400 hover:text-white"
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>UPI ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setType("bank"); setErrorMsg(""); }}
                  className={`py-2 px-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition border cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    type === "bank"
                      ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                      : "bg-[#121620] border-gaming-border text-gray-400 hover:text-white"
                  }`}
                >
                  <Landmark className="h-3.5 w-3.5" />
                  <span>BANK</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setType("paypal"); setErrorMsg(""); }}
                  className={`py-2 px-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition border cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    type === "paypal"
                      ? "bg-blue-500/20 border-blue-500 text-blue-400"
                      : "bg-[#121620] border-gaming-border text-gray-400 hover:text-white"
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>PAYPAL</span>
                </button>
              </div>
            </div>

            {/* Custom Alias */}
            <div>
              <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">Method Alias / Name</label>
              <input
                type="text"
                required
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder={
                  type === "upi"
                    ? "e.g., My GPay Address"
                    : type === "paypal"
                    ? "e.g., Personal PayPal Account"
                    : "e.g., HDFC Savings Account"
                }
                className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue"
              />
            </div>

            {/* Dynamic fields based on type */}
            {type === "upi" && (
              <div>
                <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">UPI ID (VPA)</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g., gamer@okaxis"
                  className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue font-mono"
                />
              </div>
            )}

            {type === "paypal" && (
              <div>
                <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">PayPal Email Address</label>
                <input
                  type="email"
                  required
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="e.g., payments@paypal.com"
                  className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue font-mono"
                />
              </div>
            )}

            {type === "bank" && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., State Bank of India"
                    className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">Account Number</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g., 30948529510"
                    className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">IFSC Code</label>
                    <input
                      type="text"
                      required
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      maxLength={11}
                      placeholder="e.g., SBIN0001234"
                      className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400 uppercase font-mono mb-1 font-bold">Account Holder</label>
                    <input
                      type="text"
                      required
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full bg-gaming-card border border-gaming-border rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-gaming-blue"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gaming-blue hover:bg-opacity-90 font-display text-xs font-bold uppercase tracking-wider text-white rounded-lg active:scale-97 transition cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" /> SAVING...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> SAVE PAYMENT METHOD
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
