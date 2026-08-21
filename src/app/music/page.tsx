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
  deleteMusicTrack,
  MUSIC_PLATFORM_FEE_RATE,
  uploadMusicFile,
} from "@/lib/posts";
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
  const sessionParam = searchParams.get("session_id");

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

  const uname = (me?.username || "").toLowerCase().replace(/\s/g, "");
  const isFounder = uname === "thevip" || uname === "kendall.vip";
  // Owner cat / special artists allowed to use store without extra gates
  const isSpecialArtist = [
    "mikeavramov",
    "mikeavramove",
    "mrsamsnuggles",
    "mr.samsnuggles",
    "samsnuggles",
    "samsnuggles1",
  ].includes(uname);
  const accountType = String((me as any)?.account_type || "").toLowerCase();
  // All musician accounts (verified ones can sell automatically)
  const isMusician =
    accountType === "musician" || isFounder || isSpecialArtist;
  // Every verified musician account may upload songs to the store
  const canSell =
    isFounder ||
    isSpecialArtist ||
    (isMusician && !!me?.verified);
  // Own store ONLY when signed-in user is the artist shown
  const viewingOwn = !!(me && artist && me.id === artist.id && isMusician);

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
    const withNames = list.map((t, idx) => {
      const title =
        (t.title && String(t.title).trim()) || `Song ${idx + 1}`;
      return { ...t, title };
    });
    for (const t of withNames) {
      const si = (t as any).slot_index as number | undefined;
      if (si && si >= 1 && si <= SLOTS && !used.has(si)) {
        slots[si - 1] = t;
        used.add(si);
      }
    }
    let i = 0;
    for (const t of withNames) {
      if (slots.includes(t)) continue;
      while (i < SLOTS && slots[i]) i++;
      if (i < SLOTS) {
        slots[i] = { ...t, title: (t.title && t.title.trim()) || `Song ${i + 1}` };
        i++;
      }
    }
    // Ensure every filled slot has a visible name
    for (let s = 0; s < SLOTS; s++) {
      if (slots[s] && !(slots[s]!.title && slots[s]!.title.trim())) {
        slots[s] = { ...slots[s]!, title: `Song ${s + 1}` };
      }
    }
    return slots;
  }

  async function reload(artistId: string, buyerId?: string | null) {
    // LumenTunes Store = full tracks only (never profile 1-min samples)
    const { data } = await getMusicTracks(artistId);
    const list = ((data || []) as MusicTrack[]).filter(
      (t) => (t as any).is_sample === false
    );
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

      // Returning from Stripe Checkout — unlock purchase
      if (sessionParam) {
        try {
          const res = await fetch("/api/confirm-purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sessionParam }),
          });
          const json = await res.json();
          if (!res.ok) {
            console.error("confirm-purchase", json);
            setError(json.error || "Could not unlock purchase");
          }
        } catch (e: any) {
          console.error(e);
          setError(e?.message || "Unlock failed");
        }
      }

      const un = (profile?.username || "").toLowerCase().replace(/\s/g, "");
      const at = String((profile as any)?.account_type || "").toLowerCase();
      const special = [
        "thevip",
        "kendall.vip",
        "mr.samsnuggles",
        "mrsamsnuggles",
        "samsnuggles",
        "samsnuggles1",
        "mikeavramov",
        "mikeavramove",
      ];
      const profileIsMusician =
        !!profile && (at === "musician" || special.includes(un));

      let art: Profile | null = null;
      if (artistParam) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", artistParam)
          .maybeSingle();
        art = data as Profile | null;
      } else if (profileIsMusician) {
        art = profile;
      }
      setArtist(art);

      if (art) {
        await reload(art.id, profile?.id);
      }
      setLoading(false);
    })();
  }, [artistParam, sessionParam]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    if (!viewingOwn) {
      setError("You can only upload on your own store, not someone else's.");
      return;
    }
    if (!isMusician) {
      setError("This account is not a musician. Set account_type = musician in Supabase.");
      return;
    }
    if (!canSell) {
      setError("Musician must be verified to upload full store tracks.");
      return;
    }
    const songTitle =
      title.trim() ||
      (file.name || "Track").replace(/\.[^.]+$/, "").replace(/_/g, " ").trim() ||
      `Track ${slotPick}`;
    if (!songTitle) {
      setError("Add the song name");
      return;
    }
    if (!isSpecialArtist && !isFounder) {
      if (!copyrightOk || !copyrightOwner.trim()) {
        setError("Confirm copyright and owner name — required to sell music");
        return;
      }
    }
    if (!canSell) {
      setError(
        "Only verified musician accounts can sell full tracks. Ask owner to verify this account or set account_type to musician."
      );
      return;
    }
    const limit =
      me.verified || isFounder || isSpecialArtist
        ? SAMPLE_LIMIT_VERIFIED
        : SAMPLE_LIMIT_FREE;
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
        const { error: uErr } = await updateMusicTrack(existing.id, me.id, {
          title: songTitle,
          audio_url,
        });
        if (uErr) throw new Error(uErr.message || "Could not update track row");
        const { error: u2 } = await supabase
          .from("music_tracks")
          .update({
            price_cents,
            is_sample: false,
            slot_index: slotPick,
          } as any)
          .eq("id", existing.id);
        if (u2) throw new Error(u2.message || "Could not update track meta");
      } else {
        // Minimal insert — avoid optional columns that may not exist in DB
        const { data: created, error: cErr } = await supabase
          .from("music_tracks")
          .insert({
            user_id: me.id,
            title: songTitle,
            audio_url,
            price_cents,
            is_sample: false,
            slot_index: slotPick,
          } as any)
          .select("*")
          .single();
        if (cErr) {
          throw new Error(
            "File is in Storage, but track row failed: " +
              (cErr.message || "check music_tracks table + RLS")
          );
        }
        if (!created) {
          throw new Error("File uploaded but no track row returned");
        }
      }
      setTitle("");
      await reload(me.id, me.id);
      setError("");
      alert("Track saved on line " + slotPick);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const listedTracks = tracks.filter(Boolean) as MusicTrack[];
  const unownedTracks = listedTracks.filter((t) => !owned.has(t.id));
  const allTotalCents = listedTracks.reduce(
    (sum, t) => sum + (Number(t.price_cents) || 0),
    0
  );
  const buyAllCents = unownedTracks.reduce(
    (sum, t) => sum + (Number(t.price_cents) || 0),
    0
  );

  async function handleBuyAll() {
    if (!me) {
      alert("Sign in to buy and download");
      return;
    }
    if (!artist || me.id === artist.id) return;
    if (!unownedTracks.length) {
      alert("You already own these songs");
      return;
    }
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackIds: unownedTracks.map((t) => t.id),
          title: `All songs (${unownedTracks.length})`,
          priceCents: buyAllCents,
          buyerId: me.id,
          artistId: artist.id,
          artistUsername: artist.username,
          artistStripeConnectId: (artist as any).stripe_connect_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        alert(json.error || "Could not start payment");
        return;
      }
      window.location.href = json.url;
    } catch (e: any) {
      alert(e?.message || "Payment error");
    }
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
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          title: track.title,
          priceCents: track.price_cents,
          buyerId: me.id,
          artistId: artist.id,
          artistUsername: artist.username,
          artistStripeConnectId: (artist as any).stripe_connect_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        alert(json.error || "Could not start payment");
        return;
      }
      // Stripe Checkout (card, Apple Pay, Google Pay where available)
      window.location.href = json.url;
    } catch (e: any) {
      alert(e?.message || "Payment error");
    }
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
            <p className="text-[10px] text-muted">
              Not the profile samples — this is the store only
            </p>
          </div>
        </div>

        <div className="px-4 py-4">
          {!artist && !loading && (
            <p className="rounded-xl bg-champagne/40 px-3 py-3 text-[13px] text-muted">
              Open an artist&apos;s profile and use <span className="font-semibold text-charcoal">LumenTunes</span>,
              or musicians open this page to upload full songs for sale.
            </p>
          )}

          {me && (
            <p className="mb-2 text-[11px] text-muted">
              Signed in as @{me.username}
              {(me as any).account_type ? ` · ${(me as any).account_type}` : " · no account_type"}
              {me.verified ? " · verified" : " · not verified"}
              {viewingOwn
                ? " · your store · can upload here"
                : artist
                ? ` · viewing @${artist.username} (buy only)`
                : " · open your musician profile store to upload"}
            </p>
          )}
          {/* ARTIST UPLOAD (owner only) */}
          {isMusician && me && !canSell && (
            <div className="mb-6 rounded-2xl border border-border bg-champagne/40 px-4 py-3 text-[13px] text-charcoal">
              <p className="font-bold">Samples only (free musician)</p>
              <p className="mt-1 text-muted">
                You can use profile sample slots <span className="font-semibold">1–7</span>.
                Verify your musician account to unlock samples <span className="font-semibold">1–14</span> and LumenTunes to sell full songs.
              </p>
              <a href="/verify" className="mt-2 inline-block font-semibold text-gold-deep hover:underline">
                Get verified to sell →
              </a>
            </div>
          )}

          {/* Stripe Connect — own musician store only */}
          {me && artist && me.id === artist.id && isMusician && (
            <div className="mb-4 rounded-2xl border-2 border-gold bg-champagne/50 px-4 py-3">
              <p className="text-[14px] font-bold text-charcoal">
                LumenTunes artist payouts — 90% you / 10% Lumen · Socialite
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-charcoal/90">
                To receive money from sales you <span className="font-bold">must</span> connect a{" "}
                <span className="font-bold">Stripe</span> account (email + bank). Until you connect,
                sales may still process but payouts cannot go to your bank automatically.
              </p>
              <p className="mt-2 text-[12px] text-charcoal/80">
                Split on every sale: <span className="font-bold">90%</span> to the artist ·{" "}
                <span className="font-bold">10%</span> platform fee to Lumen · Socialite.
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-full bg-gold px-4 py-2.5 text-[14px] font-bold text-white hover:bg-gold-deep sm:w-auto"
                onClick={async () => {
                  if (!me) return;
                  try {
                    const res = await fetch("/api/connect/onboard", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: me.id }),
                    });
                    const json = await res.json();
                    if (!res.ok || !json.url) {
                      alert(json.error || "Could not start Stripe Connect");
                      return;
                    }
                    window.location.href = json.url;
                  } catch (e: any) {
                    alert(e?.message || "Connect error");
                  }
                }}
              >
                {(me as any)?.stripe_connect_id || (artist as any)?.stripe_connect_id
                  ? "Stripe connected — update payout account"
                  : "Connect Stripe to get paid (90%)"}
              </button>
            </div>
          )}

          {/* Buyer-facing note when viewing someone else's store */}
          {artist && me && me.id !== artist.id && (
            <p className="mb-3 text-[11px] text-muted">
              Purchases use Stripe. Artists receive <span className="font-semibold text-charcoal">90%</span>{" "}
              when they have connected Stripe; platform Lumen · Socialite keeps <span className="font-semibold text-charcoal">10%</span>.
            </p>
          )}
          {viewingOwn && canSell && (
            <div className="mb-6 rounded-2xl border border-border bg-white p-4">
              <p className="mb-2 text-[13px] font-bold text-charcoal">
                LumenTunes Store — upload full songs (line {slotPick})
              </p>
              <p className="mb-2 text-[12px] font-medium text-gold-deep">
                Uploading as @{me.username} only to your store catalog
              </p>
              <p className="mb-3 text-[11px] text-muted">
                Full tracks for pay & download (lines 1–14). Profile{" "}
                <span className="font-semibold">LumenTunes · music description</span> is
                separate — upload 1-min examples there on the artist profile.
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
              {!isSpecialArtist && !isFounder && (
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
              {(isSpecialArtist || isFounder) && (
                <p className="mb-2 text-[11px] text-muted">
                  Privileged artist account: copyright attestation not required for uploads.
                </p>
              )}
              <p className="mb-2 text-[10px] text-muted">
                LumenTunes: your share is 90% after Lumen · Socialite’s {Math.round(MUSIC_PLATFORM_FEE_RATE * 100)}% fee — shown only to
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

          {/* CUSTOMER / CATALOG: lines 1–14 — store only */}
          {artist && (
            <div className="space-y-2">
              <p className="text-[13px] font-bold text-charcoal">
                {viewingOwn
                  ? "LumenTunes Store catalog (how buyers see it)"
                  : "LumenTunes Store — buy & download"}
              </p>
              {listedTracks.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-soft/40 bg-champagne/30 px-4 py-3">
                  <div>
                    <p className="text-[14px] font-bold text-charcoal">
                      {listedTracks.length} song{listedTracks.length === 1 ? "" : "s"}
                      {" · "}
                      ${((viewingOwn ? allTotalCents : buyAllCents) / 100).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-muted">
                      {viewingOwn
                        ? "Catalog total if a buyer purchases every song"
                        : unownedTracks.length === 0
                          ? "You own every song in this store"
                          : unownedTracks.length === listedTracks.length
                            ? `Buy all ${unownedTracks.length} songs in one payment`
                            : `${unownedTracks.length} left to buy · already owned not included`}
                    </p>
                  </div>
                  {!viewingOwn && me && unownedTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBuyAll}
                      className="rounded-full bg-gold px-4 py-2 text-[13px] font-bold text-white hover:bg-gold-deep"
                    >
                      Buy all songs · ${(buyAllCents / 100).toFixed(2)}
                    </button>
                  )}
                  {!viewingOwn && !me && listedTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => alert("Sign in to pay and download")}
                      className="rounded-full bg-charcoal px-4 py-2 text-[13px] font-bold text-pearl"
                    >
                      Sign in to buy all
                    </button>
                  )}
                </div>
              )}
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
                          {has
                            ? (t!.title && String(t!.title).trim()) ||
                              `Song ${n}`
                            : "—"}
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
                            className="rounded-full bg-charcoal px-4 py-1.5 text-[13px] font-bold text-pearl hover:opacity-90"
                          >
                            Pay ${(t!.price_cents / 100).toFixed(2)}
                          </button>
                        )
                      )}
                      {has && !viewingOwn && !me && (
                        <button
                          type="button"
                          onClick={() => alert("Sign in to pay and download")}
                          className="rounded-full bg-charcoal px-4 py-1.5 text-[13px] font-bold text-pearl"
                        >
                          Sign in to Pay
                        </button>
                      )}
                      {has && viewingOwn && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const next = prompt("Song name", t!.title);
                              if (next == null) return;
                              const name = next.trim();
                              if (!name || !me) return;
                              const { error } = await updateMusicTrack(t!.id, me.id, {
                                title: name,
                              });
                              if (error) alert(error.message);
                              else await reload(me.id, me.id);
                            }}
                            className="text-[11px] font-semibold text-gold-deep hover:underline"
                          >
                            Name
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!me || !t) return;
                              if (!confirm(`Delete line ${n}: ${t.title}?`)) return;
                              const { error } = await deleteMusicTrack(t.id, me.id);
                              if (error) alert(error.message);
                              else await reload(me.id, me.id);
                            }}
                            className="text-[11px] font-semibold text-rose-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      {!has && viewingOwn && canSell && (
                        <button
                          type="button"
                          onClick={() => {
                            setSlotPick(n);
                            setTitle((t) => t || `Track ${n}`);
                            fileRef.current?.click();
                          }}
                          className="rounded-full bg-gold px-3 py-1.5 text-[12px] font-bold text-white hover:bg-gold-deep"
                        >
                          Upload
                        </button>
                      )}
                      {!has && !(viewingOwn && canSell) && (
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
