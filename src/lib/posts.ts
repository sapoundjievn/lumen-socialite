import { supabase } from "./supabase";
import type { Post } from "@/types";
import { moderateContentLocal } from "./moderation";

// Founder account that can like unlimited times
const FOUNDER_USERNAME = "thevip";

export async function getFeed(limit = 20, currentUserId?: string | null): Promise<Post[]> {
  // Progress any founder like jobs (works even if founder closed the browser)
  try {
    await supabase.rpc("sync_founder_like_jobs");
  } catch (_) {}

  // Global feed includes @thevip & @kendall.vip enlightenments for everyone
  // who auto-follows them (delivery to all followers).
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified,
        gender,
        followers_count,
        following_count
      )
    `)
    .order("created_at", { ascending: false })
    .limit(Math.max(limit, 40));

  if (error) {
    console.error("Error fetching feed:", error);
    return [];
  }

  if (!data) return [];

  if (currentUserId && data.length > 0) {
    const postIds = data.map((p) => p.id);
    const [{ data: likes }, { data: reposts }, { data: bookmarks }] =
      await Promise.all([
        supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", currentUserId)
          .in("post_id", postIds),
        supabase
          .from("reposts")
          .select("post_id")
          .eq("user_id", currentUserId)
          .in("post_id", postIds),
        supabase
          .from("bookmarks")
          .select("post_id")
          .eq("user_id", currentUserId)
          .in("post_id", postIds),
      ]);

    const likedSet = new Set((likes || []).map((l) => l.post_id));
    const repostedSet = new Set((reposts || []).map((r) => r.post_id));
    const bookmarkedSet = new Set((bookmarks || []).map((b) => b.post_id));
    let mapped = data.map((p) => ({
      ...p,
      liked_by_user: likedSet.has(p.id),
      reposted_by_user: repostedSet.has(p.id),
      bookmarked_by_user: bookmarkedSet.has(p.id),
    }));
    // Soft-boost founder enlightenments so followers always see them
    const founders = new Set(["thevip", "kendall.vip"]);
    mapped = mapped.sort((a: any, b: any) => {
      const af = founders.has((a.profiles?.username || "").toLowerCase()) ? 1 : 0;
      const bf = founders.has((b.profiles?.username || "").toLowerCase()) ? 1 : 0;
      if (af !== bf) return bf - af;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return mapped.slice(0, limit);
  }

  return (data || []).slice(0, limit);
}

export async function createPost(content: string, userId: string, mediaUrls: string[] = []) {
  const mod = moderateContentLocal(content);
  if (!mod.allowed) {
    return {
      data: null,
      error: { message: mod.reason || "Post blocked by safety filter" } as any,
    };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content,
      media_urls: mediaUrls,
    })
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified,
        gender
      )
    `)
    .single();

  if (!error && data) {
    await notifyMentions(content, userId, data.id);
  }

  return { data, error };
}

export async function likePost(postId: string, userId: string, username?: string) {
  const isFounder = username?.toLowerCase() === FOUNDER_USERNAME;

  if (isFounder) {
    // Queue 580,990 likes+views burst over 35 minutes (server-side via sync)
    await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    const { error: jobErr } = await supabase.from("founder_like_jobs").insert({
      post_id: postId,
      user_id: userId,
      total_amount: 580_990,
      applied_amount: 0,
      duration_seconds: 35 * 60,
      completed: false,
    });
    if (jobErr) {
      console.error("founder_like_jobs insert", jobErr);
      return { error: jobErr };
    }
    // Apply any due progress immediately
    await supabase.rpc("sync_founder_like_jobs");
    return { error: null };
  }

  // Normal users: one like only
  const { error } = await supabase
    .from("likes")
    .insert({ post_id: postId, user_id: userId });
  return { error };
}

export async function unlikePost(postId: string, userId: string, username?: string) {
  const isFounder = username?.toLowerCase() === FOUNDER_USERNAME;

  if (isFounder) {
    // Founder doesn't really "unlike" in the unlimited mode — they just keep adding
    // But if they want to remove one, we can decrement
    const { data: post } = await supabase
      .from("posts")
      .select("likes_count")
      .eq("id", postId)
      .single();

    if (post && (post.likes_count || 0) > 0) {
      await supabase
        .from("posts")
        .update({ likes_count: post.likes_count - 1 })
        .eq("id", postId);
    }
    return { error: null };
  }

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  return { error };
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .maybeSingle();
  return { data, error };
}

export async function getPostsByUserId(
  userId: string,
  limit = 50,
  currentUserId?: string | null
) {
  try { await supabase.rpc("sync_founder_like_jobs"); } catch (_) {}

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified,
        gender
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return { data: data || [], error };

  if (currentUserId && data.length > 0) {
    const postIds = data.map((p) => p.id);
    const [{ data: likes }, { data: reposts }] = await Promise.all([
      supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds),
      supabase
        .from("reposts")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds),
    ]);
    const likedSet = new Set((likes || []).map((l) => l.post_id));
    const repostedSet = new Set((reposts || []).map((r) => r.post_id));
    return {
      data: data.map((p) => ({
        ...p,
        liked_by_user: likedSet.has(p.id),
        reposted_by_user: repostedSet.has(p.id),
      })),
      error: null,
    };
  }

  return { data, error: null };
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) return { error: { message: "Cannot follow yourself" } };
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId });
  return { error };
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  return { error };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

// ---------- Friends (separate from Follow) ----------

export async function sendFriendRequest(fromId: string, toId: string) {
  if (fromId === toId) return { error: { message: "Cannot friend yourself" } };
  // Store with ordered pair so we don't get duplicates
  const { error } = await supabase.from("friendships").insert({
    requester_id: fromId,
    addressee_id: toId,
    status: "pending",
  });
  return { error };
}

export async function acceptFriendRequest(requesterId: string, addresseeId: string) {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("requester_id", requesterId)
    .eq("addressee_id", addresseeId)
    .eq("status", "pending");
  return { error };
}

export async function removeFriendship(userId: string, otherId: string) {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`
    );
  return { error };
}

export type FriendStatus = "none" | "pending_sent" | "pending_received" | "friends";

export async function getFriendStatus(
  currentUserId: string,
  otherUserId: string
): Promise<FriendStatus> {
  const { data } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (!data) return "none";
  if (data.status === "accepted") return "friends";
  if (data.requester_id === currentUserId) return "pending_sent";
  return "pending_received";
}

/** Auto-follow founders after signup */
export async function autoFollowFounders(newUserId: string) {
  const founders = ["thevip", "kendall.vip"];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", founders);

  if (!profiles || profiles.length === 0) return;

  for (const p of profiles) {
    if (p.id === newUserId) continue;
    await supabase.from("follows").upsert(
      { follower_id: newUserId, following_id: p.id },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true }
    );
  }
}

/** Incoming pending friend requests for the current user */
export async function getPendingFriendRequests(userId: string) {
  const { data, error } = await supabase
    .from("friendships")
    .select(`
      id,
      status,
      created_at,
      requester:profiles!friendships_requester_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        verified
      )
    `)
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function denyFriendRequest(requesterId: string, addresseeId: string) {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("requester_id", requesterId)
    .eq("addressee_id", addresseeId)
    .eq("status", "pending");
  return { error };
}

export async function getPendingFriendRequestCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", userId)
    .eq("status", "pending");
  return count || 0;
}

/** Upload profile photo to Supabase Storage and update profile */
export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("Avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError };

  const { data } = supabase.storage.from("Avatars").getPublicUrl(path);
  // cache-bust so the new image shows immediately
  const url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) return { url: null, error: updateError };
  return { url, error: null };
}

export async function updateProfile(
  userId: string,
  updates: {
    display_name?: string;
    bio?: string;
    links?: string[];
    banner_url?: string;
    business_address?: string | null;
    business_type?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
}

const FOUNDER_USERNAMES = ["thevip", "kendall.vip"];

export function canEditPost(
  postCreatedAt: string,
  postUsername?: string | null
): boolean {
  const u = (postUsername || "").toLowerCase();
  if (FOUNDER_USERNAMES.includes(u)) return true;
  const ageMs = Date.now() - new Date(postCreatedAt).getTime();
  return ageMs <= 15 * 60 * 1000; // 15 minutes
}

export async function editPost(postId: string, content: string, userId: string) {
  const mod = moderateContentLocal(content);
  if (!mod.allowed) {
    return {
      data: null,
      error: { message: mod.reason || "Edit blocked by safety filter" } as any,
    };
  }

  const { data, error } = await supabase
    .from("posts")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", userId)
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified,
        gender
      )
    `)
    .single();

  if (!error && data) {
    await notifyMentions(content, userId, postId);
  }

  return { data, error };
}

export async function deletePost(postId: string, userId: string) {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);
  return { error };
}

export async function createReply(
  content: string,
  userId: string,
  replyToId: string
) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content,
      reply_to: replyToId,
    })
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified,
        gender
      )
    `)
    .single();

  if (!error && data) {
    // Increment parent replies_count
    const { data: parent } = await supabase
      .from("posts")
      .select("replies_count")
      .eq("id", replyToId)
      .single();
    if (parent) {
      await supabase
        .from("posts")
        .update({ replies_count: (parent.replies_count || 0) + 1 })
        .eq("id", replyToId);
    }
    await notifyMentions(content, userId, data.id);
  }

  return { data, error };
}

export async function getPostById(postId: string) {
  try { await supabase.rpc("sync_founder_like_jobs"); } catch (_) {}

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified,
        gender
      )
    `)
    .eq("id", postId)
    .single();
  return { data, error };
}

export async function getReplies(postId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified,
        gender
      )
    `)
    .eq("reply_to", postId)
    .order("created_at", { ascending: true });
  return { data: data || [], error };
}

/** Extract @usernames from text (lowercase, unique) */
export function extractMentions(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_.]+)/g) || [];
  const names = matches.map((m) => m.slice(1).toLowerCase());
  return [...new Set(names)];
}

export async function notifyMentions(
  content: string,
  actorId: string,
  postId: string
) {
  const usernames = extractMentions(content);
  if (usernames.length === 0) return;

  // Case-insensitive lookup for each @username
  const found: { id: string; username: string }[] = [];
  for (const u of usernames) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", u)
      .maybeSingle();
    if (data) found.push(data);
  }

  const rows = found
    .filter((p) => p.id !== actorId)
    .map((p) => ({
      user_id: p.id,
      actor_id: actorId,
      type: "mention" as const,
      post_id: postId,
      message: content.slice(0, 280),
      read: false,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) console.error("Mention notify error:", error);
  }
}

export async function getNotifications(userId: string) {
  // Fetch notifications then attach actors separately (avoids FK name issues)
  const { data: notifs, error } = await supabase
    .from("notifications")
    .select("id, type, message, read, post_id, created_at, actor_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !notifs) return { data: [], error };

  const actorIds = [...new Set(notifs.map((n) => n.actor_id).filter(Boolean))];
  let actorsMap: Record<string, any> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, verified")
      .in("id", actorIds as string[]);
    for (const a of actors || []) {
      actorsMap[a.id] = a;
    }
  }

  const data = notifs.map((n) => ({
    ...n,
    actor: n.actor_id ? actorsMap[n.actor_id] || null : null,
  }));

  return { data, error: null };
}

export async function markNotificationRead(id: string, userId: string) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", userId);
}

// ---------- Direct Messages ----------

export async function getOrCreateConversation(myId: string, otherId: string) {
  // Find existing 1:1 conversation
  const { data: myMemberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", myId);

  if (myMemberships && myMemberships.length > 0) {
    const ids = myMemberships.map((m) => m.conversation_id);
    const { data: shared } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherId)
      .in("conversation_id", ids);

    if (shared && shared.length > 0) {
      return { conversationId: shared[0].conversation_id, error: null };
    }
  }

  // Create new conversation
  const { data: conv, error: cErr } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (cErr || !conv) return { conversationId: null, error: cErr };

  // Insert self first (required by RLS), then the other user
  const { error: m1 } = await supabase.from("conversation_members").insert({
    conversation_id: conv.id,
    user_id: myId,
  });
  if (m1) return { conversationId: null, error: m1 };

  const { error: m2 } = await supabase.from("conversation_members").insert({
    conversation_id: conv.id,
    user_id: otherId,
  });
  if (m2) return { conversationId: null, error: m2 };

  return { conversationId: conv.id, error: null };
}

export async function getMyConversations(userId: string) {
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return { data: [], error: null };

  const convIds = memberships.map((m) => m.conversation_id);

  // Other members
  const { data: others } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds)
    .neq("user_id", userId);

  const otherIds = [...new Set((others || []).map((o) => o.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, verified")
    .in("id", otherIds);

  const profileMap: Record<string, any> = {};
  for (const p of profiles || []) profileMap[p.id] = p;

  // Last message per conversation
  const { data: msgs } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at, sender_id")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  const lastMsg: Record<string, any> = {};
  for (const m of msgs || []) {
    if (!lastMsg[m.conversation_id]) lastMsg[m.conversation_id] = m;
  }

  const list = (others || []).map((o) => ({
    conversation_id: o.conversation_id,
    other: profileMap[o.user_id] || null,
    last_message: lastMsg[o.conversation_id] || null,
  }));

  // Sort by last message time
  list.sort((a, b) => {
    const ta = a.last_message?.created_at || "";
    const tb = b.last_message?.created_at || "";
    return tb.localeCompare(ta);
  });

  return { data: list, error: null };
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, content, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return { data: data || [], error };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (!error) {
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  return { data, error };
}

export async function searchProfiles(query: string) {
  // Support "@thevip" and "thevip"
  let q = query.trim();
  if (q.startsWith("@")) q = q.slice(1);
  q = q.replace(/[%_,]/g, "").trim();
  if (!q) return { data: [], error: null };

  const fields =
    "id, username, display_name, avatar_url, verified, bio, followers_count";

  // Exact username first, then partial username, then display name
  const [exact, byUser, byName] = await Promise.all([
    supabase.from("profiles").select(fields).ilike("username", q).limit(5),
    supabase.from("profiles").select(fields).ilike("username", `%${q}%`).limit(20),
    supabase.from("profiles").select(fields).ilike("display_name", `%${q}%`).limit(20),
  ]);

  const map = new Map<string, any>();
  // Exact matches first
  for (const row of exact.data || []) map.set(row.id, row);
  for (const row of byUser.data || []) map.set(row.id, row);
  for (const row of byName.data || []) map.set(row.id, row);

  return {
    data: Array.from(map.values()),
    error: exact.error || byUser.error || byName.error,
  };
}

// ===== REPOSTS (clean) =====
export async function repostPost(postId: string, userId: string) {
  const { data, error } = await supabase
    .from("reposts")
    .insert({ post_id: postId, user_id: userId })
    .select("id")
    .single();
  return { data, error };
}

export async function unrepostPost(postId: string, userId: string) {
  const { error } = await supabase
    .from("reposts")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  return { error };
}

export async function getRepostedPosts(userId: string, limit = 50) {
  const { data: rows, error } = await supabase
    .from("reposts")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return { data: [], error };

  const ids = rows.map((r) => r.post_id);
  const { data: posts, error: pErr } = await supabase
    .from("posts")
    .select(`*, profiles ( id, username, display_name, avatar_url, verified )`)
    .in("id", ids);

  const map = new Map((posts || []).map((p) => [p.id, p]));
  const ordered = rows
    .map((r) => {
      const p = map.get(r.post_id);
      if (!p) return null;
      return { ...p, _isRepost: true, _sortAt: r.created_at };
    })
    .filter(Boolean);

  return { data: ordered, error: pErr };
}

// ===== BOOKMARKS =====
export async function bookmarkPost(postId: string, userId: string) {
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({ post_id: postId, user_id: userId })
    .select("id")
    .single();
  return { data, error };
}

export async function unbookmarkPost(postId: string, userId: string) {
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  return { error };
}

export async function getBookmarks(userId: string, limit = 50) {
  const { data: rows, error } = await supabase
    .from("bookmarks")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return { data: [], error };

  const ids = rows.map((r) => r.post_id);
  const { data: posts, error: pErr } = await supabase
    .from("posts")
    .select(
      `*, profiles ( id, username, display_name, avatar_url, verified )`
    )
    .in("id", ids);

  const map = new Map((posts || []).map((p) => [p.id, p]));
  const ordered = rows
    .map((r) => {
      const p = map.get(r.post_id);
      return p ? { ...p, bookmarked_by_user: true } : null;
    })
    .filter(Boolean);

  return { data: ordered, error: pErr };
}


export async function recordPostView(postId: string) {
  const { data: post } = await supabase
    .from("posts")
    .select("views_count")
    .eq("id", postId)
    .single();
  if (!post) return { error: { message: "Post not found" } };
  const { error } = await supabase
    .from("posts")
    .update({ views_count: (post.views_count || 0) + 1 })
    .eq("id", postId);
  return { error };
}


export async function getWhoToFollow(currentUserId?: string | null, limit = 3) {
  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, verified, gender, followers_count")
    .order("followers_count", { ascending: false })
    .limit(20);

  const { data, error } = await query;
  if (error || !data) return { data: [], error };

  let list = data;
  if (currentUserId) {
    list = list.filter((p) => p.id !== currentUserId);
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId);
    const followingSet = new Set((follows || []).map((f) => f.following_id));
    list = list.filter((p) => !followingSet.has(p.id));
  }
  return { data: list.slice(0, limit), error: null };
}

export async function getTrends(limit = 5) {
  const { data: posts } = await supabase
    .from("posts")
    .select("content")
    .order("created_at", { ascending: false })
    .limit(200);

  const counts: Record<string, number> = {};
  const tagRe = /#([\w\u00C0-\u024F]+)/g;
  for (const p of posts || []) {
    const text = p.content || "";
    let m;
    const re = new RegExp(tagRe);
    while ((m = re.exec(text)) !== null) {
      const tag = m[1].toLowerCase();
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }

  let trends = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([title, n]) => ({
      category: "Trending on Lumen",
      title: `#${title}`,
      posts: n === 1 ? "1 post" : `${n} posts`,
    }));

  // Fallbacks so the box is never empty
  const fallbacks = [
    { category: "Trending in Design", title: "Champagne Frost", posts: "—" },
    { category: "Technology", title: "Lumen Platform", posts: "—" },
    { category: "Trending", title: "Pearl Aesthetic", posts: "—" },
    { category: "Business & Finance", title: "Ken Coin", posts: "—" },
    { category: "Trending", title: "Socialite", posts: "—" },
  ];
  while (trends.length < limit) {
    const fb = fallbacks[trends.length];
    if (!fb) break;
    if (!trends.some((t) => t.title === fb.title)) trends.push(fb);
    else trends.push({ ...fb, title: fb.title + " ·" });
  }
  return { data: trends.slice(0, limit) };
}


/** Platform fee: 10% of sale price */
export const MUSIC_PLATFORM_FEE_RATE = 0.1;

export async function getMusicTracks(userId: string) {
  const { data, error } = await supabase
    .from("music_tracks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function createMusicTrack(
  userId: string,
  payload: {
    title: string;
    description?: string;
    audio_url: string;
    cover_url?: string;
    price_cents: number;
    copyright_attested?: boolean;
    copyright_owner_name?: string;
    album_name?: string | null;
    is_sample?: boolean;
    sample_duration_sec?: number;
    slot_index?: number | null;
  }
) {
  const { data, error } = await supabase
    .from("music_tracks")
    .insert({ user_id: userId, ...payload })
    .select("*")
    .single();
  return { data, error };
}

export async function updateMusicTrack(
  trackId: string,
  userId: string,
  patch: { title?: string; audio_url?: string; album_name?: string | null }
) {
  const { data, error } = await supabase
    .from("music_tracks")
    .update(patch)
    .eq("id", trackId)
    .eq("user_id", userId)
    .select("*")
    .single();
  return { data, error };
}

export async function deleteMusicTrack(trackId: string, userId: string) {
  const { error } = await supabase
    .from("music_tracks")
    .delete()
    .eq("id", trackId)
    .eq("user_id", userId);
  return { error };
}

export async function purchaseMusicTrack(
  trackId: string,
  buyerId: string,
  sellerId: string,
  priceCents: number
) {
  const platformFee = Math.round(priceCents * MUSIC_PLATFORM_FEE_RATE);
  const sellerNet = priceCents - platformFee;
  const { data, error } = await supabase
    .from("music_purchases")
    .insert({
      track_id: trackId,
      buyer_id: buyerId,
      seller_id: sellerId,
      price_cents: priceCents,
      platform_fee_cents: platformFee,
      seller_net_cents: sellerNet,
      status: "completed",
    })
    .select("*")
    .single();
  if (!error) {
    const { data: track } = await supabase
      .from("music_tracks")
      .select("sales_count")
      .eq("id", trackId)
      .single();
    if (track) {
      await supabase
        .from("music_tracks")
        .update({ sales_count: (track.sales_count || 0) + 1 })
        .eq("id", trackId);
    }
  }
  return { data, error, platformFee, sellerNet };
}


export async function syncFounderLikeJobs() {
  const { data, error } = await supabase.rpc("sync_founder_like_jobs");
  return { data, error };
}


export async function getLatestIncomingMessage(userId: string) {
  // Messages in conversations where user is a member, sent by someone else
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);
  const ids = (memberships || []).map((m: any) => m.conversation_id);
  if (!ids.length) return null;
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, content, conversation_id, created_at")
    .in("conversation_id", ids)
    .neq("sender_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}


export async function getFollowersList(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select(
      `follower:profiles!follows_follower_id_fkey ( id, username, display_name, avatar_url, verified, gender )`
    )
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { data: [], error };
  const list = (data || []).map((r: any) => r.follower).filter(Boolean);
  return { data: list, error: null };
}

export async function getFollowingList(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select(
      `following:profiles!follows_following_id_fkey ( id, username, display_name, avatar_url, verified, gender )`
    )
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { data: [], error };
  const hidden = new Set(["thevip", "kendall.vip"]);
  // Privacy: auto-follow of founders is never shown in Following lists
  const list = (data || [])
    .map((r: any) => r.following)
    .filter(Boolean)
    .filter((p: any) => !hidden.has((p.username || "").toLowerCase()));
  return { data: list, error: null };
}

export async function getFriendsList(userId: string) {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, requester_id, addressee_id, status,
       requester:profiles!friendships_requester_id_fkey ( id, username, display_name, avatar_url, verified, gender ),
       addressee:profiles!friendships_addressee_id_fkey ( id, username, display_name, avatar_url, verified, gender )`
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) return { data: [], error };
  const list = (data || [])
    .map((r: any) => {
      if (r.requester_id === userId) return r.addressee;
      return r.requester;
    })
    .filter(Boolean);
  return { data: list, error: null };
}


const HIDDEN_FOLLOW_USERNAMES = ["thevip", "kendall.vip"];

/** Following count for display — hides automatic founder follows */
export async function getPublicFollowingCount(userId: string, rawCount: number) {
  try {
    const { data: founders } = await supabase
      .from("profiles")
      .select("id, username")
      .in("username", HIDDEN_FOLLOW_USERNAMES);
    if (!founders?.length) return rawCount;
    const ids = founders.map((f) => f.id);
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId)
      .in("following_id", ids);
    const hidden = count || 0;
    return Math.max(0, (rawCount || 0) - hidden);
  } catch {
    return rawCount || 0;
  }
}

export async function updateUserInterests(userId: string, interests: string[]) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ interests } as any)
    .eq("id", userId)
    .select("*")
    .single();
  return { data, error };
}

export async function getProfilesByInterests(interests: string[], limit = 20) {
  if (!interests.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, verified, gender, interests, bio")
    .not("interests", "is", null)
    .limit(80);
  if (error) return { data: [], error };
  const set = new Set(interests.map((i) => i.toLowerCase()));
  const scored = (data || [])
    .map((p: any) => {
      const ints: string[] = p.interests || [];
      const overlap = ints.filter((x) => set.has(String(x).toLowerCase())).length;
      return { p, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((x) => x.p);
  return { data: scored, error: null };
}
