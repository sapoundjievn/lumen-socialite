"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBookmarks, bookmarkPost, unbookmarkPost, likePost, unlikePost, repostPost, unrepostPost } from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import type { Post } from "@/types";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await getCurrentProfile();
      if (!me) {
        setLoading(false);
        return;
      }
      setUserId(me.id);
      const { data } = await getBookmarks(me.id);
      setPosts((data as Post[]) || []);
      setLoading(false);
    })();
  }, []);

  async function handleBookmark(id: string) {
    if (!userId) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await unbookmarkPost(id, userId);
  }

  async function handleLike(id: string) {
    if (!userId) return;
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const was = !!post.liked_by_user;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked_by_user: !was,
              likes_count: (p.likes_count || 0) + (was ? -1 : 1),
            }
          : p
      )
    );
    if (was) await unlikePost(id, userId);
    else await likePost(id, userId);
  }

  async function handleRepost(id: string) {
    if (!userId) return;
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
    if (was) await unrepostPost(id, userId);
    else await repostPost(id, userId);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 border-border pb-16 sm:border-x sm:pb-0">
        <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40"
            >
              <ArrowLeft className="h-5 w-5 text-charcoal" />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Bookmarks</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : !userId ? (
          <div className="px-6 py-16 text-center">
            <p className="text-muted">Sign in to see bookmarks.</p>
            <Link href="/login" className="mt-4 inline-block text-gold-deep hover:underline">
              Sign in
            </Link>
          </div>
        ) : posts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mb-3 text-4xl">🔖</div>
            <h2 className="text-xl font-bold text-charcoal">Save Enlightenments</h2>
            <p className="mt-2 text-muted">
              Tap the bookmark icon on a post to save it here.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onRepost={handleRepost}
              onBookmark={handleBookmark}
              currentUserId={userId}
            />
          ))
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
