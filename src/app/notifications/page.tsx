"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, ArrowLeft } from "lucide-react";
import {
  getPendingFriendRequests,
  acceptFriendRequest,
  denyFriendRequest,
  getNotifications,
  markNotificationRead,
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

type NotifRow = {
  id: string;
  type: string;
  message: string | null;
  body?: string | null;
  read: boolean;
  post_id: string | null;
  created_at: string;
  actor: Profile | Profile[] | null;
  data?: { conversation_id?: string; message_id?: string } | null;
};

function getActor(row: NotifRow): Profile | null {
  if (!row.actor) return null;
  return Array.isArray(row.actor) ? row.actor[0] : row.actor;
}

function getRequester(row: RequestRow): Profile | null {
  if (!row.requester) return null;
  return Array.isArray(row.requester) ? row.requester[0] : row.requester;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
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
    const [req, n] = await Promise.all([
      getPendingFriendRequests(me.id),
      getNotifications(me.id),
    ]);
    setRequests(req.data as RequestRow[]);
    setNotifs(n.data as NotifRow[]);
    setLoading(false);
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

  async function openSecret(n: NotifRow) {
    if (!currentUserId) return;
    await markNotificationRead(n.id, currentUserId);
    setNotifs((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
    );
    const conv =
      (n as any).data?.conversation_id ||
      (typeof n.message === "string" && n.message.startsWith("conv:")
        ? n.message.slice(5)
        : null);
    if (conv) router.push(`/messages/${conv}`);
    else router.push("/messages");
  }

  async function openMention(n: NotifRow) {
    if (!currentUserId) return;
    await markNotificationRead(n.id, currentUserId);
    setNotifs((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
    );
    if (n.post_id) router.push(`/post/${n.post_id}`);
  }

  const mentionNotifs = notifs.filter((n) => n.type === "mention");
  const secretNotifs = notifs.filter((n) => n.type === "secret_message");
  const secretUnread = secretNotifs.filter((n) => !n.read).length;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 sm:border-x border-border pb-28 sm:pb-0">
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
        ) : requests.length === 0 && mentionNotifs.length === 0 && secretNotifs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mb-3 text-4xl">🔔</div>
            <h2 className="text-xl font-bold text-charcoal">No new notifications</h2>
            <p className="mt-2 text-muted">
              Mentions, friend requests, and other alerts appear here.
            </p>
          </div>
        ) : (
          <div>
            {requests.length > 0 && (
              <>
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
              </>
            )}

            {secretNotifs.length > 0 && (
              <>
                <div className="border-b border-border px-4 py-3 flex items-center gap-2">
                  <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">
                    Private
                  </h2>
                  {secretUnread > 0 && (
                    <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      {secretUnread}
                    </span>
                  )}
                </div>
                {secretNotifs.map((n) => {
                  const actor = getActor(n);
                  const avatar =
                    actor?.avatar_url ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${actor?.id || "x"}`;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openSecret(n)}
                      className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-champagne/30 ${
                        !n.read ? "bg-rose-50/50" : ""
                      }`}
                    >
                      <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-charcoal">
                            {actor?.display_name || "Someone"}
                          </span>
                          {!n.read && (
                            <span className="rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
                              1
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-muted">✦ · open chat, hold lock</div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {mentionNotifs.length > 0 && (
              <>
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">
                    Mentions
                  </h2>
                </div>
                {mentionNotifs.map((n) => {
                  const actor = getActor(n);
                  const avatar =
                    actor?.avatar_url ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${actor?.id || "x"}`;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openMention(n)}
                      className={`flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left transition hover:bg-champagne/20 ${
                        !n.read ? "bg-champagne/10" : ""
                      }`}
                    >
                      <img
                        src={avatar}
                        alt={actor?.display_name || ""}
                        className="h-12 w-12 flex-shrink-0 rounded-full border border-border bg-champagne object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] text-charcoal">
                          <span className="font-bold">
                            {actor?.display_name || "Someone"}
                          </span>{" "}
                          <span className="text-muted">mentioned you</span>
                          {actor?.verified && (
                            <BadgeCheck className="ml-1 inline h-4 w-4 fill-gold text-white align-text-bottom" />
                          )}
                        </div>
                        {n.message && (
                          <p className="mt-1 text-[14px] leading-5 text-charcoal line-clamp-3">
                            {n.message}
                          </p>
                        )}
                        <div className="mt-1 text-[12px] text-muted">
                          Tap to open the post
                        </div>
                      </div>
                      {!n.read && (
                        <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
