"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import {
  getWhoToFollow,
  getTrends,
  followUser,
  unfollowUser,
  isFollowing,
} from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isForcedVerifiedUsername } from "@/lib/utils";

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
        getTrends(6),
        getWhoToFollow(me?.id, 8),
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
    <aside
      className="sticky top-0 hidden h-screen w-[350px] shrink-0 self-start overflow-hidden lg:flex lg:flex-col"
      style={{ maxHeight: "100dvh" }}
    >
      {/* Top: Trends + Who to follow share all free space */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain px-4 pt-0"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Trends for you — flush top, shares space */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-2xl rounded-t-none border border-t-0 border-border bg-pearl-soft">
          <h2 className="shrink-0 px-3 py-2.5 text-lg font-extrabold text-charcoal">
            Trends for you
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {trends.map((trend, i) => (
              <button
                key={`${trend.title}-${i}`}
                type="button"
                onClick={() => {
                  const q = trend.title.replace(/^#/, "");
                  router.push(`/explore?q=${encodeURIComponent(q)}`);
                }}
                className="flex w-full items-start justify-between px-3 py-2 text-left transition hover:bg-champagne/30"
              >
                <div className="min-w-0">
                  <div className="text-[13px] text-muted">{trend.category}</div>
                  <div className="text-[15px] font-bold text-charcoal">{trend.title}</div>
                  <div className="text-[13px] text-muted">{trend.posts}</div>
                </div>
                <MoreHorizontal className="mt-1 h-4 w-4 flex-shrink-0 text-muted" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => router.push("/explore")}
            className="w-full shrink-0 px-3 py-2 text-left text-[14px] text-gold-deep transition hover:bg-champagne/30"
          >
            Show more
          </button>
        </div>

        {/* Who to follow — shares space */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-pearl-soft">
          <h2 className="shrink-0 px-3 py-2.5 text-lg font-extrabold text-charcoal">
            Who to follow
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {people.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-muted">
                No suggestions yet. Invite friends to Lumen.
              </div>
            ) : (
              people.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-champagne/30"
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
                    <Link
                      href={`/${user.username}`}
                      className="flex min-w-0 items-center gap-1"
                    >
                      <span className="truncate text-[15px] font-bold text-charcoal hover:underline">
                        {user.display_name}
                      </span>
                      {(user.verified ||
                        isForcedVerifiedUsername(user.username)) && (
                        <VerifiedBadge
                          username={user.username}
                          gender={user.gender}
                        />
                      )}
                    </Link>
                    <div className="truncate text-[13px] text-muted">
                      @{user.username}
                    </div>
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
          </div>
          <button
            type="button"
            onClick={() => router.push("/explore")}
            className="w-full shrink-0 px-3 py-2 text-left text-[14px] text-gold-deep transition hover:bg-champagne/30"
          >
            Show more
          </button>
        </div>
      </div>

      {/* Bottom pinned: Ken Coin ~3mm above footer, footer at page bottom */}
      <div className="shrink-0 px-4 pb-3 pt-2">
        <div className="overflow-visible rounded-2xl border border-border bg-gradient-to-br from-[#F5E8D3] via-[#E8D5A3] to-[#C9A86C] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/90 text-2xl shadow-sm">
              ✨
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-extrabold leading-tight text-charcoal">
                Ken Coin
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-[#6B5B3E]">
                Lumen · Socialite · Base
              </div>
              <div className="mt-1 text-[11px] text-[#6B5B3E]/90">
                Token for the Lumen ecosystem
              </div>
            </div>
            <span className="flex-shrink-0 rounded-full bg-charcoal/90 px-3 py-1.5 text-[12px] font-bold text-pearl">
              Soon
            </span>
          </div>
        </div>

        <div className="mt-[3mm] px-1 text-[13px] leading-4 text-muted">
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
