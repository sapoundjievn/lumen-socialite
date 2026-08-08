"use client";
/* feed-interaction-v2 */

import { useState, useEffect } from "react";
import { Post } from "@/types";
import { getFeed, createPost, likePost, unlikePost, repostPost, unrepostPost, bookmarkPost, unbookmarkPost } from "@/lib/posts";
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

  const handlePost = async (content: string, mediaUrls: string[] = []) => {
    if (!currentUserId) {
      alert("Please sign in to post");
      return;
    }

    const { data, error } = await createPost(content, currentUserId, mediaUrls);
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
      // One click = +2000 likes & +2000 views, count up one-by-one on screen
      const BURST = 2000;
      const baseLikes = post.likes_count || 0;
      const baseViews = post.views_count || 0;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, liked_by_user: true } : p
        )
      );
      // fire DB update (full +2000) without waiting for animation
      void likePost(id, currentUserId, currentUsername || undefined);

      let added = 0;
      const step = () => {
        // ~50 per frame ≈ 40 frames ≈ 0.7s at 60fps, still looks sequential
        const inc = Math.min(50, BURST - added);
        added += inc;
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  liked_by_user: true,
                  likes_count: baseLikes + added,
                  views_count: baseViews + added,
                }
              : p
          )
        );
        if (added < BURST) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
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

  const handleRepost = async (id: string) => {
    if (!currentUserId) {
      alert("Please sign in to repost");
      return;
    }
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const was = !!post.reposted_by_user;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              reposted_by_user: !was,
              reposts_count: (p.reposts_count || 0) + (was ? -1 : 1),
            }
          : p
      )
    );

    const { error } = was
      ? await unrepostPost(id, currentUserId)
      : await repostPost(id, currentUserId);

    if (error) {
      // revert
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                reposted_by_user: was,
                reposts_count: (p.reposts_count || 0) + (was ? 1 : -1),
              }
            : p
        )
      );
      alert("Repost failed: " + (error.message || JSON.stringify(error)));
    }
  };


  const handleBookmark = async (id: string) => {
    if (!currentUserId) {
      alert("Please sign in to bookmark");
      return;
    }
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const was = !!post.bookmarked_by_user;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, bookmarked_by_user: !was } : p
      )
    );
    const { error } = was
      ? await unbookmarkPost(id, currentUserId)
      : await bookmarkPost(id, currentUserId);
    if (error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, bookmarked_by_user: was } : p
        )
      );
      alert("Bookmark failed: " + (error.message || "error"));
    }
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
              onBookmark={handleBookmark}
              currentUserId={currentUserId}
              onPostUpdated={(updated) =>
                setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
              }
              onPostDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
            />
          ))
        )}
      </div>
    </main>
  );
}
