"use client";

import { useI18n } from "@/lib/i18n";
import StoriesBar from "@/components/StoriesBar";
/* feed-interaction-v2 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Post } from "@/types";
import { getFeed, createPost, likePost, unlikePost, reverseFounderLike, repostPost, unrepostPost, reverseFounderRepost, bookmarkPost, unbookmarkPost, syncFounderLikeJobs } from "@/lib/posts";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/auth";
import Composer from "./Composer";
import PostCard from "./PostCard";

export default function Feed() {
  const { t } = useI18n();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"for-you" | "following">("for-you");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");

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
      // @thevip: each click +550,340 likes & views (stacks every click)
      const BOOST = 550_340;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                liked_by_user: true,
                likes_count: (p.likes_count || 0) + BOOST,
                views_count: (p.views_count || 0) + BOOST,
              }
            : p
        )
      );
      const res: any = await likePost(id, currentUserId, currentUsername || undefined);
      if (res?.error) {
        alert(res.error.message || "Could not apply likes");
        return;
      }
      if (res?.likes_count != null) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  liked_by_user: true,
                  likes_count: res.likes_count,
                  views_count: res.views_count,
                }
              : p
          )
        );
      }
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
    const isFounder = currentUsername?.toLowerCase() === "thevip";

    if (isFounder) {
      // @thevip: each repost click +154 (stacks every click)
      const BOOST = 154;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                reposted_by_user: true,
                reposts_count: (p.reposts_count || 0) + BOOST,
              }
            : p
        )
      );
      const res: any = await repostPost(id, currentUserId, currentUsername || undefined);
      if (res?.error) {
        alert(res.error.message || "Repost failed");
        return;
      }
      if (res?.reposts_count != null) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, reposted_by_user: true, reposts_count: res.reposts_count }
              : p
          )
        );
      }
      return;
    }

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



  const handleReverseLike = async (id: string) => {
    if (currentUsername?.toLowerCase() !== "thevip") return;
    const BOOST = 550_340;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              likes_count: Math.max(0, (p.likes_count || 0) - BOOST),
              views_count: Math.max(0, (p.views_count || 0) - BOOST),
            }
          : p
      )
    );
    const res: any = await reverseFounderLike(id, currentUsername || undefined);
    if (res?.error) alert(res.error.message);
    else if (res?.likes_count != null) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, likes_count: res.likes_count, views_count: res.views_count }
            : p
        )
      );
    }
  };

  const handleReverseRepost = async (id: string) => {
    if (currentUsername?.toLowerCase() !== "thevip") return;
    if (!currentUserId) return;
    const BOOST = 154;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              reposts_count: Math.max(0, (p.reposts_count || 0) - BOOST),
            }
          : p
      )
    );
    const res: any = await reverseFounderRepost(
      id,
      currentUsername || undefined,
      currentUserId
    );
    if (res?.error) alert(res.error.message);
    else if (res?.reposts_count != null) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                reposts_count: res.reposts_count,
                reposted_by_user: res.reposts_count > 0,
              }
            : p
        )
      );
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
        <div className="flex items-center gap-3 px-3 py-2.5">
          <h1 className="shrink-0 text-xl font-bold leading-none text-charcoal">{t("home")}</h1>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQ.trim()) {
                  router.push(`/explore?q=${encodeURIComponent(searchQ.trim())}`);
                }
              }}
              placeholder="Search Lumen"
              className="w-full rounded-full border border-transparent bg-frost py-2 pl-9 pr-3 text-[14px] text-charcoal placeholder:text-muted focus:border-gold-soft focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold-soft"
            />
          </div>
        </div>

        <div className="flex">
          <button
            onClick={() => setTab("for-you")}
            className="relative flex-1 py-3 text-center text-[15px] font-medium transition hover:bg-champagne/30"
          >
            <span className={tab === "for-you" ? "font-bold text-charcoal" : "text-muted"}>
              {t("forYou")}
            </span>
            {tab === "for-you" && (
              <div className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-gold" />
            )}
          </button>
          <button
            onClick={() => setTab("following")}
            className="relative flex-1 py-3 text-center text-[15px] font-medium transition hover:bg-champagne/30"
          >
            <span className={tab === "following" ? "font-bold text-charcoal" : "text-muted"}>
              {t("followingTab")}
            </span>
            {tab === "following" && (
              <div className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-gold" />
            )}
          </button>
        </div>
      </div>

      <StoriesBar />
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
              onReverseLike={currentUsername?.toLowerCase() === "thevip" ? handleReverseLike : undefined}
              onReverseRepost={currentUsername?.toLowerCase() === "thevip" ? handleReverseRepost : undefined}
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
