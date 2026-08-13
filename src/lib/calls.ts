import { supabase } from "./supabase";

export async function createCallSession(opts: {
  callerId: string;
  calleeId: string;
  kind: "audio" | "video";
}) {
  if (!opts.callerId || !opts.calleeId) {
    return {
      data: null,
      error: { message: "Missing caller or recipient for this call." } as any,
    };
  }
  if (opts.callerId === opts.calleeId) {
    return {
      data: null,
      error: { message: "You cannot call yourself." } as any,
    };
  }
  const { data, error } = await supabase
    .from("call_sessions")
    .insert({
      caller_id: opts.callerId,
      callee_id: opts.calleeId,
      kind: opts.kind,
      status: "ringing",
    })
    .select("*")
    .single();
  if (error) {
    const msg = error.message || "";
    if (/call_sessions|schema cache|does not exist/i.test(msg)) {
      return {
        data: null,
        error: {
          ...error,
          message:
            "Calls table missing — run calls-webrtc.sql in Supabase SQL Editor.",
        },
      };
    }
    if (/row-level security|RLS|permission/i.test(msg)) {
      return {
        data: null,
        error: {
          ...error,
          message:
            "Call blocked by security policy — re-run calls-webrtc.sql (RLS policies).",
        },
      };
    }
  }
  return { data, error };
}

export async function updateCallStatus(
  callId: string,
  status: "ringing" | "active" | "ended" | "declined"
) {
  const { error } = await supabase
    .from("call_sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", callId);
  return { error };
}

export async function sendCallSignal(opts: {
  callId: string;
  senderId: string;
  signal: any;
}) {
  const { error } = await supabase.from("call_signals").insert({
    call_id: opts.callId,
    sender_id: opts.senderId,
    payload: opts.signal,
  });
  return { error };
}

export async function getIncomingRingingCalls(userId: string) {
  const { data, error } = await supabase
    .from("call_sessions")
    .select("id, caller_id, callee_id, kind, status, created_at")
    .eq("callee_id", userId)
    .eq("status", "ringing")
    .order("created_at", { ascending: false })
    .limit(5);
  return { data: data || [], error };
}

export async function getCallById(callId: string) {
  const { data, error } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("id", callId)
    .single();
  return { data, error };
}

export const CALL_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];
