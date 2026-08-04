"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { getMessages, sendMessage } from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

type Msg = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const convId = (params.id as string) || "";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [other, setOther] = useState<{
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!convId) return;
    load();
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function load() {
    setLoading(true);
    const me = await getCurrentProfile();
    if (!me) {
      setLoading(false);
      return;
    }
    setMeId(me.id);

    // Other member
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", convId)
      .neq("user_id", me.id);

    if (members && members[0]) {
      const { data: p } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, verified")
        .eq("id", members[0].user_id)
        .single();
      if (p) setOther(p);
    }

    const { data } = await getMessages(convId);
    setMessages(data as Msg[]);
    setLoading(false);
  }

  async function handleSend() {
    if (!meId || !text.trim()) return;
    setSending(true);
    const { data, error } = await sendMessage(convId, meId, text.trim());
    setSending(false);
    if (error) {
      alert(error.message || "Could not send");
      return;
    }
    if (data) {
      setMessages((prev) => [...prev, data as Msg]);
      setText("");
    }
  }

  const otherAvatar =
    other?.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${other?.username || "x"}`;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="flex w-full max-w-[600px] flex-col border-x-0 sm:border-x border-border pb-16 sm:pb-0" style={{ minHeight: "100vh" }}>
        <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => router.push("/messages")}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40"
            >
              <ArrowLeft className="h-5 w-5 text-charcoal" />
            </button>
            {other && (
              <Link href={`/${other.username}`} className="flex items-center gap-2 min-w-0">
                <img
                  src={otherAvatar}
                  alt={other.display_name}
                  className="h-9 w-9 rounded-full border border-border object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-bold text-charcoal">
                      {other.display_name}
                    </span>
                    {other.verified && (
                      <BadgeCheck className="h-4 w-4 fill-gold text-white" />
                    )}
                  </div>
                  <div className="text-[12px] text-muted">@{other.username}</div>
                </div>
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center text-muted text-[15px]">
              No messages yet. Say hello ✨
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === meId;
              return (
                <div
                  key={m.id}
                  className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-[15px] leading-5 ${
                      mine
                        ? "bg-gold text-white rounded-br-md"
                        : "bg-frost text-charcoal rounded-bl-md"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="sticky bottom-0 border-t border-border bg-pearl p-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Start a message..."
              className="flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-[15px] text-charcoal placeholder:text-muted focus:border-gold-soft focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="rounded-full bg-gold px-5 py-2.5 text-[14px] font-bold text-white hover:bg-gold-deep disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
