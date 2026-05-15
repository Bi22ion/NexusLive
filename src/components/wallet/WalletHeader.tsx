"use client";

import * as React from "react";
import { Coins, Gem, Plus, X } from "lucide-react";
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
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-transform active:scale-95"
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[40px] border border-white/10 bg-neutral-950 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative text-center">
          <button
            onClick={onClose}
            className="absolute -right-2 -top-2 rounded-full bg-white/5 p-2 text-neutral-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">
            Top Up Tokens
          </h2>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
            Select your package
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {.map((v) => (
              <button
                key={v}
                className={`flex flex-col items-center justify-center rounded-[24px] border-2 py-6 transition-all duration-300 ${
                  amount === v
                    ? "border-violet-600 bg-violet-600/10 text-white shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                    : "border-white/5 bg-neutral-900/40 text-neutral-500 hover:border-white/10"
                }`}
                onClick={() => setAmount(v)}
                type="button"
              >
                <span className="text-2xl font-black">{v}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Tokens
                </span>
              </button>
            ))}
          </div>

          <button
            className="mt-10 w-full rounded-[24px] bg-gradient-to-r from-violet-600 to-cyan-500 py-6 text-sm font-black uppercase tracking-[0.2em] text-white hover:opacity-90 transition-all active:scale-[0.97] disabled:opacity-50"
            disabled={saving}
            onClick={async () => {
              if (!supabase) return toast.error("Missing Supabase client");
              setSaving(true);
              try {
                const { data: auth } = await supabase.auth.getUser();
                const uid = auth.user?.id;
                if (!uid) {
                  toast.error("Sign in required");
                  return;
                }

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

                toast.success(`Success! +${amount} tokens added.`);
                onSuccess(amount);
                onClose();
              } catch (e: any) {
                toast.error("Purchase failed", {
                  description: e?.message ?? "Unknown error",
                });
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
