import { supabase } from "./supabase";

export async function reportContent(opts: {
  reporterId: string;
  reason: string;
  postId?: string;
  reportedUserId?: string;
  details?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: opts.reporterId,
    reason: opts.reason,
    post_id: opts.postId || null,
    reported_user_id: opts.reportedUserId || null,
    details: opts.details || null,
  });
  return { error };
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    return { error: { message: "Cannot block yourself" } as any };
  }
  const { error } = await supabase.from("blocks").insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  return { error };
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  return { error };
}

export async function isBlocked(blockerId: string, otherId: string) {
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", otherId)
    .maybeSingle();
  return !!data;
}

export async function getBlockedIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  return (data || []).map((r) => r.blocked_id);
}


export async function toggleBlock(blockedId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in", blocked: false };
  if (user.id === blockedId) return { error: "Cannot block yourself", blocked: false };

  const { data: existing } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);
    return { error, blocked: false };
  }

  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });
  return { error, blocked: true };
}

export async function listMyBlocks() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id, created_at, profiles:blocked_id (username, display_name, avatar_url)")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });
  return data || [];
}
