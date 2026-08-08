"use client";

import { useState, useRef, useEffect } from "react";
import { Image, Smile, Calendar, MapPin, BarChart2, X } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onPost: (content: string, mediaUrls?: string[]) => void | Promise<void>;
}

export default function Composer({ onPost }: ComposerProps) {
  const [content, setContent] = useState("");
  const [focused, setFocused] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrentProfile().then(setProfile);
  }, []);

  const charCount = content.length;
  const maxChars = 280;
  const isOver = charCount > maxChars;

  const handleSubmit = async () => {
    if ((!content.trim() && !file) || isOver) return;
    setUploading(true);
    try {
      let mediaUrls: string[] = [];
      if (file && profile) {
        const path = `${profile.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        let mediaUrl = "";
        const tryBuckets = ["Illuminations", "illuminations"];
        let errMsg = "";
        for (let i = 0; i < tryBuckets.length; i++) {
          const bucket = tryBuckets[i];
          const result = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
          if (!result.error) {
            mediaUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
            break;
          }
          errMsg = result.error.message || "upload error";
        }
        if (!mediaUrl) {
          alert("Image upload failed: " + errMsg);
          setUploading(false);
          return;
        }
        mediaUrls = [mediaUrl];
      }
      await onPost(content.trim() || " ", mediaUrls);
      setContent("");
      setFile(null);
      setPreview(null);
      setFocused(false);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } finally {
      setUploading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Please choose an image");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setFocused(true);
  };

  const canPost = (content.trim().length > 0 || !!file) && !isOver && !uploading;

  const avatar =
    profile?.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile?.id || "guest"}`;

  const tools = [
    { icon: Image, label: "Illumination", action: () => fileRef.current?.click() },
    { icon: BarChart2, label: "Poll", action: () => {} },
    { icon: Smile, label: "Emoji", action: () => {} },
    { icon: Calendar, label: "Schedule", action: () => {} },
    { icon: MapPin, label: "Location", action: () => {} },
  ];

  return (
    <div className="border-b border-border px-4 pt-3 pb-3">
      <div className="flex gap-3">
        <img
          src={avatar}
          alt={profile?.display_name || "You"}
          className="h-10 w-10 flex-shrink-0 rounded-full border border-border bg-champagne object-cover"
        />

        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onFocus={() => setFocused(true)}
            placeholder="Let me enlighten you..."
            rows={1}
            className="w-full resize-none bg-transparent text-[20px] leading-6 text-charcoal placeholder:text-muted-light focus:outline-none"
            style={{ minHeight: "28px" }}
          />

          {preview && (
            <div className="relative mt-2 overflow-hidden rounded-2xl border border-border">
              <div className="absolute left-2 top-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white">
                Illumination
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <img src={preview} alt="Illumination preview" className="max-h-80 w-full object-cover" />
            </div>
          )}

          {focused && (
            <div className="mb-3 mt-1">
              <button
                type="button"
                className="rounded-full border border-gold-soft/50 bg-champagne/30 px-3 py-0.5 text-[13px] font-bold text-gold-deep hover:bg-champagne/50"
              >
                Everyone can reply
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {tools.map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  onClick={action}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gold-deep transition hover:bg-champagne/50"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </button>
              ))}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickImage}
              />
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className={cn("relative h-6 w-6", isOver && "text-like")}>
                    <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-border"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${Math.min((charCount / maxChars) * 62.8, 62.8)} 62.8`}
                        className={isOver ? "text-like" : "text-gold"}
                      />
                    </svg>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canPost}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-bold text-white transition sm:text-[13px]",
                  canPost
                    ? "bg-gold hover:bg-gold-deep active:scale-95"
                    : "cursor-not-allowed bg-gold-soft/60"
                )}
              >
                {uploading ? "..." : "Enlighten every one"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
