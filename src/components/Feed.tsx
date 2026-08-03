"use client";

import { useState, useEffect } from "react";
import { Post } from "@/types";
import { getFeed, createPost, likePost, unlikePost } from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import Composer from "./Composer";
import PostCard from "./PostCard";

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"for-you" | "following">("for-you");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      const uid = p?.id || null;
      const uname = p?.username || null;
      setCurrentUserId(uid);
      setCurrentUsername(uname);
      loadFeed(uid);
    });
  }, []);

  async function loadFeed(uid?: string | null) {
    setLoading(true);
    const data = await getFeed(20, uid ?? currentUserId);
    setPosts(data);
    setLoading(false);
  }

  const handlePost = async (content: string) => {
    if (!currentUserId) {
      alert("Please sign in to post");
      return;
    }

    const { data, error } = await createPost(content, currentUserId);
    if (error) {
      console.error(error);
      alert("Failed to post: " + error.message);
      return;
    }
    if (data) {
      setPosts([{ ...data, liked_by_user: false }, ...posts]);
    }
  };

  const handleLike = async (id: string) => {
    if (!currentUserId) {
      alert("Please sign in to like");
      return;
    }

    const post = posts.find((p) => p.id === id);
    if (!post) return;

    const isFounder = currentUsername?.toLowerCase() === "thevip";
    const wasLiked = post.liked_by_user;

    if (isFounder) {
      // Founder: every click adds +1 (unlimited)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                liked_by_user: true,
                likes_count: (p.likes_count || 0) + 1,
              }
            : p
        )
      );
      await likePost(id, currentUserId, currentUsername || undefined);
      return;
    }

    // Normal user: toggle one like
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked_by_user: !wasLiked,
              likes_count: (p.likes_count || 0) + (wasLiked ? -1 : 1),
            }
          : p
      )
    );

    if (wasLiked) {
      await unlikePost(id, currentUserId, currentUsername || undefined);
    } else {
      await likePost(id, currentUserId, currentUsername || undefined);
    }
  };

  const handleRepost = (id: string) => {
    // Coming soon
  };

  return (
    <main className="min-h-screen w-full border-x-0 sm:border-x border-border">
      <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <img
            src="/logo.jpg"
            alt="Lumen Socialite"
            className="h-9 w-9 flex-shrink-0 rounded-full object-cover object-top shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold leading-none text-charcoal">Home</h1>
              <span className="hidden text-[13px] font-medium text-[#C9A86C] sm:inline">
                · Lumen · Socialite
              </span>
            </div>
            <div className="mt-0.5 text-[12px] font-medium leading-none text-[#C9A86C] sm:hidden">
              Lumen · Socialite
            </div>
          </div>
        </div>

        <div className="flex">
          <button
            onClick={() => setTab("for-you")}
            className="relative flex-1 py-4 text-center text-[15px] font-medium transition hover:bg-champagne/30"
          >
            <span className={tab === "for-you" ? "font-bold text-charcoal" : "text-muted"}>
              For you
            </span>
            {tab === "for-you" && (
              <div className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-gold" />
            )}
          </button>
          <button
            onClick={() => setTab("following")}
            className="relative flex-1 py-4 text-center text-[15px] font-medium transition hover:bg-champagne/30"
          >
            <span className={tab === "following" ? "font-bold text-charcoal" : "text-muted"}>
              Following
            </span>
            {tab === "following" && (
              <div className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-gold" />
            )}
          </button>
        </div>
      </div>

      <Composer onPost={handlePost} />

      <div>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-3">✨</div>
            <h2 className="text-xl font-bold text-charcoal">No enlightenments yet</h2>
            <p className="mt-2 text-muted">Be the first to share something beautiful.</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onRepost={handleRepost}
            />
          ))
        )}
      </div>
    </main>
  );
}
