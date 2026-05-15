"use client";

import * as React from "react";
import { Coins, Gem, Plus } from "lucide-react";
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
  const [step, setStep] = React.useState<'select_amount' | 'select_method'>('select_amount');
  const [saving, setSaving] = React.useState(false);

  const finalAmount = Number(amount) || 0;

  // Handles the actual final "payment" processing
  const processPayment = async (method: string) => {
    if (!supabase) return;
    setSaving(true);
    
    try {
      // In a production environment, this is where you would call 
      // Stripe, Flutterwave (for Mobile Money), or PayPal APIs.
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;

      // We log the transaction officially
      const { error: txError } = await supabase
        .from("token_transactions")
        .insert({
          amount: finalAmount,
          user_id: uid || null,
          payment_method: method,
          status: 'completed'
        });

      if (txError) throw txError;

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

      toast.success(`Success! ${finalAmount} tokens added via ${method}.`);
      onSuccess(finalAmount);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Payment provider rejected the transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex justify-center bg-black/60 backdrop-blur-sm p-4 pt-20"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-full max-w-md h-fit rounded-3xl bg-white dark:bg-zinc-950 border border-white/10 p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {step === 'select_amount' ? 'Refill Tokens' : 'Secure Checkout'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
            <span className="text-xl text-zinc-500">✕</span>
          </button>
        </div>

        {step === 'select_amount' ? (
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
              placeholder="Custom amount"
            />

            <button
              className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 py-4 font-black text-white uppercase tracking-widest"
              onClick={() => setStep('select_method')}
              disabled={finalAmount <= 0}
            >
              Continue to Payment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 mb-4 text-center">Total Amount: <span className="text-zinc-900 dark:text-white font-bold">{finalAmount} Tokens</span></p>
            
            {[
              { id: 'mobile_money', label: 'Mobile Money', color: 'bg-yellow-500' },
              { id: 'card', label: 'Credit / Debit Card', color: 'bg-blue-600' },
              { id: 'paypal', label: 'PayPal', color: 'bg-blue-800' }
            ].map((method) => (
              <button
                key={method.id}
                disabled={saving}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50`}
                onClick={() => processPayment(method.label)}
              >
                <span className="font-bold">{method.label}</span>
                <div className={`w-3 h-3 rounded-full ${method.color}`} />
              </button>
            ))}

            <button 
              className="w-full text-zinc-500 text-xs font-bold uppercase mt-4"
              onClick={() => setStep('select_amount')}
            >
              ← Back to Amount
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
