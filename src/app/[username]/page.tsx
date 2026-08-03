"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Calendar, ArrowLeft } from "lucide-react";
import { getProfileByUsername, getPostsByUserId } from "@/lib/posts";
import type { Profile, Post } from "@/types";
import PostCard from "@/components/PostCard";
import { formatNumber } from "@/lib/utils";

export default function ProfilePage() {
  const params = useParams();
  const username = (params.username as string) || "";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    loadProfile();
  }, [username]);

  async function loadProfile() {
    setLoading(true);
    const { data: p } = await getProfileByUsername(username);
    if (!p) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProfile(p);
    const { data: userPosts } = await getPostsByUserId(p.id);
    setPosts(userPosts);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold text-charcoal">This account doesn’t exist</h1>
        <Link href="/" className="text-gold-deep hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const avatar =
    profile.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.id}`;

  return (
    <main className="min-h-screen w-full border-x-0 sm:border-x border-border">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
        <div className="flex items-center gap-6 px-4 py-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40"
          >
            <ArrowLeft className="h-5 w-5 text-charcoal" />
          </Link>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-bold text-charcoal">{profile.display_name}</h1>
              {profile.verified && (
                <BadgeCheck className="h-5 w-5 flex-shrink-0 fill-gold text-white" />
              )}
            </div>
            <div className="text-[13px] text-muted">
              {formatNumber(posts.length)} Enlightenments
            </div>
          </div>
        </div>
      </div>

      {/* Banner + Avatar */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-[#E8D5A3] via-[#C9A86C] to-[#B8956A]" />
        <div className="absolute -bottom-16 left-4">
          <img
            src={avatar}
            alt={profile.display_name}
            className="h-32 w-32 rounded-full border-4 border-pearl bg-champagne object-cover"
          />
        </div>
      </div>

      {/* Profile info */}
      <div className="px-4 pt-20 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-xl font-extrabold text-charcoal">
                {profile.display_name}
              </h2>
              {profile.verified && (
                <BadgeCheck className="h-5 w-5 flex-shrink-0 fill-gold text-white" />
              )}
            </div>
            <div className="text-[15px] text-muted">@{profile.username}</div>
          </div>
          <button className="rounded-full border border-border px-4 py-1.5 text-[15px] font-bold text-charcoal transition hover:bg-champagne/40">
            Follow
          </button>
        </div>

        {profile.bio && (
          <p className="mt-3 text-[15px] leading-5 text-charcoal whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        <div className="mt-3 flex items-center gap-1 text-[15px] text-muted">
          <Calendar className="h-4 w-4" />
          <span>
            Joined{" "}
            {new Date(profile.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        <div className="mt-3 flex gap-4 text-[15px]">
          <div>
            <span className="font-bold text-charcoal">
              {formatNumber(profile.following_count || 0)}
            </span>{" "}
            <span className="text-muted">Following</span>
          </div>
          <div>
            <span className="font-bold text-charcoal">
              {formatNumber(profile.followers_count || 0)}
            </span>{" "}
            <span className="text-muted">Followers</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <button className="relative flex-1 px-4 py-4 text-[15px] font-bold text-charcoal">
          Enlightenments
          <div className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-gold" />
        </button>
      </div>

      {/* Posts */}
      <div>
        {posts.length === 0 ? (
          <div className="px-6 py-16 text-center text-muted">
            No enlightenments yet.
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => {}}
              onRepost={() => {}}
            />
          ))
        )}
      </div>
    </main>
  );
}
