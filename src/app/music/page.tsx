"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Music, Download } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import {
  getMusicTracks,
  createMusicTrack,
  updateMusicTrack,
  purchaseMusicTrack,
  MUSIC_PLATFORM_FEE_RATE, uploadMusicFile } from "@/lib/posts";
import { supabase } from "@/lib/supabase";
import type { Profile, MusicTrack } from "@/types";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

const SLOTS = 14;
const SAMPLE_LIMIT_FREE = 7;
const SAMPLE_LIMIT_VERIFIED = 14;

function MusicInner() {
  const searchParams = useSearchParams();
  const artistParam = searchParams.get("artist"); // username of store to view

  const [me, setMe] = useState<Profile | null>(null);
  const [artist, setArtist] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<(MusicTrack | null)[]>(Array(SLOTS).fill(null));
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [slotPick, setSlotPick] = useState(1);
  const [price, setPrice] = useState("0.99");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [copyrightOk, setCopyrightOk] = useState(false);
  const [copyrightOwner, setCopyrightOwner] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uname = (me?.username || "").toLowerCase();
  const isFounder = uname === "thevip" || uname === "kendall.vip";
  const isMusician = (me as any)?.account_type === "musician" || isFounder;
  const unameMe = (me?.username || "").toLowerCase();
  const isMikeAvramov = unameMe === "mikeavramov" || unameMe === "mikeavramove";
  const canSell =
    isFounder ||
    (!!me?.verified && isMusician) ||
    isMikeAvramov;
  const viewingOwn =
    !!me &&
    !!artist &&
    me.id === artist.id &&
    isMusician;

  async function loadOwned(userId: string, trackIds: string[]) {
    if (!trackIds.length) {
      setOwned(new Set());
      return;
    }
    const { data } = await supabase
      .from("music_purchases")
      .select("track_id")
      .eq("buyer_id", userId)
      .in("track_id", trackIds);
    setOwned(new Set((data || []).map((r: any) => r.track_id)));
  }

  function mapSlots(list: MusicTrack[]) {
    const slots: (MusicTrack | null)[] = Array(SLOTS).fill(null);
    const used = new Set<number>();
    for (const t of list) {
      const si = (t as any).slot_index as number | undefined;
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
    return slots;
  }

  async function reload(artistId: string, buyerId?: string | null) {
    // Full tracks for store (not profile 1-min samples) — prefer is_sample = false
    const { data } = await getMusicTracks(artistId);
    let list = (data || []) as MusicTrack[];
    const full = list.filter((t) => (t as any).is_sample === false || (t as any).is_sample == null);
    // if artist only uploaded with is_sample true from old flow, still show them as catalog
    if (full.length === 0) list = list;
    else list = full;
    const slots = mapSlots(list);
    setTracks(slots);
    if (buyerId) {
      await loadOwned(
        buyerId,
        slots.filter(Boolean).map((t) => t!.id)
      );
    }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentProfile();
      setMe(profile);

      let art: Profile | null = null;
      if (artistParam) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", artistParam)
          .maybeSingle();
        art = data;
      } else if (profile && ((profile as any).account_type === "musician" || ["thevip", "kendall.vip"].includes((profile.username || "").toLowerCase()))) {
        art = profile;
      }
      setArtist(art);

      if (art) {
        await reload(art.id, profile?.id);
      }
      setLoading(false);
    })();
  }, [artistParam]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me || !viewingOwn) return;
    if (!title.trim()) {
      setError("Add the song name");
      return;
    }
    if (!isMikeAvramov) {
      if (!copyrightOk || !copyrightOwner.trim()) {
        setError("Confirm copyright and owner name — required to sell music");
        return;
      }
    }
    if (!canSell) {
      setError("Only verified musician accounts can sell full tracks in LumenTunes Store. Free accounts: 7 sample slots only.");
      return;
    }
    const limit = me.verified || isFounder ? SAMPLE_LIMIT_VERIFIED : SAMPLE_LIMIT_FREE;
    if (slotPick > limit) {
      setError(`Slot ${slotPick} needs verification (slots 8–14).`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const { url: audio_url, error: upErr } = await uploadMusicFile(
        me.id,
        file,
        `full-${slotPick}`
      );
      if (upErr || !audio_url) throw upErr || new Error("Upload failed");
      const price_cents = Math.max(0, Math.round(parseFloat(price || "0.99") * 100));
      const existing = tracks[slotPick - 1];
      if (existing) {
        await updateMusicTrack(existing.id, me.id, {
          title: title.trim(),
          audio_url,
        });
        await supabase
          .from("music_tracks")
          .update({
            price_cents,
            is_sample: false,
            slot_index: slotPick,
            copyright_attested: true,
            copyright_owner_name: copyrightOwner.trim(),
          } as any)
          .eq("id", existing.id);
      } else {
        await createMusicTrack(me.id, {
          title: title.trim(),
          audio_url,
          price_cents,
          is_sample: false,
          sample_duration_sec: null as any,
          slot_index: slotPick,
          copyright_attested: true,
          copyright_owner_name: copyrightOwner.trim(),
        } as any);
      }
      setTitle("");
      await reload(me.id, me.id);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleBuy(track: MusicTrack) {
    if (!me) {
      alert("Sign in to buy and download");
      return;
    }
    if (!artist) return;
    if (me.id === artist.id) {
      alert("This is your track");
      return;
    }
    const { error } = await purchaseMusicTrack(
      track.id,
      me.id,
      artist.id,
      track.price_cents
    );
    if (error) {
      alert(error.message || "Purchase failed");
      return;
    }
    setOwned((prev) => new Set(prev).add(track.id));
    alert("Purchase complete. You can download the full track now.");
  }

  function downloadTrack(track: MusicTrack) {
    const a = document.createElement("a");
    a.href = track.audio_url;
    a.download = `${track.title || "track"}.mp3`;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>
      <main className="w-full max-w-[600px] border-x-0 border-border pb-16 sm:border-x sm:pb-0">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-pearl/85 px-4 py-3 backdrop-blur-md">
          <Link
            href={artist ? `/${artist.username}` : "/"}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-charcoal">LumenTunes Store</h1>
            {artist && (
              <p className="text-[12px] text-muted">
                @{artist.username} · full tracks · pay & download
              </p>
            )}
          </div>
        </div>

        <div className="px-4 py-4">
          {!artist && !loading && (
            <p className="rounded-xl bg-champagne/40 px-3 py-3 text-[13px] text-muted">
              Open an artist&apos;s profile and use <span className="font-semibold text-charcoal">LumenTunes Store</span>,
              or musicians open this page to upload full songs for sale.
            </p>
          )}

          {/* ARTIST UPLOAD (owner only) */}
          {viewingOwn && !canSell && (
            <div className="mb-6 rounded-2xl border border-border bg-champagne/40 px-4 py-3 text-[13px] text-charcoal">
              <p className="font-bold">Samples only (free musician)</p>
              <p className="mt-1 text-muted">
                You can use profile sample slots <span className="font-semibold">1–7</span>.
                Verify your musician account to unlock samples <span className="font-semibold">1–14</span> and the LumenTunes Store to sell full songs.
              </p>
              <a href="/verify" className="mt-2 inline-block font-semibold text-gold-deep hover:underline">
                Get verified to sell →
              </a>
            </div>
          )}

          {viewingOwn && canSell && (
            <div className="mb-6 rounded-2xl border border-border bg-white p-4">
              <p className="mb-2 text-[13px] font-bold text-charcoal">
                Artist upload — full songs for sale
              </p>
              <p className="mb-3 text-[11px] text-muted">
                Profile buttons stay as 1-minute samples only. Full tracks for pay & download go here
                (lines 1–14). Fee for sales is only shown to you as the artist.
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song name"
                className="mb-2 w-full rounded-xl border border-border bg-pearl px-3 py-2 text-[14px]"
              />
              <div className="mb-2 flex gap-2">
                <select
                  value={slotPick}
                  onChange={(e) => setSlotPick(Number(e.target.value))}
                  className="rounded-xl border border-border bg-pearl px-3 py-2 text-[14px]"
                >
                  {Array.from({ length: SLOTS }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Line {n}
                    </option>
                  ))}
                </select>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price USD"
                  className="flex-1 rounded-xl border border-border bg-pearl px-3 py-2 text-[14px]"
                />
              </div>
              {!isMikeAvramov && (
                <>
                  <label className="mb-2 flex items-start gap-2 text-[12px] text-charcoal">
                    <input
                      type="checkbox"
                      checked={copyrightOk}
                      onChange={(e) => setCopyrightOk(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>I own the copyright (or exclusive rights) to sell this recording.</span>
                  </label>
                  <input
                    value={copyrightOwner}
                    onChange={(e) => setCopyrightOwner(e.target.value)}
                    placeholder="Copyright owner legal name"
                    className="mb-2 w-full rounded-xl border border-border bg-pearl px-3 py-2 text-[14px]"
                  />
                </>
              )}
              {isMikeAvramov && (
                <p className="mb-2 text-[11px] text-muted">
                  Special account: copyright attestation not required for uploads.
                </p>
              )}
              <p className="mb-2 text-[10px] text-muted">
                Your net after platform fee ({Math.round(MUSIC_PLATFORM_FEE_RATE * 100)}%): shown only to
                artists on sale.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,.mp3,.wav,.m4a,audio/*"
                className="hidden"
                onChange={handleUpload}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-gold px-4 py-2 text-[13px] font-bold text-white hover:bg-gold-deep disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload full track to selected line"}
              </button>
              {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
            </div>
          )}

          {/* CUSTOMER / CATALOG: lines 1–14 */}
          {artist && (
            <div className="space-y-2">
              <p className="text-[13px] font-bold text-charcoal">
                {viewingOwn ? "Your catalog (how buyers see it)" : "Buy & download"}
              </p>
              {loading ? (
                <p className="text-muted text-[13px]">Loading…</p>
              ) : (
                Array.from({ length: SLOTS }, (_, i) => {
                  const t = tracks[i];
                  const n = i + 1;
                  const has = !!t;
                  const isOwned = t ? owned.has(t.id) : false;
                  return (
                    <div
                      key={n}
                      className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5"
                    >
                      <span className="w-6 text-[13px] font-bold text-muted">{n}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-charcoal">
                          {has ? t!.title : "—"}
                        </div>
                        {has && (
                          <div className="text-[11px] text-muted">
                            ${(t!.price_cents / 100).toFixed(2)}
                            {isOwned ? " · Owned" : ""}
                          </div>
                        )}
                      </div>
                      {has && !viewingOwn && me && (
                        isOwned ? (
                          <button
                            type="button"
                            onClick={() => downloadTrack(t!)}
                            className="flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[12px] font-bold text-white"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuy(t!)}
                            className="rounded-full bg-charcoal px-3 py-1.5 text-[12px] font-bold text-pearl"
                          >
                            Pay
                          </button>
                        )
                      )}
                      {has && viewingOwn && (
                        <span className="text-[11px] text-muted">Listed</span>
                      )}
                      {!has && (
                        <span className="text-[11px] text-muted/60">Empty</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {!me && artist && (
            <p className="mt-4 text-center text-[13px] text-muted">
              <Link href="/login" className="font-semibold text-gold-deep hover:underline">
                Sign in
              </Link>{" "}
              to pay and download full tracks.
            </p>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

export default function MusicPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>
      }
    >
      <MusicInner />
    </Suspense>
  );
}
