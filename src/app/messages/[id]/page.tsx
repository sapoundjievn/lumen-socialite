"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Video, Lock, EyeOff } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getMessages, sendMessage } from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import { createCallSession } from "@/lib/calls";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { isForcedVerifiedUsername } from "@/lib/utils";

type Msg = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_secret?: boolean;
};

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const convId = (params.id as string) || "";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [other, setOther] = useState<{
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [secretMode, setSecretMode] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", convId)
      .neq("user_id", me.id);

    if (members && members[0]) {
      setOtherId(members[0].user_id);
      const { data: p } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, verified, gender")
        .eq("id", members[0].user_id)
        .single();
      if (p) setOther(p);
    }

    const { data } = await getMessages(convId);
    setMessages((data as Msg[]) || []);
    setLoading(false);
  }

  async function handleSend() {
    if (!meId || !text.trim()) return;
    setSending(true);
    const { data, error } = await sendMessage(convId, meId, text.trim(), {
      isSecret: secretMode,
    });
    setSending(false);
    if (error) {
      alert(error.message || "Could not send");
      return;
    }
    if (data) setMessages((prev) => [...prev, data as Msg]);
    setText("");
  }

  async function startCall(kind: "audio" | "video") {
    if (!meId || !otherId) {
      alert("Sign in required");
      return;
    }
    const { data, error } = await createCallSession({
      callerId: meId,
      calleeId: otherId,
      kind,
    });
    if (error || !data) {
      alert(error?.message || "Could not start call — run calls SQL in Supabase");
      return;
    }
    router.push(`/call/${data.id}`);
  }

  function onPressStart() {
    pressTimer.current = setTimeout(() => {
      setSecretMode(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, 550);
  }
  function onPressEnd() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>
      <main className="flex w-full max-w-[600px] flex-col border-x-0 border-border pb-28 sm:border-x sm:pb-0">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-pearl/95 px-3 py-2 backdrop-blur-md">
          <button
            type="button"
            onClick={() => router.push("/messages")}
            className="rounded-full p-2 hover:bg-champagne/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {other && (
            <Link href={`/${other.username}`} className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <img
                  src={
                    other.avatar_url ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${other.username}`
                  }
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 truncate font-bold text-charcoal">
                    {other.display_name}
                    {(other.verified || isForcedVerifiedUsername(other.username)) && (
                      <VerifiedBadge username={other.username} gender={(other as any).gender} size="sm" />
                    )}
                  </div>
                  <div className="truncate text-[12px] text-muted">@{other.username}</div>
                </div>
              </div>
            </Link>
          )}
          <button
            type="button"
            title="Voice call"
            onClick={() => startCall("audio")}
            className="rounded-full p-2 text-gold-deep hover:bg-champagne/40"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Video call"
            onClick={() => startCall("video")}
            className="rounded-full p-2 text-gold-deep hover:bg-champagne/40"
          >
            <Video className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {loading ? (
            <p className="text-center text-muted">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted">No messages yet. Say hello ✨</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === meId;
              const secret = !!m.is_secret;
              const show = !secret || revealed[m.id] || mine;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (secret && !mine) {
                        setRevealed((r) => ({ ...r, [m.id]: !r[m.id] }));
                      }
                    }}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-left text-[15px] ${
                      mine
                        ? secret
                          ? "bg-charcoal text-pearl"
                          : "bg-gold text-white"
                        : secret
                        ? "border border-charcoal/30 bg-frost text-charcoal"
                        : "bg-champagne/60 text-charcoal"
                    }`}
                  >
                    {secret && (
                      <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold opacity-80">
                        <Lock className="h-3 w-3" /> Secret
                        {!mine && !show && " · tap to view"}
                      </span>
                    )}
                    {show ? (
                      m.content
                    ) : (
                      <span className="inline-flex items-center gap-1 italic opacity-70">
                        <EyeOff className="h-3.5 w-3.5" /> Hidden message
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border bg-pearl p-3">
          {secretMode && (
            <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-charcoal">
              <Lock className="h-3.5 w-3.5" /> Secret mode — only in this chat · long-press input to toggle
            </p>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              onTouchStart={onPressStart}
              onTouchEnd={onPressEnd}
              onMouseDown={onPressStart}
              onMouseUp={onPressEnd}
              onMouseLeave={onPressEnd}
              placeholder={
                secretMode ? "Secret message…" : "Message… (hold for secret)"
              }
              className={`min-w-0 flex-1 rounded-full border px-4 py-2.5 text-[15px] outline-none focus:border-gold-soft ${
                secretMode
                  ? "border-charcoal/40 bg-charcoal/5"
                  : "border-border bg-white"
              }`}
            />
            <button
              type="button"
              onClick={() => setSecretMode((v) => !v)}
              className={`rounded-full px-3 ${
                secretMode ? "bg-charcoal text-pearl" : "bg-champagne/50 text-charcoal"
              }`}
              title="Secret message"
            >
              <Lock className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="rounded-full bg-gold px-4 py-2 text-[14px] font-bold text-white disabled:opacity-50"
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
