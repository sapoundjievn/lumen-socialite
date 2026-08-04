"use client";

import { useState, useRef, useEffect } from "react";
import { Image, Smile, Calendar, MapPin, BarChart2 } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onPost: (content: string) => void;
}

export default function Composer({ onPost }: ComposerProps) {
  const [content, setContent] = useState("");
  const [focused, setFocused] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getCurrentProfile().then(setProfile);
  }, []);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onPost(content.trim());
    setContent("");
    setFocused(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const charCount = content.length;
  const maxChars = 280;
  const isOver = charCount > maxChars;

  const avatar =
    profile?.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile?.id || "guest"}`;

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

          {focused && (
            <div className="mb-3 mt-1">
              <button className="rounded-full border border-gold-soft/50 bg-champagne/30 px-3 py-0.5 text-[13px] font-bold text-gold-deep hover:bg-champagne/50">
                Everyone can reply
              </button>
            </div>
          )}

          <div
            className={cn(
              "flex items-center justify-between",
              focused ? "mt-2 border-t border-border-soft pt-3" : ""
            )}
          >
            <div className="flex items-center gap-0.5 -ml-2">
              {[
                { icon: Image, label: "Illumination" },
                { icon: BarChart2, label: "Poll" },
                { icon: Smile, label: "Emoji" },
                { icon: Calendar, label: "Schedule" },
                { icon: MapPin, label: "Location" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  title={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gold-deep transition hover:bg-champagne/50"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </button>
              ))}
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
                  {isOver && (
                    <span className="text-[13px] text-like">{maxChars - charCount}</span>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isOver}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[15px] font-bold text-white transition",
                  content.trim() && !isOver
                    ? "bg-gold hover:bg-gold-deep active:scale-95"
                    : "cursor-not-allowed bg-gold-soft/60"
                )}
              >
                Enlightenment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
