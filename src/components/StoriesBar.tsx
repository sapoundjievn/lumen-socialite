"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { createStory, getActiveStories, type Story } from "@/lib/stories";
import { supabase } from "@/lib/supabase";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function StoriesBar() {
  const [stories, setStories] = useState<Story[]>([]);
  const [me, setMe] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(null);
  const [viewer, setViewer] = useState<Story[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const { data } = await getActiveStories();
    setStories(data || []);
  }

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (p) setMe({ id: p.id, username: p.username, avatar_url: p.avatar_url });
    });
    reload();
  }, []);

  // Group by user
  const byUser = new Map<string, Story[]>();
  for (const s of stories) {
    const list = byUser.get(s.user_id) || [];
    list.push(s);
    byUser.set(s.user_id, list);
  }
  const rings = Array.from(byUser.entries());

  async function onFile(file: File | null) {
    if (!file || !me) {
      if (!me) alert("Sign in to post a story");
      return;
    }
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const path = `${me.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      let url = "";
      for (const bucket of ["Illuminations", "illuminations", "stories"]) {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: true, contentType: file.type });
        if (!error) {
          url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          break;
        }
      }
      if (!url) {
        alert("Upload failed — allow image/video on Illuminations or stories bucket");
        return;
      }
      const { error } = await createStory({
        userId: me.id,
        mediaUrl: url,
        mediaType: isVideo ? "video" : "image",
      });
      if (error) alert(error.message);
      else await reload();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const current = viewer?.[idx];

  return (
    <>
      <div className="flex gap-3 overflow-x-auto border-b border-border px-3 py-3 scrollbar-none">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-gold bg-champagne/40">
            {me?.avatar_url ? (
              <img src={me.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <Plus className="h-6 w-6 text-gold-deep" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-white">
              <Plus className="h-3 w-3" />
            </span>
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted">
            {uploading ? "…" : "Story"}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />

        {rings.map(([uid, list]) => {
          const p = list[0]?.profiles;
          return (
            <button
              key={uid}
              type="button"
              onClick={() => {
                setViewer(list);
                setIdx(0);
              }}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <div className="rounded-full bg-gradient-to-tr from-[#C9A86C] via-[#E8D5A3] to-[#C2185B] p-[2px]">
                <img
                  src={
                    p?.avatar_url ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${uid}`
                  }
                  alt=""
                  className="h-14 w-14 rounded-full border-2 border-pearl object-cover"
                />
              </div>
              <span className="flex w-full items-center justify-center gap-0.5 truncate text-[10px] text-charcoal">
                {p?.username || "user"}
              </span>
            </button>
          );
        })}
      </div>

      {viewer && current && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div className="flex gap-1 px-2 pt-3">
            {viewer.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full ${i <= idx ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-white">
            <Link href={`/${current.profiles?.username || ""}`} className="flex items-center gap-2">
              <img
                src={
                  current.profiles?.avatar_url ||
                  `https://api.dicebear.com/9.x/avataaars/svg?seed=${current.user_id}`
                }
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="text-sm font-bold">{current.profiles?.display_name}</span>
              {current.profiles?.verified && (
                <VerifiedBadge username={current.profiles.username} size="sm" />
              )}
            </Link>
            <button type="button" onClick={() => setViewer(null)} className="p-2">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center"
            onClick={() => {
              if (idx < viewer.length - 1) setIdx(idx + 1);
              else setViewer(null);
            }}
          >
            {current.media_type === "video" ? (
              <video
                src={current.media_url}
                className="max-h-full max-w-full object-contain"
                autoPlay
                controls
                playsInline
              />
            ) : (
              <img
                src={current.media_url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
          {current.caption && (
            <p className="px-4 py-3 text-center text-white">{current.caption}</p>
          )}
        </div>
      )}
    </>
  );
}
