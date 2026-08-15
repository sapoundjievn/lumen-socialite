"use client";
/* interaction-v2 */

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, ArrowLeft, Camera, Flag, Ban , Share } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isForcedVerifiedUsername } from "@/lib/utils";
import {
  getProfileByUsername,
  getPostsByUserId,
  getRepostedPosts,
  repostPost,
  reverseFounderRepost,
  unrepostPost,
  likePost,
  reverseFounderLike,
  syncFounderLikeJobs,
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
  getFollowersList,
  getFollowingList,
  getFriendsList,
  getPublicFollowingCount,
  getOrCreateConversation,
  createPost,
  type FriendStatus,
} from "@/lib/posts";
import { getCurrentProfile, signOut, updateUserEmail, updateUserPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Profile, Post } from "@/types";
import PostCard from "@/components/PostCard";
import Composer from "@/components/Composer";
import { blockUser, reportContent } from "@/lib/safety";
import SpecialStars from "@/components/SpecialStars";
import { formatNumber } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import MusicianTunes from "@/components/MusicianTunes";
import BannerPicker from "@/components/BannerPicker";

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
  const [listModal, setListModal] = useState<null | "followers" | "following" | "friends">(null);
  const [listUsers, setListUsers] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [displayFollowing, setDisplayFollowing] = useState(0);
  const [editName, setEditName] = useState("");
  const [editBusinessAddress, setEditBusinessAddress] = useState("");
  const [editBusinessType, setEditBusinessType] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLinks, setEditLinks] = useState<string[]>(["", "", ""]);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPassword2, setEditPassword2] = useState("");
  const [accountMsg, setAccountMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<"posts" | "compose" | "reposts">("posts");
  const [reposts, setReposts] = useState<Post[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);

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
        if (p) {
          getPublicFollowingCount(p.id, p.following_count || 0).then((n) =>
            setDisplayFollowing(n)
          );
        }

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
    // Business accounts: never allow profile photo — banner/storefront only
    if (((profile as any)?.account_type || "personal") === "business") {
      e.target.value = "";
      alert("Business accounts use a storefront banner only — no profile photo.");
      return;
    }
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

    const me = await getCurrentProfile();
    const isFounder = me?.username?.toLowerCase() === "thevip";

    if (isFounder) {
      // @thevip: each click +550,340 likes & views (stacks every click)
      const BOOST = 550_340;
      setPosts((prev: any) =>
        prev.map((p: any) =>
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
      const res: any = await likePost(id, currentUserId, "thevip");
      if (res?.error) {
        alert(res.error.message || "Could not apply likes");
        return;
      }
      if (res?.likes_count != null) {
        setPosts((prev: any) =>
          prev.map((p: any) =>
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
    const me = await getCurrentProfile();
    const isFounder = me?.username?.toLowerCase() === "thevip";
    if (isFounder) {
      const BOOST = 154;
      setPosts((prev: any) =>
        prev.map((p: any) =>
          p.id === id
            ? {
                ...p,
                reposted_by_user: true,
                reposts_count: (p.reposts_count || 0) + BOOST,
              }
            : p
        )
      );
      const res: any = await repostPost(id, currentUserId, "thevip");
      if (res?.error) alert(res.error.message || "Repost failed");
      else if (res?.reposts_count != null) {
        setPosts((prev: any) =>
          prev.map((p: any) =>
            p.id === id
              ? { ...p, reposted_by_user: true, reposts_count: res.reposts_count }
              : p
          )
        );
      }
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


  async function handleReverseLike(id: string) {
    const me = await getCurrentProfile();
    if (me?.username?.toLowerCase() !== "thevip") return;
    const BOOST = 550_340;
    setPosts((prev: any) =>
      prev.map((p: any) =>
        p.id === id
          ? {
              ...p,
              likes_count: Math.max(0, (p.likes_count || 0) - BOOST),
              views_count: Math.max(0, (p.views_count || 0) - BOOST),
            }
          : p
      )
    );
    const res: any = await reverseFounderLike(id, "thevip");
    if (res?.error) alert(res.error.message);
    else if (res?.likes_count != null) {
      setPosts((prev: any) =>
        prev.map((p: any) =>
          p.id === id
            ? { ...p, likes_count: res.likes_count, views_count: res.views_count }
            : p
        )
      );
    }
  }

  async function handleReverseRepost(id: string) {
    const me = await getCurrentProfile();
    if (me?.username?.toLowerCase() !== "thevip" || !me?.id) return;
    const BOOST = 154;
    setPosts((prev: any) =>
      prev.map((p: any) =>
        p.id === id
          ? {
              ...p,
              reposts_count: Math.max(0, (p.reposts_count || 0) - BOOST),
            }
          : p
      )
    );
    const res: any = await reverseFounderRepost(id, "thevip", me.id);
    if (res?.error) alert(res.error.message);
    else if (res?.reposts_count != null) {
      setPosts((prev: any) => {
        const nextCount = res.reposts_count as number;
        if (nextCount === 0) {
          // Remove repost card from own profile list
          return prev
            .filter((p: any) => !(p.id === id && p._isRepost))
            .map((p: any) =>
              p.id === id
                ? { ...p, reposts_count: 0, reposted_by_user: false }
                : p
            );
        }
        return prev.map((p: any) =>
          p.id === id
            ? {
                ...p,
                reposts_count: nextCount,
                reposted_by_user: nextCount > 0,
              }
            : p
        );
      });
    }
  }


  async function shareProfile() {
    if (!profile?.username) return;
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://lumen-socialite.vercel.app";
    const user = String(profile.username).replace(/^@/, "");
    // /s/username = lightweight page Messenger can open (works without heavy app JS)
    const cleanUrl = origin.replace(/\/$/, "") + "/s/" + user;
    const title = profile.display_name || profile.username;
    const shareText =
      title + " (@" + user + ") on Lumen · Socialite\n" + cleanUrl;
    try {
      if (typeof navigator !== "undefined" && typeof (navigator as any).share === "function") {
        await (navigator as any).share({
          title,
          text: shareText,
          url: cleanUrl,
        });
        return;
      }
    } catch {
      /* cancelled — copy instead */
    }
    try {
      await navigator.clipboard.writeText(cleanUrl);
      alert("Profile link copied. Paste in Messenger:\n" + cleanUrl);
    } catch {
      prompt("Copy this profile link for Messenger:", cleanUrl);
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



  async function applyPresetBanner(url: string) {
    if (!currentUserId || !profile) return;
    setUploading(true);
    try {
      const { error } = await updateProfile(currentUserId, { banner_url: url } as any);
      if (error) {
        alert(error.message || "Could not save banner");
        return;
      }
      setProfile({ ...profile, banner_url: url } as any);
    } finally {
      setUploading(false);
    }
  }

  async function handleBannerFile(file: File) {
    if (!currentUserId || !profile) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${currentUserId}/banner-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("banners")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (upErr) {
        alert("Banner upload failed: " + upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error } = await updateProfile(currentUserId, { banner_url: url } as any);
      if (error) {
        alert(error.message || "Could not save banner");
        return;
      }
      setProfile({ ...profile, banner_url: url } as any);
    } finally {
      setUploading(false);
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId || !profile) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${currentUserId}/banner-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("banners")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (upErr) {
        alert("Banner upload failed: " + upErr.message + " — create a public Storage bucket named banners");
        return;
      }
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error } = await updateProfile(currentUserId, { banner_url: url } as any);
      if (error) {
        alert(error.message || "Could not save banner");
        return;
      }
      setProfile({ ...profile, banner_url: url } as any);
    } finally {
      setUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  async function handleComposePost(content: string, mediaUrls: string[] = []) {
    if (!currentUserId) {
      alert("Please sign in");
      return;
    }
    const { data, error } = await createPost(content, currentUserId, mediaUrls);
    if (error) {
      alert(error.message || "Could not post");
      return;
    }
    if (data) {
      setPosts((prev) => [data as any, ...prev]);
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
  const accountType = ((profile as any).account_type || "personal") as string;
  const isBusiness = accountType === "business";
  const unameLower = (profile?.username || "").toLowerCase();
  // Music layout ONLY for musician accounts — NEVER founders @thevip / @kendall.vip
  // All account_type=musician get the same layout as @mikeavramov (screenshot reference)
  const isMusician =
    !["thevip", "kendall.vip", "kennicktechnologies"].includes(unameLower) &&
    (accountType === "musician" ||
      [
        "mikeavramov",
        "mikeavramove",
        "mr.samsnuggles",
        "mrsamsnuggles",
        "samsnuggles1",
        "samsnuggles",
        "sam.snuggles",
        "samsnuggles",
      ].includes(unameLower));
  // Privileged: @thevip 100% owner, @kendall.vip co-founder, @kennicktechnologies company
  const isSamSnuggles = [
    "mr.samsnuggles",
    "mrsamsnuggles",
    "samsnuggles1",
    "samsnuggles",
    "sam.snuggles",
  ].includes(unameLower);
  const isFounderAvatar =
    unameLower === "thevip" || unameLower === "kendall.vip";
  const isProtectedFounder = [
    "thevip",
    "kendall.vip",
    "kennicktechnologies",
    "kennick",
    "kennicktechnologiesllc",
  ].includes((profile?.username || "").toLowerCase());

  async function openPeopleList(kind: "followers" | "following" | "friends") {
    if (!profile) return;
    if (kind === "friends" && !isOwnProfile) {
      alert("Friends are private — only the account owner can see them.");
      return;
    }
    setListModal(kind);
    setListLoading(true);
    setListUsers([]);
    try {
      const fn =
        kind === "followers"
          ? getFollowersList
          : kind === "following"
          ? getFollowingList
          : getFriendsList;
      const { data } = await fn(profile.id);
      setListUsers(data || []);
    } finally {
      setListLoading(false);
    }
  }


  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 sm:border-x border-border pb-28 sm:pb-0">
        {/* Banner + Avatar — back on gold */}
        <div className="relative">
          {(profile as any).banner_url ? (
            <div className={`relative w-full overflow-hidden ${
              isBusiness ? "h-40 sm:h-48" : isMusician ? "h-32 sm:h-36" : "h-36 sm:h-44"
            }`}>
              <img
                src={(profile as any).banner_url}
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
            </div>
          ) : (
            <div className={`${
              isBusiness ? "h-40 sm:h-48" : isMusician ? "h-32 sm:h-36" : "h-28"
            } bg-gradient-to-br from-[#E8D5A3] via-[#C9A86C] to-[#B8956A]`} />
          )}
          <Link
            href="/"
            className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
            aria-label="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {/* Personal only: avatar bottom-left. Business: never show profile photo. Musician: centered on banner */}
          {!isMusician && !isBusiness && (
            /* Personal accounts: 17mm diameter, bottom of image flush with bottom of banner */
            <div
              className="absolute left-4 z-[5]"
              style={{ bottom: 0, width: "17mm", height: "17mm" }}
            >
              <div className="relative" style={{ width: "17mm", height: "17mm" }}>
                <img
                  src={avatar}
                  alt={profile.display_name}
                  className="rounded-full border-[2px] border-pearl bg-champagne object-cover shadow-sm"
                  style={{ width: "17mm", height: "17mm", minWidth: "17mm", minHeight: "17mm" }}
                />
                {isOwnProfile && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-charcoal text-pearl shadow-md transition hover:bg-charcoal-soft disabled:opacity-60"
                      style={{ width: "5mm", height: "5mm" }}
                      title="Change photo"
                    >
                      {uploading ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Camera style={{ width: "3mm", height: "3mm" }} />
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
          )}

          {isMusician && (
            <>
              {/* Sam: true center of banner. Other musicians: bottom-center overlap */}
              <div
                className={
                  isSamSnuggles
                    ? "absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2"
                    : "absolute bottom-0 left-1/2 z-[5] -translate-x-1/2 translate-y-1/2"
                }
              >
                <div className="relative">
                  <img
                    src={avatar}
                    alt={profile.display_name}
                    className="h-[4.5rem] w-[4.5rem] rounded-full border-[3px] border-pearl bg-champagne object-cover shadow-md sm:h-20 sm:w-20"
                  />
                  {isOwnProfile && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal text-pearl shadow-md transition hover:bg-charcoal-soft disabled:opacity-60"
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
            </>
          )}

          {/* Own profile: Banner left, Edit + Share right */}
          {isOwnProfile && (
            <>
              <div className="absolute bottom-3 left-3 z-30">
                <button
                  type="button"
                  onClick={() => setBannerPickerOpen(true)}
                  disabled={uploading}
                  className="rounded-full border border-border bg-pearl px-3.5 py-1.5 text-[12px] font-bold text-charcoal shadow-md transition hover:bg-champagne sm:px-4 sm:py-2 sm:text-[13px]"
                  title={isBusiness ? "Upload storefront photo" : "Upload banner"}
                >
                  {uploading ? "Uploading…" : isBusiness ? "Storefront banner" : "Banner"}
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerChange}
                />
              </div>
              <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setEditName(profile.display_name);
                    setEditBio(profile.bio || "");
                    setEditBusinessAddress((profile as any).business_address || "");
                    setEditBusinessType((profile as any).business_type || "");
                    const existing = (profile as any).links || [];
                    setEditLinks([
                      existing[0] || "",
                      existing[1] || "",
                      existing[2] || "",
                    ]);
                    setEditPassword("");
                    setEditPassword2("");
                    setAccountMsg("");
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      setEditEmail(user?.email || "");
                    } catch {
                      setEditEmail("");
                    }
                    setEditOpen(true);
                  }}
                  className="rounded-full border border-border/80 bg-pearl/95 px-3 py-1 text-[12px] font-semibold text-charcoal shadow-sm backdrop-blur-sm transition hover:bg-champagne/60 sm:px-3.5 sm:py-1.5 sm:text-[13px]"
                >
                  Edit profile
                </button>
                <button
                  type="button"
                  onClick={shareProfile}
                  className="rounded-full border border-border/80 bg-pearl/95 px-3 py-1 text-[12px] font-semibold text-charcoal shadow-sm backdrop-blur-sm transition hover:bg-champagne/60 sm:px-3.5 sm:py-1.5 sm:text-[13px]"
                >
                  Share
                </button>
              </div>
            </>
          )}
        </div>

        {isBusiness && isOwnProfile && !(profile as any).banner_url && (
          <div className="border-b border-border bg-champagne/30 px-4 py-2 text-center text-[12px] text-charcoal">
            Upload a <span className="font-semibold">storefront photo</span> — how your restaurant, shop, or office looks from outside — using <span className="font-semibold">Storefront photo</span>.
          </div>
        )}

        {/* Profile info — business has no avatar overhang, less top padding */}
        <div className={`px-4 pb-3 ${isMusician ? (isSamSnuggles ? "pt-3 sm:pt-4" : "pt-12 sm:pt-14") : isBusiness ? "pt-[calc(0.75rem-2mm)]" : "pt-3"}`}>
          <div className={`flex gap-2 ${isMusician ? "flex-col items-center text-center" : "items-start justify-between"}`}>
            {!isMusician && (
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2
                  className={`min-w-0 font-bold leading-tight tracking-tight text-charcoal ${
                    isBusiness
                      ? "text-[14px] sm:text-[15px] whitespace-normal break-words"
                      : (profile.display_name || "").length > 22
                        ? "truncate text-[13px] sm:text-[15px]"
                        : (profile.display_name || "").length > 16
                          ? "truncate text-[15px] sm:text-[17px]"
                          : "truncate text-[17px] sm:text-xl"
                  }`}
                >
                  {profile.display_name}
                </h2>
                {(profile.verified || isForcedVerifiedUsername(profile.username)) && (
                  <VerifiedBadge username={profile.username} gender={(profile as any).gender} size="md" />
                )}
              </div>
              <div className="mt-0.5 min-w-0">
                <SpecialStars username={profile.username} />
              </div>
              <div className="mt-0 truncate text-[14px] text-muted sm:text-[15px]">
                @{profile.username}
              </div>
              {(profile.username || "").toLowerCase() === "kennicktechnologies" && (
                <p
                  className="mt-0.5 w-full whitespace-nowrap text-[9px] font-semibold leading-tight text-charcoal sm:text-[10px]"
                  style={{ fontFamily: "Times New Roman, Times, serif", letterSpacing: "-0.01em" }}
                >
                  KenNick Technologies LLC · Property of @thevip & @kendall.vip · Owner @thevip
                </p>
              )}
              {isBusiness && (
                <div className="mt-2 space-y-0.5 text-[13px] text-charcoal/80">
                  {(profile as any).business_type ? (
                    <p className="font-medium text-gold-deep">
                      {(profile as any).business_type}
                    </p>
                  ) : null}
                  {(profile as any).business_address ? (
                    <p className="leading-snug">{(profile as any).business_address}</p>
                  ) : isOwnProfile ? (
                    <p className="text-muted">Add storefront photo + address in Edit profile</p>
                  ) : null}
                </div>
              )}
            </div>
            )}
            {isMusician && (
              <div className="mb-2 flex w-full flex-col items-center text-center">
                <div className="flex max-w-full items-center justify-center gap-1.5">
                  <h2
                    className={`truncate font-bold leading-tight text-charcoal ${
                      (profile.display_name || "").length > 22
                        ? "text-[13px] sm:text-[15px]"
                        : (profile.display_name || "").length > 16
                          ? "text-[15px] sm:text-[17px]"
                          : "text-[17px] sm:text-xl"
                    }`}
                  >
                    {profile.display_name}
                  </h2>
                  {(profile.verified || isForcedVerifiedUsername(profile.username)) && (
                    <VerifiedBadge
                      username={profile.username}
                      gender={(profile as any).gender}
                      size="md"
                    />
                  )}
                </div>
                <div className="mt-0.5 text-[15px] font-medium text-muted">
                  @{profile.username}
                </div>
              </div>
            )}

            {!isOwnProfile && (
              <div className={`flex flex-shrink-0 gap-2 ${isMusician ? "flex-row justify-center" : "flex-col sm:flex-row"}`}>
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${
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
                  className="rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-charcoal transition hover:bg-champagne/40"
                >
                  Message
                </button>
                <button
                  type="button"
                  onClick={shareProfile}
                  className="rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-charcoal transition hover:bg-champagne/40"
                >
                  Share
                </button>
                {/* No Block/Report on privileged @thevip @kendall.vip @kennicktechnologies */}
                {!isProtectedFounder && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Report"
                      onClick={async () => {
                        if (!currentUserId || !profile) {
                          alert("Please sign in");
                          return;
                        }
                        const reason = window.prompt("Report reason:", "other");
                        if (!reason) return;
                        const { error } = await reportContent({
                          reporterId: currentUserId,
                          reason,
                          reportedUserId: profile.id,
                        });
                        if (error) alert(error.message);
                        else alert("Report submitted.");
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition hover:bg-champagne/40 hover:text-charcoal"
                    >
                      <Flag className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Block"
                      onClick={async () => {
                        if (!currentUserId || !profile) {
                          alert("Please sign in");
                          return;
                        }
                        if (!confirm(`Block @${profile.username}?`)) return;
                        const { error } = await blockUser(currentUserId, profile.id);
                        if (error) alert(error.message);
                        else {
                          alert("Blocked. Their posts will be hidden from your feed.");
                          router.push("/");
                        }
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200/80 text-rose-500 transition hover:bg-rose-50"
                    >
                      <Ban className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleFriend}
                  disabled={friendLoading}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${
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
            <button type="button" onClick={() => openPeopleList("following")} className="hover:underline">
              <span className="font-bold text-charcoal">
                {formatNumber(displayFollowing || 0)}
              </span>{" "}
              <span className="text-muted">Following</span>
            </button>
            <button type="button" onClick={() => openPeopleList("followers")} className="hover:underline">
              <span className="font-bold text-charcoal">
                {formatNumber(profile.followers_count || 0)}
              </span>{" "}
              <span className="text-muted">Followers</span>
            </button>
            {isOwnProfile && (
              <button type="button" onClick={() => openPeopleList("friends")} className="hover:underline">
                <span className="font-bold text-charcoal">Friends</span>
                <span className="text-muted"> (only you)</span>
              </button>
            )}
          </div>
        </div>


        {isMusician && (
          <div className="mt-0" style={{ marginTop: "1mm" }}>
            <MusicianTunes
              profileId={profile.id}
              isOwner={!!isOwnProfile}
              verified={!!profile.verified}
              username={profile.username}
            />
            {(((profile as any).account_type === "musician" && profile.verified) ||
            ["mikeavramov","mikeavramove","mr.samsnuggles","mrsamsnuggles","samsnuggles","samsnuggles1"].includes(
              (profile.username || "").toLowerCase()
            )) ? (
              <p className="mt-2 text-center text-[12px]">
                <Link
                  href={`/music?artist=${encodeURIComponent(profile.username)}`}
                  className="font-semibold text-gold-deep hover:underline"
                >
                  LumenTunes Store — full tracks · pay & download
                </Link>
              </p>
            ) : isOwnProfile ? (
              <p className="mt-2 text-center text-[12px] text-muted">
                Music description slots 1–7 only.{" "}
                <Link href="/verify" className="font-semibold text-gold-deep hover:underline">
                  Verify to open LumenTunes Store
                </Link>
              </p>
            ) : null}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setProfileTab("posts")}
            className={`relative flex-1 px-4 py-3.5 text-[14px] font-bold sm:text-[15px] ${
              profileTab === "posts" ? "text-charcoal" : "text-muted hover:bg-champagne/20"
            }`}
          >
            Enlightenments
            {profileTab === "posts" && (
              <div className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-gold" />
            )}
          </button>
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setProfileTab("compose")}
              className={`relative flex-1 px-4 py-3.5 text-[14px] font-bold sm:text-[15px] ${
                profileTab === "compose" ? "text-charcoal" : "text-muted hover:bg-champagne/20"
              }`}
            >
              Let me enlighten you
              {profileTab === "compose" && (
                <div className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-gold" />
              )}
            </button>
          )}
        </div>

        {/* Compose tab */}
        {isOwnProfile && profileTab === "compose" && (
          <Composer
            onPost={async (content) => {
              await handleComposePost(content);
              setProfileTab("posts");
            }}
          />
        )}

        {/* Posts tab */}
        {profileTab === "posts" && (
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
                    onReverseLike={handleReverseLike}
                    onReverseRepost={handleReverseRepost}
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
        )}
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

                {((profile as any)?.account_type === "business") && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="mb-1 block text-[12px] font-semibold text-muted">Business type</label>
                      <input
                        value={editBusinessType}
                        onChange={(e) => setEditBusinessType(e.target.value)}
                        placeholder="Restaurant, coffee shop, store, office…"
                        className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-[14px] text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-semibold text-muted">Business address</label>
                      <input
                        value={editBusinessAddress}
                        onChange={(e) => setEditBusinessAddress(e.target.value)}
                        placeholder="Street, city, state"
                        className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-[14px] text-charcoal"
                      />
                    </div>
                    <p className="text-[11px] text-muted">
                      Use <span className="font-semibold">Storefront photo</span> on the banner for the outside of your business.
                    </p>
                  </div>
                )}

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

              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm font-bold text-charcoal">Account security</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-charcoal">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-charcoal focus:border-gold-soft focus:outline-none"
                      placeholder="you@example.com"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      Changing email may require confirmation in your inbox.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-charcoal">New password</label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      minLength={6}
                      className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-charcoal focus:border-gold-soft focus:outline-none"
                      placeholder="Leave blank to keep current"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-charcoal">Confirm new password</label>
                    <input
                      type="password"
                      value={editPassword2}
                      onChange={(e) => setEditPassword2(e.target.value)}
                      minLength={6}
                      className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-charcoal focus:border-gold-soft focus:outline-none"
                      placeholder="Confirm new password"
                    />
                  </div>
                  {accountMsg && (
                    <p className="text-[12px] text-muted">{accountMsg}</p>
                  )}
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
                  setAccountMsg("");
                  const links = editLinks
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .slice(0, 3);
                  const payload: any = {
                    display_name: editName.trim(),
                    bio: editBio.trim(),
                    links,
                  };
                  if ((profile as any).account_type === "business") {
                    payload.business_address = editBusinessAddress.trim() || null;
                    payload.business_type = editBusinessType.trim() || null;
                  }
                  const { data, error } = await updateProfile(currentUserId, payload);
                  if (error) {
                    setSavingProfile(false);
                    alert(error.message || "Could not save");
                    return;
                  }
                  if (editEmail.trim()) {
                    const { error: emailErr } = await updateUserEmail(editEmail.trim());
                    if (emailErr) {
                      setSavingProfile(false);
                      alert("Email: " + emailErr.message);
                      return;
                    }
                    setAccountMsg("Check your inbox if email confirmation is required.");
                  }
                  if (editPassword) {
                    if (editPassword.length < 6) {
                      setSavingProfile(false);
                      alert("Password must be at least 6 characters");
                      return;
                    }
                    if (editPassword !== editPassword2) {
                      setSavingProfile(false);
                      alert("Passwords do not match");
                      return;
                    }
                    const { error: pwErr } = await updateUserPassword(editPassword);
                    if (pwErr) {
                      setSavingProfile(false);
                      alert("Password: " + pwErr.message);
                      return;
                    }
                  }
                  setSavingProfile(false);
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

      {listModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-0"
          onClick={() => setListModal(null)}
        >
          <div
            className="flex max-h-[min(85vh,calc(100dvh-4.5rem))] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-pearl shadow-xl sm:max-h-[85vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-[16px] font-bold capitalize text-charcoal">
                {listModal}
              </h3>
              <button type="button" onClick={() => setListModal(null)} className="text-muted hover:text-charcoal">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
              {listLoading ? (
                <p className="p-6 text-center text-muted">Loading…</p>
              ) : listUsers.length === 0 ? (
                <p className="p-6 text-center text-muted">No one here yet</p>
              ) : (
                listUsers.map((u: any) => (
                  <Link
                    key={u.id}
                    href={`/${u.username}`}
                    onClick={() => setListModal(null)}
                    className="flex items-center gap-3 border-b border-border px-4 py-3 hover:bg-champagne/30"
                  >
                    <img
                      src={u.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.id}`}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-bold text-charcoal">{u.display_name}</span>
                        {(u.verified || isForcedVerifiedUsername(u.username)) && (
                          <VerifiedBadge username={u.username} gender={u.gender} size="sm" />
                        )}
                      </div>
                      <div className="truncate text-[13px] text-muted">@{u.username}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
        <BannerPicker
          open={bannerPickerOpen}
          onClose={() => setBannerPickerOpen(false)}
          onSelect={applyPresetBanner}
          onUploadFile={handleBannerFile}
          uploading={uploading}
          isBusiness={isBusiness}
        />
        <MobileBottomNav />
    </div>
  );
}
