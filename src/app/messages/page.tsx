"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getMyConversations } from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { formatTime } from "@/lib/utils";

type ConvItem = {
  conversation_id: string;
  other: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified?: boolean;
  } | null;
  last_message: { content: string; created_at: string; sender_id: string } | null;
};

export default function MessagesPage() {
  const [list, setList] = useState<ConvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await getCurrentProfile();
      if (!me) {
        setLoading(false);
        return;
      }
      setSignedIn(true);
      const { data } = await getMyConversations(me.id);
      setList(data as ConvItem[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 sm:border-x border-border pb-16 sm:pb-0">
        <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
          <div className="flex items-center gap-4 px-4 py-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40 sm:hidden"
            >
              <ArrowLeft className="h-5 w-5 text-charcoal" />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Messages</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : !signedIn ? (
          <div className="px-6 py-16 text-center">
            <p className="text-muted">Sign in to view messages.</p>
            <Link href="/login" className="mt-4 inline-block text-gold-deep hover:underline">
              Sign in
            </Link>
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mb-3 text-4xl">✉️</div>
            <h2 className="text-xl font-bold text-charcoal">No messages yet</h2>
            <p className="mt-2 text-muted">
              Open someone’s profile and tap Message to start a conversation.
            </p>
          </div>
        ) : (
          list.map((c) => {
            const o = c.other;
            if (!o) return null;
            const avatar =
              o.avatar_url ||
              `https://api.dicebear.com/9.x/avataaars/svg?seed=${o.id}`;
            return (
              <Link
                key={c.conversation_id}
                href={`/messages/${c.conversation_id}`}
                className="flex items-center gap-3 border-b border-border px-4 py-4 transition hover:bg-champagne/20"
              >
                <img
                  src={avatar}
                  alt={o.display_name}
                  className="h-12 w-12 rounded-full border border-border bg-champagne object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-bold text-charcoal">
                      {o.display_name}
                    </span>
                    {o.verified && (
                      <VerifiedBadge username={o.username} gender={(o as any).gender} />
                    )}
                    {c.last_message && (
                      <span className="ml-auto flex-shrink-0 text-[12px] text-muted">
                        {formatTime(c.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[14px] text-muted">
                    {c.last_message?.content || "Start the conversation"}
                  </div>
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
