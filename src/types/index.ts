export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url?: string | null;
  account_type?: "personal" | "business" | "musician" | null;
  gender?: string | null;
  bio: string | null;
  links?: string[] | null;
  gender?: string | null;
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
  profiles?: Profile;
  liked_by_user?: boolean;
  reposted_by_user?: boolean;
  bookmarked_by_user?: boolean;
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

/** Legacy shape used by mock-data */
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  links?: string[] | null;
  verified?: boolean;
  followers: number;
  following: number;
  joinedAt: string;
}

export interface Trend {
  category: string;
  title: string;
  posts: string;
}


export interface MusicTrack {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  audio_url: string;
  cover_url?: string | null;
  price_cents: number;
  currency?: string;
  plays_count?: number;
  sales_count?: number;
  created_at?: string;
}
