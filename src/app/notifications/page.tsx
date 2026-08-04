"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ArrowLeft } from "lucide-react";
import {
  getPendingFriendRequests,
  acceptFriendRequest,
  denyFriendRequest,
} from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/types";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

type RequestRow = {
  id: string;
  status: string;
  created_at: string;
  requester: Profile | Profile[] | null;
};

export default function NotificationsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const me = await getCurrentProfile();
    if (!me) {
      setLoading(false);
      return;
    }
    setCurrentUserId(me.id);
    const { data } = await getPendingFriendRequests(me.id);
    setRequests(data as RequestRow[]);
    setLoading(false);
  }

  function getRequester(row: RequestRow): Profile | null {
    if (!row.requester) return null;
    return Array.isArray(row.requester) ? row.requester[0] : row.requester;
  }

  async function handleAccept(requesterId: string, rowId: string) {
    if (!currentUserId) return;
    setActionId(rowId);
    await acceptFriendRequest(requesterId, currentUserId);
    setRequests((prev) => prev.filter((r) => r.id !== rowId));
    setActionId(null);
  }

  async function handleDeny(requesterId: string, rowId: string) {
    if (!currentUserId) return;
    setActionId(rowId);
    await denyFriendRequest(requesterId, currentUserId);
    setRequests((prev) => prev.filter((r) => r.id !== rowId));
    setActionId(null);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 sm:border-x border-border pb-16 sm:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
          <div className="flex items-center gap-4 px-4 py-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40 sm:hidden"
            >
              <ArrowLeft className="h-5 w-5 text-charcoal" />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Notifications</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : !currentUserId ? (
          <div className="px-6 py-16 text-center">
            <p className="text-muted">Sign in to see notifications.</p>
            <Link href="/login" className="mt-4 inline-block text-gold-deep hover:underline">
              Sign in
            </Link>
          </div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mb-3 text-4xl">🔔</div>
            <h2 className="text-xl font-bold text-charcoal">No new notifications</h2>
            <p className="mt-2 text-muted">
              Friend requests and other alerts will appear here.
            </p>
          </div>
        ) : (
          <div>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">
                Friend requests
              </h2>
            </div>

            {requests.map((row) => {
              const requester = getRequester(row);
              if (!requester) return null;

              const avatar =
                requester.avatar_url ||
                `https://api.dicebear.com/9.x/avataaars/svg?seed=${requester.id}`;

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 border-b border-border px-4 py-4 transition hover:bg-champagne/20"
                >
                  <Link href={`/${requester.username}`}>
                    <img
                      src={avatar}
                      alt={requester.display_name}
                      className="h-12 w-12 rounded-full border border-border bg-champagne object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1 text-[15px]">
                      <Link
                        href={`/${requester.username}`}
                        className="font-bold text-charcoal hover:underline"
                      >
                        {requester.display_name}
                      </Link>
                      {requester.verified && (
                        <BadgeCheck className="h-4 w-4 flex-shrink-0 fill-gold text-white" />
                      )}
                    </div>
                    <div className="text-[13px] text-muted">
                      @{requester.username} · wants to be friends
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => handleAccept(requester.id, row.id)}
                      disabled={actionId === row.id}
                      className="rounded-full bg-gold px-4 py-1.5 text-[13px] font-bold text-white transition hover:bg-gold-deep disabled:opacity-60"
                    >
                      {actionId === row.id ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => handleDeny(requester.id, row.id)}
                      disabled={actionId === row.id}
                      className="rounded-full border border-border px-4 py-1.5 text-[13px] font-bold text-charcoal transition hover:bg-champagne/40 disabled:opacity-60"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
