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
      alert("Verified artists can use 14 slots. Free: 7. Get verified to unlock 8–14.");
      return;
    }
    setBusySlot(slot);
    try {
      const base = (file.name || "Sample").replace(/\.[^.]+$/, "").replace(/_/g, " ");
      const suggested = (tracks[slot]?.title || base.trim() || "Sample " + (slot + 1)).trim();
      const named = prompt("Song name for this example", suggested);
      if (named == null) {
        setBusySlot(null);
        return;
      }
      const title = named.trim() || suggested;

      const { url: audio_url, error: upErr } = await uploadMusicFile(
        profileId,
        file,
        "slot-" + (slot + 1)
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
    const songName =
      (t?.title && String(t.title).trim()) ||
      (t ? "Song " + num : "");
    return (
      <div className="flex min-w-0 flex-col items-center gap-0.5">
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
          title={
            t
              ? isOwner
                ? songName + " — click play · right-click rename"
                : songName
              : locked
              ? "Unlock with verification"
              : "Upload 1-min sample"
          }
          className={
            "flex min-h-[3.25rem] w-full flex-col items-center justify-center rounded-xl border px-1 py-1 text-center transition " +
            (t
              ? "border-gold/50 bg-champagne/50 text-charcoal hover:bg-gold/20"
              : locked
              ? "border-border/50 bg-frost/50 text-muted/50"
              : "border-dashed border-border text-muted hover:border-gold hover:text-gold-deep")
          }
        >
          {busySlot === slot ? (
            <span className="text-[11px]">…</span>
          ) : (
            <>
              <span className="text-[10px] font-bold text-muted">{num}.</span>
              <span className="line-clamp-2 w-full px-0.5 text-[10px] font-semibold leading-tight text-charcoal sm:text-[11px]">
                {t ? songName : isOwner && !locked ? "+" : locked ? "—" : ""}
              </span>
            </>
          )}
        </button>
        {t && (
          <div className="flex items-center justify-center gap-0.5">
            <button
              type="button"
              title="Play"
              onClick={(e) => {
                e.stopPropagation();
                playSlot(slot, t.audio_url);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold-deep hover:bg-gold/40"
            >
              {playingSlot === slot && !paused ? (
                <Pause className="h-2.5 w-2.5" />
              ) : (
                <Play className="h-2.5 w-2.5" />
              )}
            </button>
            <button
              type="button"
              title="Stop"
              onClick={(e) => {
                e.stopPropagation();
                if (playingSlot === slot) stopPlayback();
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-champagne/60 text-charcoal hover:bg-champagne"
            >
              <Square className="h-2 w-2 fill-current" />
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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => rename(slot)}
              className="text-[8px] text-gold-deep hover:underline"
            >
              name
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Delete sample " + num + "?")) return;
                const { error } = await deleteMusicTrack(t.id, profileId);
                if (error) alert(error.message);
                else await reload();
              }}
              className="text-[8px] text-rose-500 hover:underline"
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
      <p className="py-2 text-center text-[11px] text-muted">Loading LumenTunes…</p>
    );
  }

  const row1 = [0, 1, 2, 3, 4, 5, 6];
  const row2 = [7, 8, 9, 10, 11, 12, 13];

  return (
    <div className="w-full border-t border-border px-2 pt-3">
      <p className="mb-1 text-center text-[13px] font-bold text-charcoal">
        Music examples · 1 minute
      </p>
      <p className="mb-2 text-center text-[11px] text-muted">
        {verified ? "Slots 1–14" : "Slots 1–7 (verify for 8–14)"}
        {isOwner ? " · tap empty slot to upload · long-press name to rename" : ""}
      </p>
      <div className="grid w-full grid-cols-4 gap-2 sm:grid-cols-7">
        {row1.map((s) => (
          <div key={s} className="min-w-0">
            <SlotButton slot={s} />
          </div>
        ))}
      </div>
      <div className="mt-2 grid w-full grid-cols-4 gap-2 sm:grid-cols-7">
        {row2.map((s) => (
          <div key={s} className="min-w-0">
            <SlotButton slot={s} />
          </div>
        ))}
      </div>
      {username && (
        <p className="mt-2 text-center text-[11px]">
          <Link
            href={`/music?artist=${encodeURIComponent(username)}`}
            className="font-semibold text-gold-deep hover:underline"
          >
            Open LumenTunes Store
          </Link>
        </p>
      )}
    </div>
  );
}
