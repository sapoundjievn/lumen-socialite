"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, LogIn } from "lucide-react";
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
        ) : profile ? (
          <div className="px-4 py-6">
            <div className="mb-6 flex items-center gap-3">
              <img
                src={
                  profile.avatar_url ||
                  `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.id}`
                }
                alt={profile.display_name}
                className="h-14 w-14 rounded-full border border-border object-cover"
              />
              <div>
                <div className="font-bold text-charcoal">{profile.display_name}</div>
                <div className="text-[14px] text-muted">@{profile.username}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-[15px] font-bold text-rose-600 transition hover:bg-rose-100"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-muted">You are not signed in.</p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[14px] font-bold text-white"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
