"use client";

import { useState } from "react";
import {
  MessageCircle,
  Repeat2,
  Heart,
  BarChart2,
  Share,
  MoreHorizontal,
  BadgeCheck,
} from "lucide-react";
import { Post } from "@/types";
import { cn, formatNumber, formatTime } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onRepost: (id: string) => void;
}

export default function PostCard({ post, onLike, onRepost }: PostCardProps) {
  const profile = post.profiles;
  const [liked, setLiked] = useState(post.liked_by_user || false);
  const [reposted, setReposted] = useState(false);
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [reposts, setReposts] = useState(post.reposts_count || 0);

  const displayName = profile?.display_name || "User";
  const username = profile?.username || "user";
  const avatar =
    profile?.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${post.user_id}`;
  const verified = profile?.verified || false;

  const handleLike = () => {
    setLiked(!liked);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
    onLike(post.id);
  };

  const handleRepost = () => {
    setReposted(!reposted);
    setReposts((prev) => (reposted ? prev - 1 : prev + 1));
    onRepost(post.id);
  };

  return (
    <article className="group border-b border-border px-4 py-3 transition hover:bg-champagne/20">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={avatar}
            alt={displayName}
            className="h-10 w-10 rounded-full border border-border bg-champagne object-cover"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-[15px]">
              <span className="truncate font-bold text-charcoal hover:underline">
                {displayName}
              </span>
              {verified && (
                <BadgeCheck className="h-4 w-4 flex-shrink-0 fill-gold text-white" />
              )}
              <span className="truncate text-muted">@{username}</span>
              <span className="text-muted">·</span>
              <span className="text-muted hover:underline">
                {formatTime(post.created_at)}
              </span>
            </div>
            <button className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition group-hover:opacity-100 hover:bg-champagne/50 hover:text-gold-deep">
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-0.5 whitespace-pre-wrap text-[15px] leading-5 text-charcoal">
            {post.content}
          </div>

          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              <img
                src={post.media_urls[0]}
                alt="Illumination"
                className="w-full object-cover max-h-96"
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex max-w-md justify-between text-muted">
            <button className="group/btn flex items-center gap-1.5 transition hover:text-sky-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-full transition group-hover/btn:bg-sky-500/10">
                <MessageCircle className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[13px]">
                {formatNumber(post.replies_count || 0)}
              </span>
            </button>

            <button
              onClick={handleRepost}
              className={cn(
                "group/btn flex items-center gap-1.5 transition",
                reposted ? "text-green-600" : "hover:text-green-600"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition",
                  reposted
                    ? "bg-green-600/10"
                    : "group-hover/btn:bg-green-600/10"
                )}
              >
                <Repeat2 className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[13px]">{formatNumber(reposts)}</span>
            </button>

            <button
              onClick={handleLike}
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
                <Heart
                  className={cn("h-[18px] w-[18px]", liked && "fill-current")}
                />
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