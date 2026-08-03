import { supabase } from "./supabase";
import type { Post } from "@/types";

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

  // Mark which posts the current user has liked
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

export async function likePost(postId: string, userId: string) {
  const { error } = await supabase
    .from("likes")
    .insert({ post_id: postId, user_id: userId });
  return { error };
}

export async function unlikePost(postId: string, userId: string) {
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  return { error };
}
