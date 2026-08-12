"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import {
  getMusicTracks,
  createMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
  uploadMusicFile,
} from "@/lib/posts";
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
  const [playingSlot, setPlayingSlot] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const limit = verified ? 14 : 7;

  async function reload() {
    const { data } = await getMusicTracks(profileId);
    const list = (data || []) as MusicTrack[];
    // Profile = music description only (1-min samples) — never store full tracks
    const samples = list.filter((t) => (t as any).is_sample === true);
    const slots: (MusicTrack | null)[] = Array(SLOTS).fill(null);
    const used = new Set<number>();
    for (const t of samples) {
      const si = (t as any).slot_index as number | null | undefined;
      if (si && si >= 1 && si <= SLOTS && !used.has(si)) {
        slots[si - 1] = t;
        used.add(si);
      }
    }
    let i = 0;
    for (const t of samples) {
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

  function stopPlayback() {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
      a.removeAttribute("src");
      a.load();
    }
    setPlayingSlot(null);
    setPaused(false);
  }

  function playSlot(slot: number, url: string) {
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;

    if (playingSlot === slot && !a.paused) {
      a.pause();
      setPaused(true);
      return;
    }
    if (playingSlot === slot && a.paused && paused) {
      void a.play();
      setPaused(false);
      return;
    }

    a.onended = () => {
      setPlayingSlot(null);
      setPaused(false);
    };
    a.ontimeupdate = () => {
      if (a.currentTime >= 60) stopPlayback();
    };
    a.src = url;
    a.currentTime = 0;
    setPlayingSlot(slot);
    setPaused(false);
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
      const base = (file.name || "Sample").replace(/\.[^.]+$/, "").replace(/_/g, " ");
      const suggested = (tracks[slot]?.title || base.trim() || `Sample ${slot + 1}`).trim();
      const named = prompt("Song name for this example", suggested);
      if (named == null) {
        setBusySlot(null);
        return;
      }
      const title = named.trim() || suggested;

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
        const { error } = await updateMusicTrack(existing.id, profileId, {
          audio_url,
          title,
        });
        if (error) throw new Error(error.message || "Could not update track");
      } else {
        const { error } = await createMusicTrack(profileId, {
          title,
          audio_url,
          price_cents: 99,
          is_sample: true,
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
    const next = prompt("Song name", t.title);
    if (next == null) return;
    const name = next.trim();
    if (!name) return;
    await updateMusicTrack(t.id, profileId, { title: name });
    await reload();
  }

  /** Tiny store-style line (description only) */
  function TinyLine({ slot }: { slot: number }) {
    const t = tracks[slot];
    const locked = slot >= limit;
    const num = slot + 1;
    const title = t?.title || (locked ? "—" : isOwner ? "Add example" : "—");

    return (
      <div
        className={`flex min-h-[22px] items-center gap-1 rounded border px-1.5 py-0.5 ${
          t
            ? "border-border/80 bg-white"
            : locked
            ? "border-border/40 bg-frost/40 opacity-60"
            : "border-dashed border-border/70 bg-pearl/80"
        }`}
      >
        <span className="w-3 shrink-0 text-[9px] font-bold text-muted">{num}.</span>
        <button
          type="button"
          disabled={busySlot === slot || (locked && !t)}
          onClick={() => {
            if (t) playSlot(slot, t.audio_url);
            else if (isOwner && !locked) fileRefs.current[slot]?.click();
          }}
          onContextMenu={(e) => {
            if (!isOwner || !t) return;
            e.preventDefault();
            rename(slot);
          }}
          title={t ? t.title : locked ? "Verify to unlock" : "Upload 1-min sample"}
          className="min-w-0 flex-1 truncate text-left text-[9px] font-medium leading-tight text-charcoal sm:text-[10px]"
        >
          {busySlot === slot ? "…" : title}
        </button>
        {t && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              title={playingSlot === slot && !paused ? "Pause" : "Play"}
              onClick={(e) => {
                e.stopPropagation();
                playSlot(slot, t.audio_url);
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-gold/25 text-gold-deep hover:bg-gold/40"
            >
              {playingSlot === slot && !paused ? (
                <Pause className="h-2 w-2" />
              ) : (
                <Play className="h-2 w-2" />
              )}
            </button>
            <button
              type="button"
              title="Stop"
              onClick={(e) => {
                e.stopPropagation();
                if (playingSlot === slot) stopPlayback();
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-champagne/70 text-charcoal hover:bg-champagne"
            >
              <Square className="h-1.5 w-1.5 fill-current" />
            </button>
          </div>
        )}
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
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => rename(slot)}
              className="text-[7px] font-semibold text-gold-deep hover:underline"
            >
              name
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Delete sample ${num}?`)) return;
                const { error } = await deleteMusicTrack(t.id, profileId);
                if (error) alert(error.message);
                else await reload();
              }}
              className="text-[7px] font-semibold text-rose-500 hover:underline"
            >
              del
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="py-2 text-center text-[11px] text-muted">
        Loading LumenTunes music description…
      </p>
    );
  }

  const row1 = [0, 1, 2, 3, 4, 5, 6];
  const row2 = [7, 8, 9, 10, 11, 12, 13];

  return (
    <div className="w-full rounded-xl border border-border bg-champagne/20 px-2 py-2">
      <p className="mb-0.5 text-center text-[12px] font-bold tracking-wide text-gold-deep">
        LumenTunes · music description
      </p>
      <p className="mb-1.5 text-center text-[9px] text-muted">
        1-min examples only · not the store
      </p>

      {/* Two tiny catalog-style lines (rows) */}
      <div className="space-y-1">
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          {row1.map((s) => (
            <TinyLine key={s} slot={s} />
          ))}
        </div>
        <div className="border-t border-border/50 pt-1">
          <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {row2.map((s) => (
              <TinyLine key={s} slot={s} />
            ))}
          </div>
        </div>
      </div>

      {isOwner && (
        <p className="mt-1.5 text-center text-[9px] text-muted">
          Free: 1–7 · Verified: 1–14. Full songs →{" "}
          <span className="font-semibold text-gold-deep">LumenTunes Store</span>
        </p>
      )}
    </div>
  );
}
