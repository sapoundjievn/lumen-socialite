"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getPostById,
  getReplies,
  createReply,
  likePost,
  unlikePost,
} from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import type { Post } from "@/types";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function PostDetailPage() {
  const params = useParams();
  const postId = (params.id as string) || "";
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!postId) return;
    load();
  }, [postId]);

  async function load() {
    setLoading(true);
    const me = await getCurrentProfile();
    if (me) setCurrentUserId(me.id);

    const { data: p } = await getPostById(postId);
    setPost(p);
    const { data: r } = await getReplies(postId);
    setReplies(r);
    setLoading(false);
  }

  async function handleReply() {
    if (!currentUserId) {
      alert("Please sign in to reply");
      return;
    }
    if (!replyText.trim()) return;

    setSending(true);
    const { data, error } = await createReply(replyText.trim(), currentUserId, postId);
    setSending(false);
    if (error) {
      alert(error.message || "Could not reply");
      return;
    }
    if (data) {
      setReplies((prev) => [...prev, data]);
      setReplyText("");
      if (post) {
        setPost({ ...post, replies_count: (post.replies_count || 0) + 1 });
      }
    }
  }

  async function handleLike(id: string) {
    if (!currentUserId) return;
    // Simple toggle for detail view
    const target = id === post?.id ? post : replies.find((r) => r.id === id);
    if (!target) return;
    const wasLiked = target.liked_by_user;
    if (wasLiked) await unlikePost(id, currentUserId);
    else await likePost(id, currentUserId);

    const update = (p: Post) =>
      p.id === id
        ? {
            ...p,
            liked_by_user: !wasLiked,
            likes_count: (p.likes_count || 0) + (wasLiked ? -1 : 1),
          }
        : p;

    if (post?.id === id) setPost(update(post));
    setReplies((prev) => prev.map(update));
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 sm:border-x border-border pb-16 sm:pb-0">
        <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
          <div className="flex items-center gap-4 px-4 py-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40"
            >
              <ArrowLeft className="h-5 w-5 text-charcoal" />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Enlightenment</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : !post ? (
          <div className="px-6 py-16 text-center text-muted">Post not found.</div>
        ) : (
          <>
            <PostCard
              post={post}
              onLike={handleLike}
              onRepost={() => {}}
              currentUserId={currentUserId}
              onPostUpdated={(u) => setPost({ ...post, ...u })}
              onPostDeleted={() => (window.location.href = "/")}
            />

            {/* Reply composer */}
            <div className="border-b border-border px-4 py-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Post your reply..."
                rows={2}
                maxLength={280}
                className="w-full resize-none bg-transparent text-[15px] text-charcoal placeholder:text-muted focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  className="rounded-full bg-gold px-4 py-1.5 text-[14px] font-bold text-white hover:bg-gold-deep disabled:opacity-50"
                >
                  {sending ? "..." : "Reply"}
                </button>
              </div>
            </div>

            {/* Replies */}
            {replies.length === 0 ? (
              <div className="px-6 py-10 text-center text-muted text-[15px]">
                No replies yet. Be the first.
              </div>
            ) : (
              replies.map((r) => (
                <PostCard
                  key={r.id}
                  post={r}
                  onLike={handleLike}
                  onRepost={() => {}}
                  currentUserId={currentUserId}
                  onPostUpdated={(u) =>
                    setReplies((prev) => prev.map((p) => (p.id === u.id ? { ...p, ...u } : p)))
                  }
                  onPostDeleted={(id) => setReplies((prev) => prev.filter((p) => p.id !== id))}
                />
              ))
            )}
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
