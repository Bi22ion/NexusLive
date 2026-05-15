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
  const [amount, setAmount] = React.useState(250);
  const [saving, setSaving] = React.useState(false);

  // This function ensures we only close if the user clicks the dark background,
  // not the white box itself.
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 cursor-pointer"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-950 border border-white/10 p-6 shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Buy Tokens
          </h3>
          <button
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onClick={onClose}
            type="button"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[100, 250, 500].map((v) => (
              <button
                key={v}
                className={`rounded-2xl border-2 py-4 text-sm font-bold transition-all ${
                  amount === v
                    ? "border-violet-500 bg-violet-500/10 text-violet-500"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                }`}
                onClick={() => setAmount(v)}
                type="button"
              >
                {v}
              </button>
            ))}
          </div>

          <button
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 py-4 font-black text-white uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            disabled={saving}
            onClick={async () => {
              if (!supabase) return;
              setSaving(true);
              try {
                const { data: auth } = await supabase.auth.getUser();
                if (!auth.user) {
                  // Keep modal open so they can see the error
                  alert("Please sign in to buy tokens.");
                  return;
                }

                const { data } = await supabase
                  .from("profiles")
                  .select("wallet_tokens")
                  .eq("id", auth.user.id)
                  .single();

                const current = (data as any)?.wallet_tokens ?? 0;
                await supabase
                  .from("profiles")
                  .update({ wallet_tokens: current + amount })
                  .eq("id", auth.user.id);

                onSuccess(amount);
                onClose();
              } catch (e) {
                console.error(e);
              } finally {
                setSaving(false);
              }
            }}
            type="button"
          >
            {saving ? "Processing..." : "Simulate Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
