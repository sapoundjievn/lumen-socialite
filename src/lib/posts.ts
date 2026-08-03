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
