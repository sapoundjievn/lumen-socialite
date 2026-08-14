"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  COLOR_BANNERS,
  FLAG_BANNERS,
  MUSIC_BANNERS,
  type BannerPreset,
} from "@/lib/banner-presets";

type Tab = "colors" | "flags" | "music" | "upload";

interface BannerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void | Promise<void>;
  onUploadFile: (file: File) => void | Promise<void>;
  uploading?: boolean;
  isBusiness?: boolean;
}

export default function BannerPicker({
  open,
  onClose,
  onSelect,
  onUploadFile,
  uploading,
  isBusiness,
}: BannerPickerProps) {
  const [tab, setTab] = useState<Tab>("colors");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const flags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FLAG_BANNERS;
    return FLAG_BANNERS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.id.replace("flag-", "").includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [open, tab]);

  if (!open) return null;

  async function pick(preset: BannerPreset) {
    if (saving || uploading) return;
    setSaving(true);
    try {
      await onSelect(preset.url);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "colors", label: "Colors" },
    { id: "flags", label: "Flags" },
    { id: "music", label: "Music" },
    { id: "upload", label: isBusiness ? "Photo" : "Upload" },
  ];

  const list =
    tab === "colors" ? COLOR_BANNERS : tab === "music" ? MUSIC_BANNERS : tab === "flags" ? flags : [];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !uploading) onClose();
      }}
    >
      <div
        className="flex w-full flex-col bg-pearl shadow-2xl sm:max-w-xl sm:rounded-2xl"
        style={{
          height: "min(92vh, 720px)",
          maxHeight: "92vh",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        {/* Header — always visible */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-[16px] font-bold text-charcoal">
              {isBusiness ? "Storefront banner" : "Choose banner"}
            </h3>
            <p className="text-[11px] text-muted">Fabric design · tap to apply</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className="rounded-full bg-champagne px-4 py-2 text-[13px] font-bold text-charcoal"
          >
            Close
          </button>
        </div>

        {/* Tabs — always visible */}
        <div className="flex shrink-0 gap-1 border-b border-border bg-pearl px-2 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "flex-1 rounded-full py-2 text-[12px] font-bold transition " +
                (tab === t.id
                  ? "bg-charcoal text-pearl"
                  : "bg-champagne/60 text-charcoal")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content — full remaining height */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {tab === "flags" && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              className="mb-3 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] outline-none focus:border-gold"
            />
          )}

          {tab === "upload" ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <p className="px-4 text-center text-[14px] text-muted">
                {isBusiness
                  ? "Upload a photo of your storefront, restaurant, or office."
                  : "Upload your own banner image (JPG, PNG, WebP)."}
              </p>
              <button
                type="button"
                disabled={!!uploading || saving}
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-charcoal px-6 py-3 text-[14px] font-bold text-pearl"
              >
                {uploading ? "Uploading…" : "Choose photo"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await onUploadFile(f);
                  onClose();
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
            </div>
          ) : (
            <>
              <p className="mb-2 text-[12px] text-muted">
                {list.length} option{list.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {list.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={saving || uploading}
                    onClick={() => pick(b)}
                    className="overflow-hidden rounded-xl border border-border bg-white text-left shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="aspect-[3/1] w-full overflow-hidden bg-champagne">
                      <img
                        src={b.url}
                        alt={b.name}
                        className="h-full w-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>
                    <div className="truncate px-2 py-1.5 text-[11px] font-semibold text-charcoal">
                      {b.name}
                    </div>
                  </button>
                ))}
              </div>
              {tab === "flags" && flags.length === 0 && (
                <p className="py-10 text-center text-[14px] text-muted">No countries match.</p>
              )}
            </>
          )}
          {/* bottom spacer so last row is not under mobile chrome */}
          <div className="h-8" />
        </div>

        {(saving || uploading) && (
          <div className="shrink-0 border-t border-border bg-pearl px-4 py-3 text-center text-[13px] font-semibold text-charcoal">
            Saving banner…
          </div>
        )}
      </div>
    </div>
  );
}
