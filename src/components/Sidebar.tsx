"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentProfile, signOut, onAuthStateChange } from "@/lib/auth";
import type { Profile } from "@/types";

const navItemsBase = [
  { icon: Home, label: "Home", href: "/", active: true },
  { icon: Search, label: "Explore", href: "#" },
  { icon: Bell, label: "Notifications", href: "#" },
  { icon: Mail, label: "Messages", href: "#" },
  { icon: Bookmark, label: "Bookmarks", href: "#" },
  { icon: User, label: "Profile", href: "profile" },
  { icon: MoreHorizontal, label: "More", href: "#" },
];

export default function Sidebar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const navItems = navItemsBase.map((item) => {
    if (item.label === "Profile" && profile?.username) {
      return { ...item, href: `/${profile.username}` };
    }
    return item;
  });

  useEffect(() => {
    getCurrentProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });

    const { data: { subscription } } = onAuthStateChange(() => {
      getCurrentProfile().then(setProfile);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setProfile(null);
  };

  return (
    <aside className="sticky top-0 flex h-screen w-[275px] flex-col justify-between px-3 py-3 xl:w-[275px]">
      {/* Logo */}
      <div>
        <div className="mb-4 flex items-center gap-3 px-2 pt-1">
          <img
            src="/logo.jpg"
            alt="Lumen Socialite"
            className="h-11 w-11 flex-shrink-0 rounded-full object-cover object-top shadow-sm"
          />
          <div className="hidden min-w-0 xl:block">
            <div className="text-[17px] font-bold leading-tight tracking-tight text-charcoal">
              Lumen
            </div>
            <div className="text-[12px] font-medium leading-tight text-[#C9A86C]">
              Socialite
            </div>
          </div>
        </div>

        {/* Navigation */}
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
        </nav>

        {/* Enlightenment button */}
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 font-bold text-white shadow-md transition hover:bg-gold-deep active:scale-[0.98] xl:px-6">
          <Feather className="h-5 w-5 xl:hidden" />
          <span className="hidden xl:inline">Enlightenment</span>
        </button>
      </div>

      {/* Bottom: User or Auth buttons */}
      <div className="mb-3">
        {loading ? (
          <div className="h-14 rounded-full bg-champagne/30 animate-pulse" />
        ) : profile ? (
          <div className="flex items-center gap-3 rounded-full p-3 transition hover:bg-champagne/40">
            <img
              src={profile.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.id}`}
              alt={profile.display_name}
              className="h-10 w-10 rounded-full border border-border bg-champagne"
            />
            <div className="hidden min-w-0 flex-1 text-left xl:block">
              <div className="truncate text-[15px] font-bold leading-5">
                {profile.display_name}
              </div>
              <div className="truncate text-[13px] leading-4 text-muted">
                @{profile.username}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="hidden text-xs text-muted hover:text-charcoal xl:block"
              title="Sign out"
            >
              Out
            </button>
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
