"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, BadgeCheck } from "lucide-react";
import { searchProfiles } from "@/lib/posts";
import type { Profile } from "@/types";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { formatNumber } from "@/lib/utils";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      (async () => {
        setLoading(true);
        setSearched(true);
        const { data } = await searchProfiles(q);
        setResults(data as Profile[]);
        setLoading(false);
      })();
    }
  }, [searchParams]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    const { data } = await searchProfiles(q);
    setResults(data as Profile[]);
    setLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 sm:border-x border-border pb-16 sm:pb-0">
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

          <form onSubmit={handleSearch} className="px-4 pb-3">
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

        {!searched ? (
          <div className="px-6 py-16 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <h2 className="text-xl font-bold text-charcoal">Find people</h2>
            <p className="mt-2 text-muted">
              Search by username or display name — try{" "}
              <button
                type="button"
                className="font-medium text-gold-deep hover:underline"
                onClick={() => {
                  setQuery("thevip");
                  setTimeout(() => handleSearch(), 0);
                }}
              >
                thevip
              </button>{" "}
              or{" "}
              <button
                type="button"
                className="font-medium text-gold-deep hover:underline"
                onClick={() => {
                  setQuery("kendall");
                  setTimeout(() => handleSearch(), 0);
                }}
              >
                kendall
              </button>
            </p>
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
                    {p.verified && (
                      <BadgeCheck className="h-4 w-4 flex-shrink-0 fill-gold text-white" />
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

      <MobileBottomNav />
    </div>
  );
}
