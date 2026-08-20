"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isForcedVerifiedUsername, canSeeHiddenAccount } from "@/lib/utils";
import { searchProfiles } from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/types";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { formatNumber } from "@/lib/utils";

function ExploreInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [viewerUsername, setViewerUsername] = useState<string | null>(null);

  useEffect(() => {
    getCurrentProfile().then((p) => setViewerUsername(p?.username || null));
  }, []);

  async function runSearch(q: string) {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setSearched(true);
    setErrorMsg("");
    setQuery(term);
    const { data, error } = await searchProfiles(term, viewerUsername);
    if (error) {
      console.error(error);
      setErrorMsg(error.message || "Search failed");
      setResults([]);
    } else {
      setResults((data as Profile[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) runSearch(q);
  }, [searchParams]);

  return (
    <main className="w-full max-w-[600px] border-x-0 sm:border-x border-border pb-28 sm:pb-0">
      <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40 sm:hidden"
          >
            <ArrowLeft className="h-5 w-5 text-charcoal" />
          </Link>
          <h1 className="text-xl font-bold text-charcoal">Explore</h1>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="px-4 pb-3"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people on Lumen"
              className="w-full rounded-full border border-transparent bg-frost py-3 pl-12 pr-24 text-[15px] text-charcoal placeholder:text-muted focus:border-gold-soft focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold-soft"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gold px-4 py-1.5 text-[13px] font-bold text-white hover:bg-gold-deep disabled:opacity-50"
            >
              {loading ? "..." : "Search"}
            </button>
          </div>
        </form>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 text-[14px] text-rose-600">{errorMsg}</div>
      )}

      {!searched ? (
        <div className="px-6 py-16 text-center">
          <div className="mb-3 text-4xl">🔍</div>
          <h2 className="text-xl font-bold text-charcoal">Find people</h2>
          <p className="mt-2 text-muted">
            Search by username or name
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => runSearch("thevip")}
              className="rounded-full border border-border px-4 py-1.5 text-[14px] font-bold text-charcoal hover:bg-champagne/40"
            >
              @thevip
            </button>
            {canSeeHiddenAccount(viewerUsername, "kendall.vip") && (
              <button
                type="button"
                onClick={() => runSearch("kendall.vip")}
                className="rounded-full border border-border px-4 py-1.5 text-[14px] font-bold text-charcoal hover:bg-champagne/40"
              >
                @kendall.vip
              </button>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : results.length === 0 ? (
        <div className="px-6 py-16 text-center text-muted">
          No people found for “{query}”
        </div>
      ) : (
        results.map((p) => {
          const avatar =
            p.avatar_url ||
            `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.id}`;
          return (
            <Link
              key={p.id}
              href={`/${p.username}`}
              className="flex items-center gap-3 border-b border-border px-4 py-4 transition hover:bg-champagne/20"
            >
              <img
                src={avatar}
                alt={p.display_name}
                className="h-12 w-12 rounded-full border border-border bg-champagne object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate font-bold text-charcoal">
                    {p.display_name}
                  </span>
                  {(p.verified || isForcedVerifiedUsername(p.username)) && (
                    <VerifiedBadge username={p.username} gender={(p as any).gender} />
                  )}
                </div>
                <div className="text-[14px] text-muted">@{p.username}</div>
                {p.bio && (
                  <div className="mt-0.5 truncate text-[13px] text-charcoal/80">
                    {p.bio}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-[12px] text-muted">
                {formatNumber(p.followers_count || 0)} followers
              </div>
            </Link>
          );
        })
      )}
    </main>
  );
}

export default function ExplorePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>
      <Suspense
        fallback={
          <div className="flex w-full max-w-[600px] justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        }
      >
        <ExploreInner />
      </Suspense>
      <MobileBottomNav />
    </div>
  );
}
