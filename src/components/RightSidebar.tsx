"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MoreHorizontal } from "lucide-react";
import {
  getWhoToFollow,
  getTrends,
  followUser,
  unfollowUser,
  isFollowing,
} from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import VerifiedBadge from "@/components/VerifiedBadge";

type Trend = { category: string; title: string; posts: string };
type Suggest = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  verified: boolean;
  gender?: string | null;
  followers_count?: number;
};

export default function RightSidebar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [trends, setTrends] = useState<Trend[]>([]);
  const [people, setPeople] = useState<Suggest[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loadingFollow, setLoadingFollow] = useState<Record<string, boolean>>({});
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await getCurrentProfile();
      setMeId(me?.id || null);
      const [{ data: t }, { data: w }] = await Promise.all([
        getTrends(5),
        getWhoToFollow(me?.id, 3),
      ]);
      setTrends(t || []);
      setPeople((w as Suggest[]) || []);
    })();
  }, []);

  async function handleFollow(userId: string) {
    if (!meId) {
      router.push("/login");
      return;
    }
    setLoadingFollow((m) => ({ ...m, [userId]: true }));
    const isFol = followingMap[userId];
    if (isFol) {
      await unfollowUser(meId, userId);
      setFollowingMap((m) => ({ ...m, [userId]: false }));
    } else {
      await followUser(meId, userId);
      setFollowingMap((m) => ({ ...m, [userId]: true }));
    }
    setLoadingFollow((m) => ({ ...m, [userId]: false }));
  }

  return (
    <aside className="sticky top-0 hidden h-dvh max-h-dvh w-[350px] shrink-0 flex-col overflow-hidden lg:flex">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-3 pb-20">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              router.push(`/explore?q=${encodeURIComponent(q.trim())}`);
            }
          }}
          placeholder="Search Lumen"
          className="w-full rounded-full border border-transparent bg-frost py-3 pl-12 pr-4 text-[15px] text-charcoal placeholder:text-muted focus:border-gold-soft focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold-soft"
        />
      </div>

      {/* Trends for you */}
      <div className="overflow-hidden rounded-2xl border border-border bg-pearl-soft">
        <h2 className="px-4 py-3 text-xl font-extrabold text-charcoal">
          Trends for you
        </h2>
        {trends.map((trend, i) => (
          <button
            key={`${trend.title}-${i}`}
            type="button"
            onClick={() => {
              const q = trend.title.replace(/^#/, "");
              router.push(`/explore?q=${encodeURIComponent(q)}`);
            }}
            className="flex w-full items-start justify-between px-4 py-3 text-left transition hover:bg-champagne/30"
          >
            <div className="min-w-0">
              <div className="text-[13px] text-muted">{trend.category}</div>
              <div className="text-[15px] font-bold text-charcoal">{trend.title}</div>
              <div className="text-[13px] text-muted">{trend.posts}</div>
            </div>
            <MoreHorizontal className="mt-1 h-4 w-4 flex-shrink-0 text-muted" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => router.push("/explore")}
          className="w-full px-4 py-3 text-left text-[15px] text-gold-deep transition hover:bg-champagne/30"
        >
          Show more
        </button>
      </div>

      {/* Who to follow */}
      <div className="overflow-hidden rounded-2xl border border-border bg-pearl-soft">
        <h2 className="px-4 py-3 text-xl font-extrabold text-charcoal">
          Who to follow
        </h2>
        {people.length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-muted">
            No suggestions yet. Invite friends to Lumen.
          </div>
        ) : (
          people.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-champagne/30"
            >
              <Link href={`/${user.username}`}>
                <img
                  src={
                    user.avatar_url ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.id}`
                  }
                  alt={user.display_name}
                  className="h-10 w-10 rounded-full border border-border bg-champagne object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/${user.username}`} className="flex min-w-0 items-center gap-1">
                  <span className="truncate text-[15px] font-bold text-charcoal hover:underline">
                    {user.display_name}
                  </span>
                  {user.verified && (
                    <VerifiedBadge username={user.username} gender={user.gender} />
                  )}
                </Link>
                <div className="truncate text-[13px] text-muted">@{user.username}</div>
              </div>
              <button
                type="button"
                disabled={!!loadingFollow[user.id]}
                onClick={() => handleFollow(user.id)}
                className={`rounded-full px-4 py-1.5 text-[14px] font-bold transition ${
                  followingMap[user.id]
                    ? "border border-border text-charcoal hover:bg-champagne/40"
                    : "bg-charcoal text-pearl hover:bg-charcoal-soft"
                }`}
              >
                {loadingFollow[user.id]
                  ? "..."
                  : followingMap[user.id]
                  ? "Following"
                  : "Follow"}
              </button>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={() => router.push("/explore")}
          className="w-full px-4 py-3 text-left text-[15px] text-gold-deep transition hover:bg-champagne/30"
        >
          Show more
        </button>
      </div>

      {/* Ken Coin */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#F5E8D3] via-[#E8D5A3] to-[#C9A86C] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-2xl shadow-sm">
            ✨
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-extrabold text-charcoal">Ken Coin</div>
            <div className="text-[13px] font-medium text-[#6B5B3E]">
              Lumen · Socialite
            </div>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-5 text-charcoal/80">
          The official token of Lumen Socialite — powering the elegant social platform.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide text-[#6B5B3E]">
          <span className="rounded-full bg-white/60 px-2.5 py-1">Base</span>
          <span className="rounded-full bg-white/60 px-2.5 py-1">KEN</span>
          <span className="rounded-full bg-white/60 px-2.5 py-1">1B supply</span>
        </div>
        <div className="mt-4 flex w-full items-center justify-center rounded-full bg-charcoal/90 py-2.5 text-[14px] font-bold text-pearl">
          Coming soon on Base
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 text-[13px] leading-4 text-muted">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="#" className="hover:underline">
            Terms of Service
          </a>
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline">
            Cookie Policy
          </a>
          <a href="#" className="hover:underline">
            Accessibility
          </a>
        </div>
        <div className="mt-2 text-[12px] text-muted-light">
          © 2026 @Lumen · Socialite media platform. All rights reserved.
        </div>
      </div>
      </div>
    </aside>
  );
}
