export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at?: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  reply_to: string | null;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  views_count: number;
  created_at: string;
  // Joined data
  profiles?: Profile;
  liked_by_user?: boolean;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// Keep old names for compatibility during transition
export type User = Profile;
