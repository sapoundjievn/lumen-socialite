import { supabase } from "./supabase";

export async function createCallSession(opts: {
  callerId: string;
  calleeId: string;
  kind: "audio" | "video";
}) {
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
