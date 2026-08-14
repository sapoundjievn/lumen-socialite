"use client";

import { useMemo, useRef, useState } from "react";
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

  const flags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FLAG_BANNERS;
    return FLAG_BANNERS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.id.replace("flag-", "").includes(q)
    );
  }, [query]);

  if (!open) return null;

  async function pick(preset: BannerPreset) {
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
    { id: "upload", label: isBusiness ? "Storefront photo" : "Upload" },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-pearl shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-[16px] font-bold text-charcoal">
            {isBusiness ? "Storefront banner" : "Choose banner"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-[13px] font-semibold text-muted hover:bg-champagne/50"
          >
            Close
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition " +
                (tab === t.id
                  ? "bg-charcoal text-pearl"
                  : "text-charcoal hover:bg-champagne/50")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === "colors" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COLOR_BANNERS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={saving || uploading}
                  onClick={() => pick(b)}
                  className="overflow-hidden rounded-xl border border-border text-left transition hover:border-gold hover:shadow-md disabled:opacity-60"
                >
                  <div
                    className="h-16 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${b.url}")` }}
                  />
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-charcoal">
                    {b.name}
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === "music" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MUSIC_BANNERS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={saving || uploading}
                  onClick={() => pick(b)}
                  className="overflow-hidden rounded-xl border border-border text-left transition hover:border-gold hover:shadow-md disabled:opacity-60"
                >
                  <div
                    className="h-16 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${b.url}")` }}
                  />
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-charcoal">
                    {b.name}
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === "flags" && (
            <div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country…"
                className="mb-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-[13px] outline-none focus:border-gold"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {flags.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={saving || uploading}
                    onClick={() => pick(b)}
                    className="overflow-hidden rounded-xl border border-border text-left transition hover:border-gold hover:shadow-md disabled:opacity-60"
                  >
                    <div className="relative h-16 w-full overflow-hidden bg-champagne">
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
              {flags.length === 0 && (
                <p className="py-6 text-center text-[13px] text-muted">
                  No countries match.
                </p>
              )}
            </div>
          )}

          {tab === "upload" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="px-4 text-center text-[13px] text-muted">
                {isBusiness
                  ? "Upload a photo of your storefront, restaurant, or office."
                  : "Upload your own banner image (JPG, PNG, WebP)."}
              </p>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-charcoal px-5 py-2.5 text-[13px] font-semibold text-pearl hover:bg-charcoal-soft disabled:opacity-60"
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
          )}
        </div>

        {(saving || uploading) && (
          <div className="border-t border-border px-4 py-2 text-center text-[12px] text-muted">
            Saving banner…
          </div>
        )}
      </div>
    </div>
  );
}
