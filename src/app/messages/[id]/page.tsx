"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Video,
  Lock,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  getMessages,
  sendMessage,
  deleteMessage,
  editMessage,
  getSecretMessages,
  markSecretMessagesRead,
} from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import { createCallSession } from "@/lib/calls";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { isForcedVerifiedUsername, isSpecialTagUsername } from "@/lib/utils";
import { unlockAudio, playCallRing, stopCallRing } from "@/lib/messageAlerts";

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
  const [secretMessages, setSecretMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [secretText, setSecretText] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [meUsername, setMeUsername] = useState<string>("");
  const [otherId, setOtherId] = useState<string | null>(null);
  const [other, setOther] = useState<{
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified?: boolean;
    gender?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart = useRef<number>(0);

  const bothSpecial =
    isSpecialTagUsername(meUsername) && isSpecialTagUsername(other?.username);

  useEffect(() => {
    if (!convId) return;
    load();
    const id = window.setInterval(() => {
      void softRefresh();
    }, 4000);
    return () => window.clearInterval(id);
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
    setMeUsername(me.username || "");

    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", convId);

    const otherMember = (members || []).find((m: any) => m.user_id !== me.id);
    if (otherMember) {
      setOtherId(otherMember.user_id);
      const { data: p } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, verified, gender")
        .eq("id", otherMember.user_id)
        .single();
      if (p) setOther(p as any);
    }

    const { data } = await getMessages(convId);
    // Public thread only — never show secret content here
    setMessages(((data as Msg[]) || []).filter((m) => !m.is_secret));
    setLoading(false);
  }

  async function softRefresh() {
    const { data } = await getMessages(convId);
    setMessages(((data as Msg[]) || []).filter((m) => !m.is_secret));
  }

  async function openVault() {
    setVaultOpen(true);
    const { data } = await getSecretMessages(convId);
    const list = (data as Msg[]) || [];
    setSecretMessages(list);
    if (meId) {
      const incoming = list.filter((m) => m.sender_id !== meId).map((m) => m.id);
      await markSecretMessagesRead(meId, incoming);
    }
  }

  function clearHold() {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(false);
    setHoldProgress(0);
  }

  function startHold() {
    if (!bothSpecial) {
      alert("Secret vault is only between special-tag accounts.");
      return;
    }
    clearHold();
    setHolding(true);
    holdStart.current = Date.now();
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current;
      const pct = Math.min(100, (elapsed / 10000) * 100);
      setHoldProgress(pct);
      if (elapsed >= 10000) {
        clearHold();
        void openVault();
      }
    }, 50);
  }

  async function handleSend() {
    if (!meId || !text.trim()) return;
    setSending(true);
    const { data, error } = await sendMessage(convId, meId, text.trim(), {
      isSecret: false,
    });
    setSending(false);
    if (error) {
      alert(error.message || "Could not send");
      return;
    }
    if (data) setMessages((prev) => [...prev, data as Msg]);
    setText("");
  }

  async function handleSendSecret() {
    if (!meId || !secretText.trim() || !bothSpecial) return;
    setSending(true);
    const { data, error } = await sendMessage(convId, meId, secretText.trim(), {
      isSecret: true,
    });
    setSending(false);
    if (error) {
      alert(error.message || "Could not send secret");
      return;
    }
    if (data) setSecretMessages((prev) => [...prev, data as Msg]);
    setSecretText("");
  }

  async function handleDelete(id: string, isSecret = false) {
    if (!meId) return;
    if (!confirm("Delete this message?")) return;
    const { error } = await deleteMessage(id, meId);
    if (error) {
      alert(error.message || "Could not delete");
      return;
    }
    if (isSecret) {
      setSecretMessages((prev) => prev.filter((m) => m.id !== id));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function handleSaveEdit() {
    if (!meId || !editingId || !editText.trim()) return;
    const { data, error } = await editMessage(editingId, meId, editText.trim());
    if (error) {
      alert(error.message || "Could not edit");
      return;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingId ? { ...m, content: data?.content || editText.trim() } : m
      )
    );
    setEditingId(null);
    setEditText("");
  }

  async function startCall(kind: "audio" | "video") {
    if (!meId) {
      alert("Sign in required");
      return;
    }
    if (!otherId) {
      alert("Could not find the other person in this chat.");
      return;
    }
    try {
      await unlockAudio();
      playCallRing(kind === "video" ? "video" : "audio");
      const { data, error } = await createCallSession({
        callerId: meId,
        calleeId: otherId,
        kind,
      });
      if (error || !data) {
        stopCallRing();
        alert(
          error?.message ||
            "Could not start call — run calls-rls-twoway.sql in Supabase."
        );
        return;
      }
      router.push(`/call/${data.id}`);
    } catch (e: any) {
      stopCallRing();
      alert(e?.message || "Could not start call.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px]">
      <Sidebar />
      <main className="flex min-h-screen w-full max-w-[600px] flex-col border-x-0 border-border sm:border-x pb-16 sm:pb-0">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-pearl/95 px-3 py-3 backdrop-blur">
          <Link href="/messages" className="rounded-full p-2 hover:bg-champagne/40">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {other && (
            <Link href={`/${other.username}`} className="flex min-w-0 flex-1 items-center gap-2">
              <img
                src={
                  other.avatar_url ||
                  `https://api.dicebear.com/9.x/avataaars/svg?seed=${other.username}`
                }
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="truncate font-bold text-charcoal">
                    {other.display_name}
                  </span>
                  {(other.verified || isForcedVerifiedUsername(other.username)) && (
                    <VerifiedBadge
                      username={other.username}
                      gender={(other as any).gender}
                      size="sm"
                    />
                  )}
                  {isSpecialTagUsername(other.username) && (
                    <span
                      className="rounded px-1 text-[10px] font-bold uppercase tracking-wide text-gold-deep"
                      title="Special tag"
                    >
                      ✦
                    </span>
                  )}
                </div>
                <div className="truncate text-[13px] text-muted">@{other.username}</div>
              </div>
            </Link>
          )}
          <button
            type="button"
            title="Voice call"
            onClick={() => startCall("audio")}
            className="rounded-full p-2 text-charcoal hover:bg-champagne/40"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Video call"
            onClick={() => startCall("video")}
            className="rounded-full p-2 text-charcoal hover:bg-champagne/40"
          >
            <Video className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {loading ? (
            <p className="text-center text-muted">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted">No messages yet</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === meId;
              const isEditing = editingId === m.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-[15px] ${
                      mine
                        ? "bg-gold text-white"
                        : "bg-champagne/40 text-charcoal"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full rounded-lg border border-white/40 bg-white/20 p-2 text-[14px] text-charcoal"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-charcoal"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditText("");
                            }}
                            className="rounded-full bg-black/20 px-3 py-1 text-[12px] font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        {mine && (
                          <div className="mt-1 flex justify-end gap-2 opacity-80">
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => {
                                setEditingId(m.id);
                                setEditText(m.content);
                              }}
                              className="rounded p-0.5 hover:bg-black/10"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => handleDelete(m.id, false)}
                              className="rounded p-0.5 hover:bg-black/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border bg-pearl p-3">
          {bothSpecial && (
            <div className="mb-2">
              <button
                type="button"
                onMouseDown={startHold}
                onMouseUp={clearHold}
                onMouseLeave={clearHold}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startHold();
                }}
                onTouchEnd={clearHold}
                className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-charcoal/20 bg-charcoal px-4 py-2.5 text-[13px] font-bold text-pearl"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-gold/80 transition-all"
                  style={{ width: `${holdProgress}%` }}
                />
                <Lock className="relative z-10 h-4 w-4" />
                <span className="relative z-10">
                  {holding
                    ? `Hold… ${Math.ceil((100 - holdProgress) / 10)}s`
                    : "Hold 10s for Secret Vault"}
                </span>
              </button>
              <p className="mt-1 text-center text-[11px] text-muted">
                Secret messages stay hidden in the normal chat. Special-tag only.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Message…"
              className="min-w-0 flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-[15px] outline-none focus:border-gold-soft"
            />
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

      {/* Secret vault — only after 10s hold */}
      {vaultOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-pearl shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-charcoal" />
                <h3 className="text-[16px] font-bold text-charcoal">Secret Vault</h3>
              </div>
              <button
                type="button"
                onClick={() => setVaultOpen(false)}
                className="rounded-full p-2 hover:bg-champagne/40"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {secretMessages.length === 0 ? (
                <p className="text-center text-sm text-muted">No secret messages yet</p>
              ) : (
                secretMessages.map((m) => {
                  const mine = m.sender_id === meId;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[14px] ${
                          mine
                            ? "bg-charcoal text-pearl"
                            : "border border-rose-200 bg-rose-50 text-charcoal"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        {mine && (
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id, true)}
                            className="mt-1 flex items-center gap-1 text-[11px] opacity-80 hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <input
                  value={secretText}
                  onChange={(e) => setSecretText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendSecret()}
                  placeholder="Secret message to special tag…"
                  className="min-w-0 flex-1 rounded-full border border-charcoal/30 bg-white px-4 py-2.5 text-[14px] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendSecret}
                  disabled={sending || !secretText.trim()}
                  className="rounded-full bg-charcoal px-4 py-2 text-[13px] font-bold text-pearl disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
