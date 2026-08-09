import { supabase } from "./supabase";

export type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
  expires_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified?: boolean;
  };
};

export async function getActiveStories() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("stories")
    .select(
      `*, profiles ( id, username, display_name, avatar_url, verified )`
    )
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(100);
  return { data: (data || []) as Story[], error };
}

export async function getUserStories(userId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("user_id", userId)
    .gt("expires_at", now)
    .order("created_at", { ascending: true });
  return { data: (data || []) as Story[], error };
}

export async function createStory(opts: {
  userId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
}) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: opts.userId,
      media_url: opts.mediaUrl,
      media_type: opts.mediaType,
      caption: opts.caption || null,
      expires_at: expires,
    })
    .select("*")
    .single();
  return { data, error };
}
