"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  LogIn,
  Bookmark,
  User,
  Bell,
  Mail,
  Search,
  ShieldCheck,
  Music,
} from "lucide-react";
import { getCurrentProfile, signOut } from "@/lib/auth";
import type { Profile } from "@/types";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function MorePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    await signOut();
    setProfile(null);
    router.push("/login");
  }

  const links = [
    { icon: ShieldCheck, label: "Get verified ($60/yr)", href: "/verify" },
    { icon: Search, label: "Explore", href: "/explore" },
    { icon: Music, label: "Music", href: "/music" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Mail, label: "Messages", href: "/messages" },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    {
      icon: User,
      label: "Profile",
      href: profile?.username ? `/${profile.username}` : "/login",
    },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 border-border pb-16 sm:border-x sm:pb-0">
        <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40"
            >
              <ArrowLeft className="h-5 w-5 text-charcoal" />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">More</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : (
          <div className="px-4 py-4">
            {profile && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-pearl-soft p-4">
                <img
                  src={
                    profile.avatar_url ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.id}`
                  }
                  alt={profile.display_name}
                  className="h-14 w-14 rounded-full border border-border object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate font-bold text-charcoal">
                    {profile.display_name}
                  </div>
                  <div className="text-[14px] text-muted">@{profile.username}</div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-border">
              {links.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 transition hover:bg-champagne/30"
                  >
                    <Icon className="h-5 w-5 text-charcoal" />
                    <span className="text-[15px] font-medium text-charcoal">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6">
              {profile ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-[15px] font-bold text-rose-600 transition hover:bg-rose-100"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-3 text-[15px] font-bold text-white"
                >
                  <LogIn className="h-5 w-5" />
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
