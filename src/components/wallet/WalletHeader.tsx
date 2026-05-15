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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Buy Tokens (simulated)</div>
          <button
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">
            Amount
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[100, 250, 500].map((v) => (
              <button
                key={v}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  amount === v
                    ? "border-transparent bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
                    : "border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                }`}
                onClick={() => setAmount(v)}
                type="button"
              >
                {v}
              </button>
            ))}
          </div>

          <button
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
            onClick={async () => {
              if (!supabase) return toast.error("Missing Supabase env vars");
              setSaving(true);
              try {
                const { data: auth } = await supabase.auth.getUser();
                const uid = auth.user?.id;
                if (!uid) {
                  toast.error("Sign in required");
                  return;
                }

                // Simple demo: update profiles.wallet_tokens (assumes RLS allows self update).
                const { data, error } = await supabase
                  .from("profiles")
                  .select("wallet_tokens")
                  .eq("id", uid)
                  .single();
                if (error) throw error;

                const current = (data as any)?.wallet_tokens ?? 0;
                const { error: upErr } = await supabase
                  .from("profiles")
                  .update({ wallet_tokens: current + amount })
                  .eq("id", uid);
                if (upErr) throw upErr;

                toast.success(`Payment success: +${amount} tokens`);
                onSuccess(amount);
                onClose();
              } catch (e: any) {
                toast.error("Token purchase failed", {
                  description: e?.message ?? "Unknown error",
                });
              } finally {
                setSaving(false);
              }
            }}
            type="button"
          >
            Simulate Payment
          </button>
        </div>
      </div>
    </div>
  );
}

