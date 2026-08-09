"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMusicTracks,
  createMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
} from "@/lib/posts";
import { supabase } from "@/lib/supabase";
import type { MusicTrack } from "@/types";

const SLOTS = 14;

export default function MusicianTunes({
  profileId,
  isOwner,
  verified,
}: {
  profileId: string;
  isOwner: boolean;
  verified?: boolean;
}) {
  const [tracks, setTracks] = useState<(MusicTrack | null)[]>(Array(SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const limit = verified ? 14 : 7;

  async function reload() {
    const { data } = await getMusicTracks(profileId);
    const list = (data || []) as MusicTrack[];
    const slots: (MusicTrack | null)[] = Array(SLOTS).fill(null);
    // Prefer slot_index 1-14; else fill by order
    const used = new Set<number>();
    for (const t of list) {
      const si = (t as any).slot_index as number | null | undefined;
      if (si && si >= 1 && si <= SLOTS && !used.has(si)) {
        slots[si - 1] = t;
        used.add(si);
      }
    }
    let i = 0;
    for (const t of list) {
      if (slots.includes(t)) continue;
      while (i < SLOTS && slots[i]) i++;
      if (i < SLOTS) {
        slots[i] = t;
        i++;
      }
    }
    setTracks(slots);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [profileId]);

  function play(url: string) {
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (a.src === url && !a.paused) {
      a.pause();
      return;
    }
    a.src = url;
    void a.play();
  }

  async function onPickFile(slot: number, file: File | null) {
    if (!file || !isOwner) return;
    if (slot >= limit) {
      alert(`Verified artists can use 14 slots. Free: 7. Get verified to unlock 8–14.`);
      return;
    }
    setBusySlot(slot);
    try {
      const path = `${profileId}/slot-${slot + 1}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("music")
        .upload(path, file, { upsert: true, contentType: file.type || "audio/mpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("music").getPublicUrl(path);
      const audio_url = pub.publicUrl;
      const existing = tracks[slot];
      if (existing) {
        await updateMusicTrack(existing.id, profileId, { audio_url });
      } else {
        const title = `Sample ${slot + 1}`;
        await createMusicTrack(profileId, {
          title,
          audio_url,
          price_cents: 99,
          is_sample: true,
          sample_duration_sec: 60,
          slot_index: slot + 1,
        } as any);
      }
      await reload();
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    }
    setBusySlot(null);
  }

  async function rename(slot: number) {
    const t = tracks[slot];
    if (!t || !isOwner) return;
    const next = prompt("Song name on button", t.title);
    if (next == null) return;
    const name = next.trim();
    if (!name) return;
    await updateMusicTrack(t.id, profileId, { title: name });
    await reload();
  }

  function SlotButton({ slot }: { slot: number }) {
    const t = tracks[slot];
    const locked = slot >= limit;
    const label = t?.title || (isOwner ? `+ ${slot + 1}` : "—");
    return (
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          disabled={busySlot === slot || (locked && !t)}
          onClick={() => {
            if (t) play(t.audio_url);
            else if (isOwner && !locked) fileRefs.current[slot]?.click();
          }}
          onContextMenu={(e) => {
            if (!isOwner || !t) return;
            e.preventDefault();
            rename(slot);
          }}
          title={
            t
              ? isOwner
                ? `${t.title} — click play · right-click rename`
                : t.title
              : locked
              ? "Unlock with verification"
              : "Upload 1-min sample"
          }
          className={`max-w-[4.5rem] truncate rounded-full border px-1.5 py-1 text-[9px] font-semibold leading-tight transition sm:max-w-[5.25rem] sm:text-[10px] ${
            t
              ? "border-gold/50 bg-champagne/50 text-charcoal hover:bg-gold/20"
              : locked
              ? "border-border/50 bg-frost/50 text-muted/50"
              : "border-dashed border-border text-muted hover:border-gold hover:text-gold-deep"
          }`}
        >
          {busySlot === slot ? "…" : label}
        </button>
        {isOwner && (
          <input
            ref={(el) => {
              fileRefs.current[slot] = el;
            }}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => onPickFile(slot, e.target.files?.[0] || null)}
          />
        )}
        {isOwner && t && (
          <button
            type="button"
            onClick={() => rename(slot)}
            className="text-[8px] text-gold-deep hover:underline"
          >
            edit
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="py-2 text-center text-[11px] text-muted">Loading LumenTunes…</p>
    );
  }

  const left = [0, 1, 2, 3, 4, 5, 6];
  const right = [7, 8, 9, 10, 11, 12, 13];

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[11px] font-bold tracking-wide text-gold-deep">
        LumenTunes Store
      </p>
      <div className="flex items-start justify-center gap-2 sm:gap-3">
        <div className="flex max-w-[42%] flex-wrap justify-end gap-1">
          {left.map((s) => (
            <SlotButton key={s} slot={s} />
          ))}
        </div>
        <div className="flex max-w-[42%] flex-wrap justify-start gap-1">
          {right.map((s) => (
            <SlotButton key={s} slot={s} />
          ))}
        </div>
      </div>
      {isOwner && (
        <p className="mt-2 text-center text-[10px] text-muted">
          Slots 1–7 free · 8–14 when verified · click empty to upload · edit to rename
        </p>
      )}
    </div>
  );
}
