"use client";

/* ============================================================
 * SAMPLE SLOT SIZE LOCKED (owner approval required to change)
 * Boxes: 22mm wide x 5mm tall, horizontal, square corners
 * Text fitted inside (~21mm x 4mm)
 * Controls: top row above slots, bottom row below slots
 * Gap: 1mm between controls/slots
 * ============================================================ */

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
    const { data } = await getMusicTracks(profileId);
    const list = (data || []) as MusicTrack[];

    const samples = list.filter((t) => {
      const row = t as any;
      if (row.is_sample === true) return true;
      if (row.is_sample === false) return false;
      return row.slot_index != null && Number(row.price_cents || 0) === 0;
    });
    const storeTracks = list.filter((t) => (t as any).is_sample === false);

    const slots: (MusicTrack | null)[] = Array(SLOTS).fill(null);
    const used = new Set<number>();

    for (const t of samples) {
      const si = Number((t as any).slot_index);
      if (si >= 1 && si <= SLOTS && !used.has(si)) {
        slots[si - 1] = { ...t, title: displayTitle(t, si) };
        used.add(si);
      }
    }
    let i = 0;
    for (const t of samples) {
      if (slots.some((s) => s && s.id === t.id)) continue;
      while (i < SLOTS && slots[i]) i++;
      if (i < SLOTS) {
        slots[i] = { ...t, title: displayTitle(t, i + 1) };
        i++;
      }
    }
    // Only mirror store → example when the SAME slot number exists in the store.
    // Never dump extra store tracks into empty slots (keeps 4,5,6 empty if empty).
    for (const t of storeTracks) {
      const si = Number((t as any).slot_index);
      if (si >= 1 && si <= SLOTS && !slots[si - 1]) {
        slots[si - 1] = { ...t, title: displayTitle(t, si) };
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
      // Only update if existing row is a real sample owned as sample; otherwise insert sample
      if (existing && (existing as any).is_sample === true) {
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
    if ((t as any).is_sample !== true) {
      alert("Rename from LumenTunes Store for full tracks, or upload a sample here.");
      return;
    }
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

  function SlotButton({
    slot,
    controls,
  }: {
    slot: number;
    controls: "top" | "bottom";
  }) {
    const t = tracks[slot];
    const locked = slot >= limit;
    const num = slot + 1;
    const name = t ? displayTitle(t, num) : "";
    const hasAudio = !!(t && t.audio_url);
    const label = t
      ? `${num}. ${name}`
      : isOwner && !locked
      ? `${num}. +`
      : `${num}.`;

    const controlsRow = hasAudio ? (
      <div
        className="flex items-center justify-center"
        style={{ gap: "1mm" }}
      >
        <button
          type="button"
          title={playingSlot === slot && !paused ? "Pause" : "Play"}
          onClick={(e) => {
            e.stopPropagation();
            playSlot(slot, t!.audio_url);
          }}
          style={{ width: "3mm", height: "3mm", borderRadius: 0 }}
          className="flex items-center justify-center border border-gold/40 bg-gold/20 text-gold-deep hover:bg-gold/35"
        >
          {playingSlot === slot && !paused ? (
            <Pause className="h-[2mm] w-[2mm]" />
          ) : (
            <Play className="h-[2mm] w-[2mm]" />
          )}
        </button>
        <button
          type="button"
          title="Stop"
          onClick={(e) => {
            e.stopPropagation();
            if (playingSlot === slot) stopPlayback();
          }}
          style={{ width: "3mm", height: "3mm", borderRadius: 0 }}
          className="flex items-center justify-center border border-border bg-champagne/50 text-charcoal hover:bg-champagne"
        >
          <Square className="h-[1.5mm] w-[1.5mm] fill-current" />
        </button>
      </div>
    ) : (
      <div style={{ height: "3mm" }} />
    );

    return (
      <div
        className="flex flex-col items-center"
        style={{ gap: "1mm" }}
      >
        {controls === "top" && controlsRow}

        <button
          type="button"
          disabled={busySlot === slot || (locked && !t)}
          onClick={() => {
            if (hasAudio) playSlot(slot, t!.audio_url);
            else if (isOwner && !locked) fileRefs.current[slot]?.click();
          }}
          onContextMenu={(e) => {
            if (!isOwner || !t) return;
            e.preventDefault();
            rename(slot);
          }}
          title={t ? name : locked ? "Locked" : "Upload 1-min sample"}
          /* LOCKED by owner — sample slots 22mm x 5mm square corners. Do NOT change size/shape without explicit approval. */
          style={{ width: "22mm", height: "5mm", borderRadius: 0 }}
          className={
            "flex shrink-0 items-center justify-center overflow-hidden border px-0 font-semibold leading-none transition " +
            (t
              ? "border-gold/40 bg-champagne/40 text-charcoal hover:bg-gold/15"
              : locked
              ? "border-border/40 bg-frost/40 text-muted/40"
              : "border-dashed border-border text-muted hover:border-gold hover:text-gold-deep")
          }
        >
          <span
            className="block overflow-hidden truncate text-center font-semibold"
            style={{
              width: "21mm",
              height: "4mm",
              fontSize: "2.7mm",
              lineHeight: "4mm",
            }}
          >
            {busySlot === slot ? "…" : label}
          </span>
        </button>

        {controls === "bottom" && controlsRow}

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
        {isOwner && t && (t as any).is_sample === true && (
          <div className="flex" style={{ gap: "1mm" }}>
            <button
              type="button"
              onClick={() => rename(slot)}
              className="text-[6px] text-gold-deep hover:underline"
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
              className="text-[6px] text-rose-500 hover:underline"
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
      <p className="py-2 text-center text-[11px] text-muted">Loading…</p>
    );
  }

  const row1 = [0, 1, 2, 3, 4, 5, 6];
  const row2 = [7, 8, 9, 10, 11, 12, 13];

  return (
    <div className="w-full px-0">
      <p className="mb-1.5 text-center text-[11px] font-bold tracking-wide text-gold-deep">
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
      {/* Top row: controls above slots, 1mm gaps, horizontal 10mm x 3mm */}
      <div
        className="grid w-full grid-cols-7 place-items-center"
        style={{ gap: "1mm" }}
      >
        {row1.map((s) => (
          <SlotButton key={s} slot={s} controls="top" />
        ))}
      </div>
      {/* Bottom row: controls below slots */}
      <div
        className="grid w-full grid-cols-7 place-items-center"
        style={{ gap: "1mm", marginTop: "1mm" }}
      >
        {row2.map((s) => (
          <SlotButton key={s} slot={s} controls="bottom" />
        ))}
      </div>
    </div>
  );
}
