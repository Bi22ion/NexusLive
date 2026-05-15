"use client";

import * as React from "react";
 import { Coins, Gem, Plus, Smartphone, QrCode, ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image"; // Needed for your QR code image
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  role: string;
  wallet_tokens?: number | null;
  wallet_diamonds?: number | null;
};

export function WalletHeader() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [buyOpen, setBuyOpen] = React.useState(false);

  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,role,wallet_tokens,wallet_diamonds")
        .eq("id", uid)
        .single();

      if (active) {
        if (error) {
          toast.error("Wallet failed to load");
          setProfile(null);
        } else {
          setProfile(data as unknown as ProfileRow);
        }
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  const isHost =
    profile?.role === "host" ||
    profile?.role === "agency_master" ||
    profile?.role === "super_admin";

  const label = isHost ? "Diamonds" : "Tokens";
  const value = isHost
    ? profile?.wallet_diamonds ?? 0
    : profile?.wallet_tokens ?? 0;
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-3 py-1.5">
        {isHost ? (
          <Gem className="h-4 w-4 text-cyan-400" />
        ) : (
          <Coins className="h-4 w-4 text-violet-500" />
        )}
        <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {loading ? "…" : safeValue.toLocaleString()}
        </span>
      </div>

      {!isHost ? (
        <button
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => setBuyOpen(true)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Buy
        </button>
      ) : null}

      {buyOpen ? (
        <BuyTokensModal
          onClose={() => setBuyOpen(false)}
          onSuccess={(delta) => {
            setProfile((p) =>
              p
                ? { ...p, wallet_tokens: (p.wallet_tokens ?? 0) + delta }
                : p
            );
          }}
        />
      ) : null}
    </div>
  );
}

 function BuyTokensModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (delta: number) => void;
}) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [amount, setAmount] = React.useState<number | string>(250);
  // Steps: select_amount -> select_method -> (momo_input OR qr_display) -> processing
  const [step, setStep] = React.useState<'select_amount' | 'select_method' | 'momo_input' | 'qr_display' | 'processing'>('select_amount');
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const finalAmount = Number(amount) || 0;
  const adminNumber = "+256708109280"; // Your Airtel Revenue Number

  const handleFinalizePayment = async (method: string) => {
    if (!supabase) return;
    setSaving(true);
    setStep('processing');
    
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;

      // 1. Record the transaction in the database
      const { error: txError } = await supabase
        .from("token_transactions")
        .insert({
          amount: finalAmount,
          user_id: uid || null,
          payment_method: method,
          status: 'completed',
          transaction_ref: method === 'Mobile Money' ? phone : 'QR_SCAN'
        });

      if (txError) throw txError;

      // 2. Update user wallet if logged in
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_tokens")
          .eq("id", uid)
          .single();

        const current = (profile as any)?.wallet_tokens ?? 0;
        await supabase
          .from("profiles")
          .update({ wallet_tokens: current + finalAmount })
          .eq("id", uid);
      }

      toast.success(`Success! ${finalAmount} tokens added.`);
      onSuccess(finalAmount);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Payment failed to verify.");
      setStep('select_method');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex justify-center bg-black/80 backdrop-blur-md p-4 pt-20"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-full max-w-md h-fit rounded-3xl bg-white dark:bg-zinc-950 border border-white/10 p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-6">
          {step !== 'select_amount' && (
            <button 
              onClick={() => setStep(step === 'processing' ? 'select_method' : 'select_method')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {step === 'select_amount' ? 'Refill Tokens' : 'Payment Details'}
          </h3>
        </div>

        {/* STEP 1: Select Amount */}
        {step === 'select_amount' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[100, 250, 500].map((v) => (
                <button
                  key={v}
                  className={`rounded-2xl border-2 py-3 font-bold transition-all ${
                    amount === v ? "border-violet-500 bg-violet-500/10 text-violet-500" : "border-zinc-200 dark:border-zinc-800"
                  }`}
                  onClick={() => setAmount(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl py-4 px-4 font-bold text-lg outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Enter amount"
            />
            <button
              className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 py-4 font-black text-white uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
              onClick={() => setStep('select_method')}
              disabled={finalAmount <= 0}
            >
              CONTINUE
            </button>
          </div>
        )}

        {/* STEP 2: Select Method */}
        {step === 'select_method' && (
          <div className="space-y-3">
            <button
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              onClick={() => setStep('momo_input')}
            >
              <div className="flex items-center gap-4">
                <Smartphone className="text-yellow-500" />
                <div className="text-left">
                  <p className="font-bold">Mobile Money</p>
                  <p className="text-[10px] text-zinc-500 uppercase">Airtel & MTN Uganda</p>
                </div>
              </div>
            </button>

            <button
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              onClick={() => setStep('qr_display')}
            >
              <div className="flex items-center gap-4">
                <QrCode className="text-violet-500" />
                <div className="text-left">
                  <p className="font-bold">Scan QR Code</p>
                  <p className="text-[10px] text-zinc-500 uppercase">Instant Merchant Pay</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* STEP 3: Mobile Money Input */}
        {step === 'momo_input' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">Enter your phone number. You will receive a PIN prompt to authorize the payment to <span className="font-bold text-zinc-900 dark:text-white">{adminNumber}</span>.</p>
            <input 
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0708XXXXXX"
              className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl py-4 px-4 font-bold text-lg outline-none border-2 border-transparent focus:border-yellow-500 transition-all"
            />
            <button
              className="w-full rounded-2xl bg-yellow-500 py-4 font-black text-white uppercase tracking-widest shadow-lg shadow-yellow-500/20"
              onClick={() => handleFinalizePayment('Mobile Money')}
              disabled={phone.length < 10}
            >
              REQUEST PIN PROMPT
            </button>
          </div>
        )}

        {/* STEP 4: QR Display */}
        {step === 'qr_display' && (
          <div className="space-y-4 text-center">
            <div className="relative mx-auto w-48 h-48 rounded-2xl overflow-hidden border-4 border-zinc-100 dark:border-zinc-800">
              <Image 
                src="/QR PAY.jpeg" 
                alt="Payment QR" 
                fill 
                className="object-cover"
              />
            </div>
            <p className="text-xs text-zinc-500 px-4 leading-relaxed">
              Scan this QR code using your banking or Momo app. Money is sent directly to the admin account.
            </p>
            <button
              className="w-full rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black py-4 font-black uppercase tracking-widest"
              onClick={() => handleFinalizePayment('QR Code')}
            >
              I HAVE PAID
            </button>
          </div>
        )}

        {/* STEP 5: Processing / OTP Simulation */}
        {step === 'processing' && (
          <div className="py-10 text-center space-y-4">
            <Loader2 className="h-12 w-12 text-violet-500 animate-spin mx-auto" />
            <h4 className="text-lg font-bold">Waiting for PIN...</h4>
            <p className="text-sm text-zinc-500 px-6">
              A USSD push has been sent to <span className="font-bold">{phone || 'your phone'}</span>. Please enter your PIN to authorize the transfer to {adminNumber}.
            </p>
          </div>
        )}

        <button 
          className="w-full py-4 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors uppercase tracking-widest mt-2"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
