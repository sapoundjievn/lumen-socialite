"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneOff, Video } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getIncomingRingingCalls, updateCallStatus } from "@/lib/calls";
import { supabase } from "@/lib/supabase";
import {
  playCallRing,
  stopCallRing,
  alertNewMessage,
} from "@/lib/messageAlerts";

type Incoming = {
  id: string;
  caller_id: string;
  kind: string;
  caller_name?: string;
  caller_username?: string;
  caller_avatar?: string | null;
};

/** Global: incoming call ring + Accept / Decline */
export default function IncomingCallBootstrap() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const meId = useRef<string | null>(null);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let alive = true;

    (async () => {
      const me = await getCurrentProfile();
      if (!me || !alive) return;
      meId.current = me.id;

      const tick = async () => {
        if (!meId.current || !alive) return;
        // Don't show overlay if already on a call page
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/call/")) {
          return;
        }
        const { data } = await getIncomingRingingCalls(meId.current);
        const call = data?.[0];
        if (!call) {
          if (activeId.current) {
            activeId.current = null;
            stopCallRing();
            setIncoming(null);
          }
          return;
        }
        if (activeId.current === call.id) return;

        const { data: p } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", call.caller_id)
          .single();

        activeId.current = call.id;
        setIncoming({
          id: call.id,
          caller_id: call.caller_id,
          kind: call.kind || "audio",
          caller_name: p?.display_name || "Someone",
          caller_username: p?.username || "",
          caller_avatar: p?.avatar_url,
        });
        playCallRing();
        alertNewMessage(
          call.kind === "video" ? "Incoming video call · Lumen" : "Incoming voice call · Lumen",
          p?.display_name || "Someone is calling"
        );
      };

      void tick();
      timer = window.setInterval(() => void tick(), 2000);
    })();

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
      stopCallRing();
    };
  }, []);

  async function accept() {
    if (!incoming) return;
    stopCallRing();
    const id = incoming.id;
    await updateCallStatus(id, "active");
    activeId.current = null;
    setIncoming(null);
    router.push(`/call/${id}`);
  }

  async function decline() {
    if (!incoming) return;
    stopCallRing();
    await updateCallStatus(incoming.id, "declined");
    activeId.current = null;
    setIncoming(null);
  }

  if (!incoming) return null;

  const avatar =
    incoming.caller_avatar ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${incoming.caller_id}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
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
