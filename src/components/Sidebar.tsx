"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  MoreHorizontal,
  Feather,
  LogIn,
  UserPlus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnreadSecretCount } from "@/lib/posts";
import { getCurrentProfile, signOut, onAuthStateChange } from "@/lib/auth";
import type { Profile } from "@/types";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useI18n } from "@/lib/i18n";

export default function Sidebar() {
  const { t } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [secretCount, setSecretCount] = useState(0);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      setProfile(p);
      setLoading(false);
      if (p?.id) {
        getUnreadSecretCount(p.id).then((n) => setSecretCount(n || 0));
      }
    });

    const {
      data: { subscription },
    } = onAuthStateChange(() => {
      getCurrentProfile().then(setProfile);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setProfile(null);
    router.push("/login");
  };

  const navItems = [
    { icon: Home, label: t("home"), href: "/", active: true },
    { icon: Search, label: t("explore"), href: "/explore" },
    { icon: Bell, label: t("notifications"), href: "/notifications" },
    { icon: Mail, label: t("messages"), href: "/messages" },
    { icon: Bookmark, label: t("bookmarks"), href: "/bookmarks" },
    {
      icon: User,
      label: t("profile"),
      href: profile?.username ? `/${profile.username}` : "/login",
    },
    { icon: MoreHorizontal, label: t("more"), href: "/more" },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-[210px] shrink-0 flex-col justify-between self-start overflow-y-auto px-1.5 py-2 xl:w-[220px]">
      <div>
        {/* Full square plaque, transparent — sits on page pearl only */}
        <div className="mb-1 flex items-start justify-start px-1 pt-0.5">
          <img
            src="/logo-official.png"
            alt="Lumen · Socialite"
            className="h-36 w-36 flex-shrink-0 border-0 bg-transparent object-contain shadow-none outline-none ring-0"
            width={144}
            height={144}
            style={{ background: "transparent" }}
          />
        </div>

        <nav className="mt-0.5 space-y-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-full px-2.5 py-2 text-[15px] transition-colors",
                  item.active
                    ? "font-bold text-charcoal"
                    : "font-normal text-charcoal-soft hover:bg-champagne/40"
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      item.active ? "stroke-[2.5]" : "stroke-[1.8]"
                    )}
                  />
                  {item.href === "/notifications" && secretCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[9px] font-bold text-white">
                      {secretCount}
                    </span>
                  )}
                </span>
                <span className="hidden xl:inline">{item.label}</span>
                {item.href === "/notifications" && secretCount > 0 && (
                  <span className="ml-auto hidden rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white xl:inline">
                    {secretCount}
                  </span>
                )}
              </Link>
            );
          })}

          {profile && (
            <button
              type="button"
              onClick={handleSignOut}
              className="group flex w-full items-center gap-2.5 rounded-full px-2.5 py-2 text-[15px] font-normal text-charcoal-soft transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-5 w-5 stroke-[1.8]" />
              <span className="hidden xl:inline">Sign out</span>
            </button>
          )}
        </nav>

        <Link
          href="/"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gold px-2.5 py-2 text-[12px] font-bold text-white shadow-sm transition hover:bg-gold-deep active:scale-[0.98]"
        >
          <Feather className="h-4 w-4 xl:hidden" />
          <span className="hidden text-[12px] xl:inline">Enlighten every one</span>
        </Link>
      </div>

      <div className="mb-2">
        {loading ? (
          <div className="h-11 animate-pulse rounded-full bg-champagne/30" />
        ) : profile ? (
          <div className="flex items-center gap-2 rounded-full p-2 transition hover:bg-champagne/40">
            <img
              src={
                profile.avatar_url ||
                `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.id}`
              }
              alt={profile.display_name}
              className="h-9 w-9 rounded-full border border-border bg-champagne object-cover"
            />
            <div className="hidden min-w-0 flex-1 text-left xl:block">
              <div className="flex min-w-0 items-center gap-1">
                <span className="truncate text-[13px] font-bold leading-4">
                  {profile.display_name}
                </span>
                {profile.verified && (
                  <VerifiedBadge
                    username={profile.username}
                    gender={(profile as any).gender}
                  />
                )}
              </div>
              <div className="truncate text-[13px] leading-4 text-muted">
                @{profile.username}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 px-1">
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-[15px] font-semibold text-charcoal transition hover:bg-champagne/40"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden xl:inline">Sign in</span>
            </Link>
            <Link
              href="/signup"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-[15px] font-bold text-white transition hover:bg-gold-deep"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden xl:inline">Sign up</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
