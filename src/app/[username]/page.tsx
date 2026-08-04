"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Calendar, ArrowLeft, Camera } from "lucide-react";
import {
  getProfileByUsername,
  getPostsByUserId,
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
import { getCurrentProfile } from "@/lib/auth";
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
  const [savingProfile, setSavingProfile] = useState(false);
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

    const { data: userPosts } = await getPostsByUserId(p.id);
    setPosts(userPosts);

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
              <div className="mt-0.5">
                <SpecialStars username={profile.username} />
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
        </div>

        {/* Profile info */}
        <div className="px-4 pt-20 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <h2 className="text-xl font-extrabold text-charcoal">
                  {profile.display_name}
                </h2>
                {profile.verified && (
                  <BadgeCheck className="h-5 w-5 flex-shrink-0 fill-gold text-white" />
                )}
              </div>
              <div className="mt-1">
                <SpecialStars username={profile.username} />
              </div>
              <div className="mt-0.5 text-[15px] text-muted">@{profile.username}</div>
            </div>

            {isOwnProfile && (
              <button
                onClick={() => {
                  setEditName(profile.display_name);
                  setEditBio(profile.bio || "");
                  setEditOpen(true);
                }}
                className="rounded-full border border-border px-4 py-1.5 text-[14px] font-bold text-charcoal transition hover:bg-champagne/40"
              >
                Edit profile
              </button>
            )}

            {!isOwnProfile && (
              <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
                <button
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
          <button className="relative px-4 py-4 text-[15px] font-bold text-charcoal">
            Enlightenments
            <div className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-gold" />
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


      {/* Edit profile modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-charcoal">Edit profile</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Display name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-charcoal focus:border-gold-soft focus:outline-none"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  maxLength={160}
                  className="w-full resize-none rounded-xl border border-border bg-pearl px-3 py-2 text-charcoal focus:border-gold-soft focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-full px-4 py-1.5 text-[14px] font-bold text-muted hover:bg-champagne/40"
              >
                Cancel
              </button>
              <button
                disabled={savingProfile || !editName.trim()}
                onClick={async () => {
                  if (!currentUserId || !profile) return;
                  setSavingProfile(true);
                  const { data, error } = await updateProfile(currentUserId, {
                    display_name: editName.trim(),
                    bio: editBio.trim(),
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
      )}

      <MobileBottomNav />
    </div>
  );
}
