"use client";
/* interaction-v2 */

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, ArrowLeft, Camera } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  getProfileByUsername,
  getPostsByUserId,
  getRepostedPosts,
  repostPost,
  unrepostPost,
  likePost,
  unlikePost,
  followUser,
  unfollowUser,
  isFollowing,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getFriendStatus,
  uploadAvatar,
  updateProfile,
  getOrCreateConversation,
  type FriendStatus,
} from "@/lib/posts";
import { getCurrentProfile, signOut } from "@/lib/auth";
import type { Profile, Post } from "@/types";
import PostCard from "@/components/PostCard";
import SpecialStars from "@/components/SpecialStars";
import { formatNumber } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = (params.username as string) || "";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendLoading, setFriendLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLinks, setEditLinks] = useState<string[]>(["", "", ""]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<"posts" | "reposts">("posts");
  const [reposts, setReposts] = useState<Post[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!username) return;
    loadProfile();
  }, [username]);

  async function loadProfile() {
    setLoading(true);
    const me = await getCurrentProfile();
    if (me) setCurrentUserId(me.id);

    const { data: p } = await getProfileByUsername(username);
    if (!p) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProfile(p);

    const { data: userPosts } = await getPostsByUserId(p.id, 50, me?.id);
    const { data: userReposts } = await getRepostedPosts(p.id);
    const originals = (userPosts || []).map((post: Post) => ({
      ...post,
      _isRepost: false as boolean,
      _sortAt: post.created_at,
    }));
    const shared = (userReposts || []).map((post: any) => ({
      ...post,
      _isRepost: true as boolean,
      _sortAt: post.created_at,
    }));
    // Merge: originals + reposts, newest first by original post time
    const merged = [...originals, ...shared].sort(
      (a, b) => new Date(b._sortAt).getTime() - new Date(a._sortAt).getTime()
    );
    // Dedupe by post id (prefer original if they also wrote it)
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const item of merged) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push(item);
    }
    setPosts(deduped as any);
    setReposts(userReposts as Post[]);

    if (me && me.id !== p.id) {
      const [fol, fr] = await Promise.all([
        isFollowing(me.id, p.id),
        getFriendStatus(me.id, p.id),
      ]);
      setFollowing(fol);
      setFriendStatus(fr);
    }

    setLoading(false);
  }

  async function handleFollow() {
    if (!currentUserId || !profile) {
      alert("Please sign in to follow");
      return;
    }
    if (currentUserId === profile.id) return;

    setFollowLoading(true);
    if (following) {
      await unfollowUser(currentUserId, profile.id);
      setFollowing(false);
      setProfile({
        ...profile,
        followers_count: Math.max(0, (profile.followers_count || 0) - 1),
      });
    } else {
      await followUser(currentUserId, profile.id);
      setFollowing(true);
      setProfile({
        ...profile,
        followers_count: (profile.followers_count || 0) + 1,
      });
    }
    setFollowLoading(false);
  }

  async function handleFriend() {
    if (!currentUserId || !profile) {
      alert("Please sign in to add friends");
      return;
    }
    if (currentUserId === profile.id) return;

    setFriendLoading(true);

    if (friendStatus === "none") {
      const { error } = await sendFriendRequest(currentUserId, profile.id);
      if (!error) setFriendStatus("pending_sent");
      else alert(error.message || "Could not send friend request");
    } else if (friendStatus === "pending_received") {
      const { error } = await acceptFriendRequest(profile.id, currentUserId);
      if (!error) setFriendStatus("friends");
      else alert(error.message || "Could not accept");
    } else if (friendStatus === "friends" || friendStatus === "pending_sent") {
      await removeFriendship(currentUserId, profile.id);
      setFriendStatus("none");
    }

    setFriendLoading(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId || !profile) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const { url, error } = await uploadAvatar(currentUserId, file);
    if (error) {
      alert(error.message || "Upload failed. Make sure the avatars storage bucket exists.");
    } else if (url) {
      setProfile({ ...profile, avatar_url: url });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }


  async function handleLike(id: string) {
    if (!currentUserId) {
      alert("Please sign in to like");
      return;
    }
    const post = posts.find((p: any) => p.id === id);
    if (!post) {
      alert("Post not found in list");
      return;
    }
    const was = !!post.liked_by_user;
    setPosts((prev: any) =>
      prev.map((p: any) =>
        p.id === id
          ? {
              ...p,
              liked_by_user: !was,
              likes_count: (p.likes_count || 0) + (was ? -1 : 1),
            }
          : p
      )
    );
    try {
      const res = was
        ? await unlikePost(id, currentUserId)
        : await likePost(id, currentUserId);
      if (res && (res as any).error) {
        alert("Like failed: " + ((res as any).error.message || "error"));
      }
    } catch (e: any) {
      alert("Like error: " + (e?.message || e));
    }
  }

  async function handleRepost(id: string) {
    if (!currentUserId) {
      alert("Please sign in to repost");
      return;
    }
    const post = posts.find((p: any) => p.id === id) as any;
    if (!post) {
      alert("Post not found in list");
      return;
    }
    const was = !!post.reposted_by_user;
    // Optimistic update
    setPosts((prev: any) => {
      if (was && currentUserId === profile?.id && post._isRepost) {
        // Undo repost on own profile: remove the repost entry from the list
        return prev.filter((p: any) => !(p.id === id && p._isRepost));
      }
      return prev.map((p: any) =>
        p.id === id
          ? {
              ...p,
              reposted_by_user: !was,
              reposts_count: (p.reposts_count || 0) + (was ? -1 : 1),
            }
          : p
      );
    });
    try {
      const { error } = was
        ? await unrepostPost(id, currentUserId)
        : await repostPost(id, currentUserId);
      if (error) {
        // reload to be safe
        alert("Unrepost failed: " + (error.message || JSON.stringify(error)));
        loadProfile();
      }
    } catch (e: any) {
      alert("Repost error: " + (e?.message || e));
      loadProfile();
    }
  }

  function friendButtonLabel() {
    switch (friendStatus) {
      case "friends":
        return "Friends";
      case "pending_sent":
        return "Request sent";
      case "pending_received":
        return "Accept friend";
      default:
        return "Add friends";
    }
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
  const isOwnProfile = currentUserId === profile.id;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 sm:border-x border-border pb-16 sm:pb-0">
        {/* Banner + Avatar — back on gold */}
        <div className="relative">
          <div className="h-40 bg-gradient-to-br from-[#E8D5A3] via-[#C9A86C] to-[#B8956A]" />
          <Link
            href="/"
            className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
            aria-label="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="absolute -bottom-6 left-4">
            <div className="relative">
              <img
                src={avatar}
                alt={profile.display_name}
                className="h-32 w-32 rounded-full border-4 border-pearl bg-champagne object-cover"
              />
              {isOwnProfile && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-pearl shadow-md transition hover:bg-charcoal-soft disabled:opacity-60"
                    title="Change photo"
                  >
                    {uploading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </>
              )}
            </div>
          </div>

          {/* Own profile actions under banner */}
          {isOwnProfile && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditName(profile.display_name);
                  setEditBio(profile.bio || "");
                  const existing = (profile as any).links || [];
                  setEditLinks([
                    existing[0] || "",
                    existing[1] || "",
                    existing[2] || "",
                  ]);
                  setEditOpen(true);
                }}
                className="rounded-full border border-border/80 bg-pearl/95 px-3 py-1 text-[12px] font-semibold text-charcoal shadow-sm backdrop-blur-sm transition hover:bg-champagne/60 sm:px-3.5 sm:py-1.5 sm:text-[13px]"
              >
                Edit profile
              </button>
            </div>
          )}
        </div>

        {/* Profile info */}
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-[17px] font-bold leading-tight tracking-tight text-charcoal sm:text-xl">
                  {profile.display_name}
                </h2>
                {profile.verified && (
                  <VerifiedBadge username={profile.username} gender={(profile as any).gender} size="md" />
                )}
              </div>
              <div className="mt-1 min-w-0 overflow-hidden">
                <SpecialStars username={profile.username} />
              </div>
              <div className="mt-0.5 truncate text-[14px] text-muted sm:text-[15px]">
                @{profile.username}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`rounded-full px-4 py-1.5 text-[14px] font-bold transition ${
                    following
                      ? "border border-border text-charcoal hover:bg-champagne/40"
                      : "bg-charcoal text-pearl hover:bg-charcoal-soft"
                  }`}
                >
                  {followLoading ? "..." : following ? "Following" : "Follow"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentUserId || !profile) {
                      alert("Please sign in");
                      return;
                    }
                    const { conversationId, error } = await getOrCreateConversation(
                      currentUserId,
                      profile.id
                    );
                    if (error || !conversationId) {
                      alert(error?.message || "Could not open messages");
                      return;
                    }
                    router.push(`/messages/${conversationId}`);
                  }}
                  className="rounded-full border border-border px-4 py-1.5 text-[14px] font-bold text-charcoal transition hover:bg-champagne/40"
                >
                  Message
                </button>
                <button
                  type="button"
                  onClick={handleFriend}
                  disabled={friendLoading}
                  className={`rounded-full px-4 py-1.5 text-[14px] font-bold transition ${
                    friendStatus === "friends"
                      ? "border border-[#C9A86C] text-[#C9A86C] hover:bg-champagne/40"
                      : friendStatus === "pending_received"
                      ? "bg-gold text-white hover:bg-gold-deep"
                      : friendStatus === "pending_sent"
                      ? "border border-border text-muted hover:bg-champagne/40"
                      : "border border-border text-charcoal hover:bg-champagne/40"
                  }`}
                >
                  {friendLoading ? "..." : friendButtonLabel()}
                </button>
              </div>
            )}
          </div>

          {profile.bio ? (
            <p className="mt-2.5 whitespace-pre-wrap text-[14px] leading-5 text-charcoal sm:text-[15px]">
              {profile.bio}
            </p>
          ) : null}

          {Array.isArray((profile as any).links) &&
            (profile as any).links.filter((l: string) => l && l.trim()).length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1">
                {(profile as any).links
                  .filter((l: string) => l && l.trim())
                  .slice(0, 3)
                  .map((link: string, i: number) => {
                    const href = link.startsWith("http") ? link : `https://${link}`;
                    const label = link.replace(/^https?:\/\//, "").replace(/\/$/, "");
                    return (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-[13px] font-medium text-gold-deep hover:underline sm:text-[14px]"
                      >
                        🔗 {label}
                      </a>
                    );
                  })}
              </div>
            )}

          <div className="mt-2.5 flex items-center gap-1 text-[13px] text-muted sm:text-[15px]">
            <Calendar className="h-4 w-4" />
            <span>
              Joined{" "}
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] sm:text-[15px]">
            <div>
              <span className="font-bold text-charcoal">
                {formatNumber(posts.filter((p: any) => !p._isRepost).length)}
              </span>{" "}
              <span className="text-muted">Enlightenments</span>
            </div>
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
          <button type="button" className="relative px-4 py-4 text-[15px] font-bold text-charcoal">
            Enlightenments
            <div className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-gold" />
          </button>
        </div>

        {/* Posts */}
        <div>
          {posts.length === 0 ? (
            <div className="px-6 py-16 text-center text-muted">No enlightenments yet.</div>
          ) : (
            posts.map((post: any) => (
              <div key={`${post.id}${post._isRepost ? "-rp" : ""}`}>
                {post._isRepost ? (
                  <div className="flex items-center gap-2 px-4 pt-3 text-[13px] font-medium text-muted">
                    <span>↺</span>
                    <span>Reposted</span>
                  </div>
                ) : null}
                <PostCard
                  post={post}
                  onLike={handleLike}
                  onRepost={handleRepost}
                  currentUserId={currentUserId}
                  onPostUpdated={(updated) =>
                    setPosts((prev) =>
                      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                    )
                  }
                  onPostDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
              </div>
            ))
          )}
        </div>
      </main>

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-charcoal">Edit profile</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal">Display name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-charcoal focus:border-gold-soft focus:outline-none"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  maxLength={160}
                  className="w-full resize-none rounded-xl border border-border bg-pearl px-3 py-2 text-charcoal focus:border-gold-soft focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal">
                  Website links (up to 3)
                </label>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      value={editLinks[i] || ""}
                      onChange={(e) => {
                        const next = [...editLinks];
                        next[i] = e.target.value;
                        setEditLinks(next);
                      }}
                      placeholder={i === 0 ? "Link 1 — https://..." : i === 1 ? "Link 2 — https://..." : "Link 3 — https://..."}
                      className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-[14px] text-charcoal focus:border-gold-soft focus:outline-none"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-full px-4 py-1.5 text-[14px] font-bold text-muted hover:bg-champagne/40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingProfile || !editName.trim()}
                onClick={async () => {
                  if (!currentUserId || !profile) return;
                  setSavingProfile(true);
                  const links = editLinks
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .slice(0, 3);
                  const { data, error } = await updateProfile(currentUserId, {
                    display_name: editName.trim(),
                    bio: editBio.trim(),
                    links,
                  });
                  setSavingProfile(false);
                  if (error) {
                    alert(error.message || "Could not save");
                    return;
                  }
                  if (data) setProfile(data);
                  setEditOpen(false);
                }}
                className="rounded-full bg-gold px-4 py-1.5 text-[14px] font-bold text-white hover:bg-gold-deep disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MobileBottomNav />
    </div>
  );
}
