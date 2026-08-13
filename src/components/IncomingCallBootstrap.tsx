"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneOff, Video } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getIncomingRingingCalls, updateCallStatus, getCallById } from "@/lib/calls";
import { supabase } from "@/lib/supabase";
import {
  playCallRing,
  stopCallRing,
  requestMessageAlertPermission,
} from "@/lib/messageAlerts";

type Incoming = {
  id: string;
  caller_id: string;
  kind: "audio" | "video";
  caller_name?: string;
  caller_username?: string;
  caller_avatar?: string | null;
};

/**
 * Sticky incoming call UI — stays until Accept / Decline.
 * Does NOT disappear on a failed poll.
 */
export default function IncomingCallBootstrap() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const meId = useRef<string | null>(null);
  const activeId = useRef<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let timer: number | undefined;
    let alive = true;

    (async () => {
      const me = await getCurrentProfile();
      if (!me || !alive) return;
      meId.current = me.id;
      void requestMessageAlertPermission();

      const tick = async () => {
        if (!meId.current || !alive || busy.current) return;

        // Already on a call page — hide overlay, keep ringing stopped
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/call/")) {
          if (activeId.current) {
            stopCallRing();
          }
          return;
        }

        // If we already show a call, only dismiss when status is no longer ringing
        if (activeId.current) {
          const { data: existing } = await getCallById(activeId.current);
          if (
            !existing ||
            existing.status === "ended" ||
            existing.status === "declined" ||
            existing.status === "active"
          ) {
            // active means the other device accepted from elsewhere, or we should open
            if (existing?.status === "active" && existing.callee_id === meId.current) {
              // stay until user taps — do not auto-dismiss
              return;
            }
            if (existing?.status === "ended" || existing?.status === "declined" || !existing) {
              activeId.current = null;
              stopCallRing();
              setIncoming(null);
            }
          }
          // Still ringing — keep UI, do not restart ring spam
          return;
        }

        const { data, error } = await getIncomingRingingCalls(meId.current);
        if (error) {
          // Never clear UI on error
          console.warn("incoming calls poll", error.message);
          return;
        }
        const call = data?.[0];
        if (!call) return;

        const { data: p } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", call.caller_id)
          .single();

        const kind = call.kind === "video" ? "video" : "audio";
        activeId.current = call.id;
        setIncoming({
          id: call.id,
          caller_id: call.caller_id,
          kind,
          caller_name: p?.display_name || "Someone",
          caller_username: p?.username || "",
          caller_avatar: p?.avatar_url,
        });
        playCallRing(kind);
        try {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(
              kind === "video" ? "Incoming video call · Lumen" : "Incoming voice call · Lumen",
              {
                body: p?.display_name || "Someone is calling",
                silent: true,
              }
            );
          }
        } catch {
          /* */
        }
      };

      void tick();
      timer = window.setInterval(() => void tick(), 1500);
    })();

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
      stopCallRing();
    };
  }, []);

  async function accept() {
    if (!incoming || busy.current) return;
    busy.current = true;
    stopCallRing();
    const id = incoming.id;
    const kind = incoming.kind;
    try {
      const { error } = await updateCallStatus(id, "active");
      if (error) {
        alert(error.message || "Could not accept call.");
        // Keep UI so user can try again
        playCallRing(kind);
        busy.current = false;
        return;
      }
      activeId.current = null;
      setIncoming(null);
      router.push(`/call/${id}`);
    } catch (e: any) {
      alert(e?.message || "Could not accept call.");
      playCallRing(kind);
    } finally {
      busy.current = false;
    }
  }

  async function decline() {
    if (!incoming || busy.current) return;
    busy.current = true;
    stopCallRing();
    try {
      await updateCallStatus(incoming.id, "declined");
    } catch {
      /* */
    }
    activeId.current = null;
    setIncoming(null);
    busy.current = false;
  }

  if (!incoming) return null;

  const avatar =
    incoming.caller_avatar ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${incoming.caller_id}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-pearl p-6 text-center shadow-2xl">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-gold-deep">
          {incoming.kind === "video" ? "Video call" : "Voice call"}
        </p>
        <img
          src={avatar}
          alt=""
          className="mx-auto mt-4 h-20 w-20 rounded-full border border-border object-cover"
        />
        <h2 className="mt-3 text-xl font-bold text-charcoal">{incoming.caller_name}</h2>
        {incoming.caller_username ? (
          <p className="text-[14px] text-muted">@{incoming.caller_username}</p>
        ) : null}
        <p className="mt-2 animate-pulse text-[14px] text-charcoal">Ringing…</p>
        <div className="mt-6 flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={decline}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg"
            title="Decline"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={accept}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"
            title="Accept"
          >
            {incoming.kind === "video" ? (
              <Video className="h-7 w-7" />
            ) : (
              <Phone className="h-7 w-7" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
