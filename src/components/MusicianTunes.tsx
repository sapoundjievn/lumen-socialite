"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

function displayTitle(t: MusicTrack | null | undefined, num: number): string {
  if (!t) return "";
  const raw = t.title != null ? String(t.title).trim() : "";
  if (raw.length > 0) return raw;
  return `Song ${num}`;
}

export default function MusicianTunes({
  profileId,
  isOwner,
  verified,
  username,
}: {
  profileId: string;
  isOwner: boolean;
  verified?: boolean;
  username?: string;
}) {
  const [tracks, setTracks] = useState<(MusicTrack | null)[]>(
    Array(SLOTS).fill(null)
  );
  const [loading, setLoading] = useState(true);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [playingSlot, setPlayingSlot] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const limit = verified ? 14 : 7;

  async function reload() {
    const { data, error } = await getMusicTracks(profileId);
    if (error) {
      console.warn("getMusicTracks", error);
    }
    const list = (data || []) as MusicTrack[];

    // Only 1-minute examples (samples)
    const samples = list.filter((t) => {
      const row = t as any;
      if (row.is_sample === true) return true;
      if (row.is_sample === false) return false;
      // legacy: free slotted tracks count as samples
      return row.slot_index != null && Number(row.price_cents || 0) === 0;
    });

    const slots: (MusicTrack | null)[] = Array(SLOTS).fill(null);
    const used = new Set<number>();

    for (const t of samples) {
      const si = Number((t as any).slot_index);
      if (si >= 1 && si <= SLOTS && !used.has(si)) {
        slots[si - 1] = {
          ...t,
          title: displayTitle(t, si),
        };
        used.add(si);
      }
    }

    let i = 0;
    for (const t of samples) {
      if (slots.some((s) => s && s.id === t.id)) continue;
      while (i < SLOTS && slots[i]) i++;
      if (i < SLOTS) {
        slots[i] = {
          ...t,
          title: displayTitle(t, i + 1),
        };
        i++;
      }
    }

    setTracks(slots);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    void reload();
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
    if (!url) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;

    if (playingSlot === slot && !a.paused) {
      a.pause();
      setPaused(true);
      return;
    }
    if (playingSlot === slot && a.paused && paused) {
      void a.play().catch(() => {});
      setPaused(false);
      return;
    }

    a.onended = () => {
      setPlayingSlot(null);
      setPaused(false);
    };
    a.ontimeupdate = () => {
      if (a.currentTime >= 60) {
        a.pause();
        a.currentTime = 0;
        setPlayingSlot(null);
        setPaused(false);
      }
    };
    a.src = url;
    a.currentTime = 0;
    void a.play().catch(() => {});
    setPlayingSlot(slot);
    setPaused(false);
  }

  async function onPickFile(slot: number, file: File | null) {
    if (!file || !isOwner) return;
    if (slot >= limit) {
      alert(
        verified
          ? "Slot unavailable"
          : "Verified artists: 14 slots. Free: 7. Verify to unlock 8–14."
      );
      return;
    }
    setBusySlot(slot);
    try {
      const base = (file.name || "Sample")
        .replace(/\.[^.]+$/, "")
        .replace(/_/g, " ")
        .trim();
      const suggested =
        (tracks[slot]?.title && String(tracks[slot]!.title).trim()) ||
        base ||
        `Song ${slot + 1}`;
      const named = prompt("Song name for this 1-minute example", suggested);
      if (named == null) {
        setBusySlot(null);
        return;
      }
      const title = named.trim() || suggested;

      const { url, error: upErr } = await uploadMusicFile(
        profileId,
        file,
        "sample-slot-" + (slot + 1)
      );
      if (upErr || !url) throw new Error(upErr?.message || "Upload failed");

      const existing = tracks[slot];
      if (existing) {
        const { error } = await updateMusicTrack(existing.id, profileId, {
          audio_url: url,
          title,
        });
        if (error) throw new Error(error.message || "Could not update");
      } else {
        const { error } = await createMusicTrack(profileId, {
          title,
          audio_url: url,
          price_cents: 0,
          is_sample: true,
          slot_index: slot + 1,
        });
        if (error) throw new Error(error.message || "Could not save sample");
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
    const current = displayTitle(t, slot + 1);
    const next = prompt("Song name", current);
    if (next == null) return;
    const name = next.trim();
    if (!name) return;
    const { error } = await updateMusicTrack(t.id, profileId, { title: name });
    if (error) {
      alert(error.message || "Could not rename");
      return;
    }
    await reload();
  }

  function SlotButton({ slot }: { slot: number }) {
    const t = tracks[slot];
    const locked = slot >= limit;
    const num = slot + 1;
    const name = t ? displayTitle(t, num) : "";
    const hasAudio = !!(t && t.audio_url);

    return (
      <div className="flex min-w-0 flex-col items-center gap-1">
        {/* Same rounded box as before — number (+ name if fits) */}
        <button
          type="button"
          disabled={busySlot === slot || (locked && !t)}
          onClick={() => {
            if (hasAudio) playSlot(slot, t!.audio_url);
            else if (isOwner && !locked) fileRefs.current[slot]?.click();
          }}
          className={
            "w-full rounded-full border px-1 py-1.5 text-[10px] font-bold leading-tight transition " +
            (t
              ? "border-gold/50 bg-champagne/50 text-charcoal hover:bg-gold/20"
              : locked
              ? "border-border/50 bg-frost/50 text-muted/50"
              : "border-dashed border-border text-muted hover:border-gold hover:text-gold-deep")
          }
        >
          {busySlot === slot
            ? "…"
            : t
            ? `${num}.`
            : isOwner && !locked
            ? `${num}. +`
            : `${num}.`}
        </button>

        {/* NAME — always visible under the box when a sample exists */}
        {t ? (
          <p
            className="w-full text-center text-[11px] font-bold leading-snug text-charcoal"
            style={{ wordBreak: "break-word" }}
            title={name}
          >
            {name}
          </p>
        ) : null}

        {/* Play / Pause / Stop when uploaded */}
        {hasAudio ? (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              title={playingSlot === slot && !paused ? "Pause" : "Play"}
              onClick={(e) => {
                e.stopPropagation();
                playSlot(slot, t!.audio_url);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/30 text-gold-deep hover:bg-gold/50"
            >
              {playingSlot === slot && !paused ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              title="Stop"
              onClick={(e) => {
                e.stopPropagation();
                if (playingSlot === slot) stopPlayback();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-champagne text-charcoal hover:bg-champagne/80"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          </div>
        ) : null}

        {isOwner ? (
          <input
            ref={(el) => {
              fileRefs.current[slot] = el;
            }}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/*,.mp3,.wav,.m4a"
            className="hidden"
            onChange={(e) => onPickFile(slot, e.target.files?.[0] || null)}
          />
        ) : null}

        {isOwner && t ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => rename(slot)}
              className="text-[9px] font-semibold text-gold-deep hover:underline"
            >
              name
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Delete example ${num}?`)) return;
                const { error } = await deleteMusicTrack(t.id, profileId);
                if (error) alert(error.message);
                else await reload();
              }}
              className="text-[9px] font-semibold text-rose-500 hover:underline"
            >
              del
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="py-2 text-center text-[11px] text-muted">
        Loading examples…
      </p>
    );
  }

  const row1 = [0, 1, 2, 3, 4, 5, 6];
  const row2 = [7, 8, 9, 10, 11, 12, 13];

  return (
    <div className="w-full px-0">
      <p className="mb-2 text-center text-[11px] font-bold tracking-wide text-gold-deep">
        {username ? (
          <Link
            href={`/music-description?artist=${encodeURIComponent(username)}`}
            className="hover:underline"
          >
            Open here for music description
          </Link>
        ) : (
          "LumenTunes · 1-min samples"
        )}
      </p>
      <div className="grid w-full grid-cols-7 gap-1.5 sm:gap-2">
        {row1.map((s) => (
          <div key={s} className="min-w-0">
            <SlotButton slot={s} />
          </div>
        ))}
      </div>
      <div className="mt-2 grid w-full grid-cols-7 gap-1.5 sm:gap-2">
        {row2.map((s) => (
          <div key={s} className="min-w-0">
            <SlotButton slot={s} />
          </div>
        ))}
      </div>
      {isOwner ? (
        <p className="mt-2 text-center text-[10px] text-muted">
          1-minute examples · Play / Pause / Stop
        </p>
      ) : null}
    </div>
  );
}
