 "use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { WalletHeader } from "@/components/wallet/WalletHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!supabase) return;
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (active) {
        setIsLoggedIn(!!data.user);
      }
    })();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <div className="min-h-full bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-4">
          <button
            className="inline-flex sm:hidden h-10 w-10 items-center justify-center rounded-xl hover:bg-neutral-900"
            onClick={() => setSidebarOpen(true)}
            type="button"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="NexusLive"
              width={140}
              height={50}
              className="h-auto w-[120px] sm:w-[140px]"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </Link>

          <div className="flex-1" />

          <div className="hidden md:flex flex-[1.2] max-w-2xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                placeholder="Find anything you want..."
                className="h-10 w-full rounded-2xl border border-white/10 bg-neutral-900/60 pl-9 pr-11 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-400 px-2.5 py-1.5 text-xs font-semibold text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Magic
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <WalletHeader />
            {!isLoggedIn ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm hover:bg-neutral-900"
                >
                  Login
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-400 px-4 py-2 text-sm font-semibold text-white"
                >
                  Create account
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="md:hidden px-3 pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              placeholder="Find anything you want..."
              className="h-10 w-full rounded-2xl border border-white/10 bg-neutral-900/60 pl-9 pr-11 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-400 px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Magic
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 sm:hidden transition",
          sidebarOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/60 transition-opacity",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-72 bg-neutral-950 border-r border-white/10 transition-transform",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="hidden sm:block w-64 shrink-0 border-r border-white/10">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1 px-3 sm:px-5 py-4 sm:py-6">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
}