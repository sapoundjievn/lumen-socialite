import { supabase } from "./supabase";
import type { Post } from "@/types";

// Founder account that can like unlimited times
const FOUNDER_USERNAME = "thevip";

export async function getFeed(limit = 20, currentUserId?: string | null): Promise<Post[]> {
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
        followers_count,
        following_count
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching feed:", error);
    return [];
  }

  if (!data) return [];

  if (currentUserId && data.length > 0) {
    const postIds = data.map((p) => p.id);
    const { data: likes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", postIds);

    const likedSet = new Set((likes || []).map((l) => l.post_id));
    return data.map((p) => ({
      ...p,
      liked_by_user: likedSet.has(p.id),
    }));
  }

  return data;
}

export async function createPost(content: string, userId: string, mediaUrls: string[] = []) {
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
        verified
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
    // Founder: always increment count (unlimited likes)
    // We still try to insert a like row, but ignore unique errors
    await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    
    // Force increment the counter regardless
    const { data: post } = await supabase
      .from("posts")
      .select("likes_count")
      .eq("id", postId)
      .single();

    if (post) {
      await supabase
        .from("posts")
        .update({ likes_count: (post.likes_count || 0) + 1 })
        .eq("id", postId);
    }
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

export async function getPostsByUserId(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: data || [], error };
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
  updates: { display_name?: string; bio?: string }
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
        verified
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
        verified
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
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        verified
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
        verified
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
  const q = query.trim().replace(/[%_,]/g, "");
  if (!q) return { data: [], error: null };

  // Two queries then merge (more reliable than or+ilike on some setups)
  const [byUser, byName] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, verified, bio, followers_count")
      .ilike("username", `%${q}%`)
      .limit(20),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, verified, bio, followers_count")
      .ilike("display_name", `%${q}%`)
      .limit(20),
  ]);

  const map = new Map<string, any>();
  for (const row of [...(byUser.data || []), ...(byName.data || [])]) {
    map.set(row.id, row);
  }

  return { data: Array.from(map.values()), error: byUser.error || byName.error };
}
