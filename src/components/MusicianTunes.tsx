"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMusicTracks,
  createMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
  uploadMusicFile,
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
      const { url: audio_url, error: upErr } = await uploadMusicFile(
        profileId,
        file,
        `slot-${slot + 1}`
      );
      if (upErr || !audio_url) {
        throw new Error(upErr?.message || "Storage upload failed");
      }
      const existing = tracks[slot];
      if (existing) {
        const { error } = await updateMusicTrack(existing.id, profileId, { audio_url });
        if (error) throw new Error(error.message || "Could not update track");
      } else {
        const base = (file.name || "Sample").replace(/\.[^.]+$/, "").replace(/_/g, " ");
        const title = base.trim() || `Sample ${slot + 1}`;
        const { error } = await createMusicTrack(profileId, {
          title,
          audio_url,
          price_cents: 99,
          is_sample: true,
          sample_duration_sec: 60,
          slot_index: slot + 1,
        } as any);
        if (error) {
          throw new Error(
            error.message ||
              "Saved file but database rejected track — check music_tracks RLS policies"
          );
        }
      }
      await reload();
    } catch (e: any) {
      alert(e?.message || e?.error_description || "Upload failed");
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
    const num = slot + 1;
    const label = t?.title
      ? `${num}. ${t.title}`
      : isOwner
      ? (locked ? `${num}.` : `${num}. +`)
      : `${num}.`;
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
          className={`w-full truncate rounded-full border px-1 py-1.5 text-[9px] font-semibold leading-tight transition sm:text-[10px] ${
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
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/*,.mp3,.wav,.m4a"
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

  const row1 = [0, 1, 2, 3, 4, 5, 6];
  const row2 = [7, 8, 9, 10, 11, 12, 13];

  return (
    <div className="w-full px-0">
      <p className="mb-2 text-center text-[11px] font-bold tracking-wide text-gold-deep">
        LumenTunes · 1-min samples
      </p>
      {/* Row 1: samples 1–7 evenly across full width */}
      <div className="grid w-full grid-cols-7 gap-1.5 sm:gap-2">
        {row1.map((s) => (
          <div key={s} className="min-w-0">
            <SlotButton slot={s} />
          </div>
        ))}
      </div>
      {/* Row 2: samples 8–14 evenly across full width */}
      <div className="mt-1.5 grid w-full grid-cols-7 gap-1.5 sm:gap-2">
        {row2.map((s) => (
          <div key={s} className="min-w-0">
            <SlotButton slot={s} />
          </div>
        ))}
      </div>
      {isOwner && (
        <p className="mt-2 text-center text-[10px] text-muted">
          Numbered samples: free accounts 1–7 · verified 1–14. Previews only (1 min).
        </p>
      )}
    </div>
  );
}
