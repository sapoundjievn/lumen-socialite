"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Repeat2,
  Heart,
  BarChart2,
  Share,
  MoreHorizontal,
  BadgeCheck,
  Pencil,
  Trash2,
} from "lucide-react";
import { Post } from "@/types";
import { cn, formatNumber, formatTime } from "@/lib/utils";
import SpecialStars from "./SpecialStars";
import { canEditPost, editPost, deletePost } from "@/lib/posts";


function renderContentWithMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_.]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      const username = part.slice(1);
      return (
        <Link
          key={i}
          href={`/${username}`}
          className="font-medium text-gold-deep hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onRepost: (id: string) => void;
  currentUserId?: string | null;
  onPostUpdated?: (post: Post) => void;
  onPostDeleted?: (id: string) => void;
}

export default function PostCard({
  post,
  onLike,
  onRepost,
  currentUserId,
  onPostUpdated,
  onPostDeleted,
}: PostCardProps) {
  const router = useRouter();
  const profile = post.profiles;
  const liked = post.liked_by_user || false;
  const likes = post.likes_count || 0;

  const displayName = profile?.display_name || "User";
  const username = profile?.username || "user";
  const profileHref = `/${username}`;
  const avatar =
    profile?.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${post.user_id}`;
  const verified = profile?.verified || false;
  const isOwner = !!currentUserId && currentUserId === post.user_id;
  const editable = isOwner && canEditPost(post.created_at, username);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [saving, setSaving] = useState(false);

  async function handleSaveEdit() {
    if (!currentUserId || !editText.trim()) return;
    setSaving(true);
    const { data, error } = await editPost(post.id, editText.trim(), currentUserId);
    setSaving(false);
    if (error) {
      alert(error.message || "Could not edit post");
      return;
    }
    if (data) {
      onPostUpdated?.(data);
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!currentUserId) return;
    if (!confirm("Delete this Enlightenment?")) return;
    setMenuOpen(false);
    const { error } = await deletePost(post.id, currentUserId);
    if (error) {
      alert(error.message || "Could not delete");
      return;
    }
    onPostDeleted?.(post.id);
  }

  return (
    <article className="group border-b border-border px-4 py-3 transition hover:bg-champagne/20">
      <div className="flex gap-3">
        <Link href={profileHref} className="flex-shrink-0">
          <img
            src={avatar}
            alt={displayName}
            className="h-10 w-10 rounded-full border border-border bg-champagne object-cover transition hover:opacity-90"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0 text-[15px]">
              <div className="flex flex-wrap items-center gap-x-1">
                <Link
                  href={profileHref}
                  className="truncate font-bold text-charcoal hover:underline"
                >
                  {displayName}
                </Link>
                {verified && (
                  <BadgeCheck className="h-4 w-4 flex-shrink-0 fill-gold text-white" />
                )}
                <Link href={profileHref} className="truncate text-muted hover:underline">
                  @{username}
                </Link>
                <span className="text-muted">·</span>
                <span className="text-muted">{formatTime(post.created_at)}</span>
              </div>
              <div className="mt-0.5">
                <SpecialStars username={username} />
              </div>
            </div>

            {isOwner && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-champagne/50 hover:text-gold-deep"
                >
                  <MoreHorizontal className="h-[18px] w-[18px]" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                    {editable && (
                      <button
                        onClick={() => {
                          setEditText(post.content);
                          setEditing(true);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] text-charcoal hover:bg-champagne/30"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                maxLength={280}
                className="w-full resize-none rounded-xl border border-border bg-pearl p-3 text-[15px] text-charcoal focus:border-gold-soft focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-full px-4 py-1.5 text-[14px] font-bold text-muted hover:bg-champagne/40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editText.trim()}
                  className="rounded-full bg-gold px-4 py-1.5 text-[14px] font-bold text-white hover:bg-gold-deep disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-0.5 whitespace-pre-wrap text-[15px] leading-5 text-charcoal">
              {renderContentWithMentions(post.content)}
            </div>
          )}

          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              <img
                src={post.media_urls[0]}
                alt="Illumination"
                className="w-full object-cover max-h-96"
              />
            </div>
          )}

          <div className="mt-3 flex max-w-md justify-between text-muted">
            <button
              onClick={() => router.push(`/post/${post.id}`)}
              className="group/btn flex items-center gap-1.5 transition hover:text-sky-500"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full transition group-hover/btn:bg-sky-500/10">
                <MessageCircle className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[13px]">
                {formatNumber(post.replies_count || 0)}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRepost(post.id);
              }}
              className={cn(
                "group/btn flex items-center gap-1.5 transition",
                post.reposted_by_user ? "text-green-600" : "hover:text-green-600"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition",
                  post.reposted_by_user
                    ? "bg-green-600/10"
                    : "group-hover/btn:bg-green-600/10"
                )}
              >
                <Repeat2 className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[13px]">
                {formatNumber(post.reposts_count || 0)}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLike(post.id);
              }}
              className={cn(
                "group/btn flex items-center gap-1.5 transition",
                liked ? "text-rose-500" : "hover:text-rose-500"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition",
                  liked ? "bg-rose-500/10" : "group-hover/btn:bg-rose-500/10"
                )}
              >
                <Heart className={cn("h-[18px] w-[18px]", liked && "fill-current")} />
              </div>
              <span className="text-[13px]">{formatNumber(likes)}</span>
            </button>

            <button className="group/btn flex items-center gap-1.5 transition hover:text-gold-deep">
              <div className="flex h-8 w-8 items-center justify-center rounded-full transition group-hover/btn:bg-gold/10">
                <BarChart2 className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[13px]">
                {formatNumber(post.views_count || 0)}
              </span>
            </button>

            <button className="group/btn flex items-center gap-1.5 transition hover:text-gold-deep">
              <div className="flex h-8 w-8 items-center justify-center rounded-full transition group-hover/btn:bg-gold/10">
                <Share className="h-[18px] w-[18px]" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
