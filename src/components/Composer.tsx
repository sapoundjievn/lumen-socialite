"use client";

import { useI18n } from "@/lib/i18n";
import { moderateContentFull } from "@/lib/moderation";

import { useState, useRef, useEffect } from "react";
import { Image, Smile, Calendar, MapPin, BarChart2, X, Languages, Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onPost: (content: string, mediaUrls?: string[]) => void | Promise<void>;
}

const EMOJI_QUICK = [
  "✨","😊","🔥","❤️","😂","🙏","💯","🌟","🥂","👑",
  "🎵","📸","💼","🚀","💜","🙌","😍","🥳","💪","🌙",
];

export default function Composer({ onPost }: ComposerProps) {
  const { t } = useI18n();
  const [content, setContent] = useState("");
  const [focused, setFocused] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const textRef = useRef<HTMLTextAreaElement>(null);
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
      if (content.trim()) {
        const mod = await moderateContentFull(content);
        if (!mod.allowed) {
          alert(mod.reason || "Blocked by safety filters.");
          setUploading(false);
          return;
        }
      }
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
            .upload(path, file, { upsert: true, contentType: file.type || (file.name.match(/\.(mp4|webm|mov)$/i) ? "video/mp4" : "image/jpeg") });
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

  const onPickMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImage && !isVideo) {
      alert("Please choose an image or short video (Illumination)");
      return;
    }
    // Soft limit ~60s / ~40MB for shorts
    if (isVideo && f.size > 40 * 1024 * 1024) {
      alert("Video Illumination must be under 40 MB (short clip)");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setFocused(true);
  };


  async function runAi(mode: "fix" | "translate") {
    if (!content.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, mode, target: targetLang }),
      });
      const json = await res.json();
      if (json?.text) {
        setContent(json.text);
        setFocused(true);
      } else {
        alert(json?.error || "AI could not rewrite that.");
      }
    } finally {
      setAiBusy(false);
    }
  }

  const canPost = (content.trim().length > 0 || !!file) && !isOver && !uploading;

  const avatar =
    profile?.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile?.id || "guest"}`;

  const tools = [
    { icon: Image, label: "Illumination (photo or short video)", action: () => fileRef.current?.click() },
    { icon: BarChart2, label: "Poll", action: () => {} },
    { icon: Smile, label: "Emoji", action: () => setShowEmoji((v) => !v) },
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
            ref={(el) => {
              textRef.current = el;
              (textareaRef as any).current = el;
            }}
            value={content}
            onChange={handleInput}
            onFocus={() => setFocused(true)}
            placeholder={t("letMeEnlighten")}
            rows={1}
            className="w-full resize-none bg-transparent text-[20px] leading-6 text-charcoal placeholder:text-muted-light focus:outline-none"
            style={{ minHeight: "28px" }}
          />

          {showEmoji && (
            <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-border bg-pearl p-2">
              {EMOJI_QUICK.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="rounded-lg p-1.5 text-lg leading-none hover:bg-champagne/50"
                  onClick={() => {
                    const el = textRef.current;
                    if (!el) {
                      setContent((prev) => prev + em);
                      return;
                    }
                    const start = el.selectionStart ?? content.length;
                    const end = el.selectionEnd ?? content.length;
                    const next = content.slice(0, start) + em + content.slice(end);
                    setContent(next);
                    requestAnimationFrame(() => {
                      el.focus();
                      const pos = start + em.length;
                      el.setSelectionRange(pos, pos);
                    });
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          )}

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
              {file?.type.startsWith("video/") ? (
                <video
                  src={preview}
                  controls
                  className="max-h-80 w-full bg-black object-contain"
                />
              ) : (
                <img src={preview} alt="Illumination preview" className="max-h-80 w-full object-cover" />
              )}
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
                accept="image/*,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={onPickMedia}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {content.trim() && (
                <>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="h-7 rounded-full border border-border bg-pearl px-2 text-[11px] text-charcoal"
                    title="Translate to"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="bg">Bulgarian</option>
                    <option value="ru">Russian</option>
                    <option value="uk">Ukrainian</option>
                    <option value="pl">Polish</option>
                    <option value="tr">Turkish</option>
                    <option value="ar">Arabic</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="hi">Hindi</option>
                  </select>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => runAi("translate")}
                    className="inline-flex items-center gap-1 rounded-full border border-gold-soft/50 px-2 py-1 text-[11px] font-semibold text-gold-deep hover:bg-champagne/40 disabled:opacity-50"
                  >
                    <Languages className="h-3.5 w-3.5" />
                    {aiBusy ? "…" : "Translate"}
                  </button>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => runAi("fix")}
                    className="inline-flex items-center gap-1 rounded-full border border-gold-soft/50 px-2 py-1 text-[11px] font-semibold text-gold-deep hover:bg-champagne/40 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiBusy ? "…" : "Write it correctly"}
                  </button>
                </>
              )}
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
                {uploading ? "..." : t("enlightenEveryone")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
