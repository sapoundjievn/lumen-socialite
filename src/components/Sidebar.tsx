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
import { getCurrentProfile, signOut, onAuthStateChange } from "@/lib/auth";
import type { Profile } from "@/types";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function Sidebar() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      setProfile(p);
      setLoading(false);
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
    { icon: Home, label: "Home", href: "/", active: true },
    { icon: Search, label: "Explore", href: "/explore" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Mail, label: "Messages", href: "/messages" },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    {
      icon: User,
      label: "Profile",
      href: profile?.username ? `/${profile.username}` : "/login",
    },
    { icon: MoreHorizontal, label: "More", href: "/more" },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-[275px] shrink-0 flex-col justify-between self-start overflow-y-auto px-3 py-3 xl:w-[275px]">
      <div>
                <div className="mb-4 flex items-center px-2 pt-1">
          <img
            src="/logo.jpg"
            alt="Lumen · Socialite"
            className="h-14 w-14 flex-shrink-0 rounded-full object-cover object-center shadow-sm"
          />
        </div>

                <nav className="mt-1 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-full px-3 py-3 text-xl transition-colors",
                  item.active
                    ? "font-bold text-charcoal"
                    : "font-normal text-charcoal-soft hover:bg-champagne/40"
                )}
              >
                <Icon
                  className={cn(
                    "h-[26px] w-[26px]",
                    item.active ? "stroke-[2.5]" : "stroke-[1.8]"
                  )}
                />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}

          {profile && (
            <button
              type="button"
              onClick={handleSignOut}
              className="group flex w-full items-center gap-4 rounded-full px-3 py-3 text-xl font-normal text-charcoal-soft transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-[26px] w-[26px] stroke-[1.8]" />
              <span className="hidden xl:inline">Sign out</span>
            </button>
          )}
        </nav>

        <Link
          href="/"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-3 py-2.5 text-[13px] font-bold text-white shadow-md transition hover:bg-gold-deep active:scale-[0.98]"
        >
          <Feather className="h-5 w-5 xl:hidden" />
          <span className="hidden text-[13px] xl:inline">Enlighten every one</span>
        </Link>
      </div>

      <div className="mb-3">
        {loading ? (
          <div className="h-14 animate-pulse rounded-full bg-champagne/30" />
        ) : profile ? (
          <div className="flex items-center gap-3 rounded-full p-3 transition hover:bg-champagne/40">
            <img
              src={
                profile.avatar_url ||
                `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.id}`
              }
              alt={profile.display_name}
              className="h-10 w-10 rounded-full border border-border bg-champagne object-cover"
            />
            <div className="hidden min-w-0 flex-1 text-left xl:block">
              <div className="flex min-w-0 items-center gap-1">
                <span className="truncate text-[15px] font-bold leading-5">
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
