"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Music, Upload } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  getMusicTracks,
  createMusicTrack,
  purchaseMusicTrack,
  MUSIC_PLATFORM_FEE_RATE,
} from "@/lib/posts";
import type { Profile, MusicTrack } from "@/types";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function MusicPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0.99");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const me = await getCurrentProfile();
      setProfile(me);
      if (me) {
        const { data } = await getMusicTracks(me.id);
        setTracks(data as MusicTrack[]);
      }
    })();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if ((profile as any).account_type !== "musician" && profile.username?.toLowerCase() !== "thevip") {
      setError("Only musician accounts can upload tracks");
      return;
    }
    if (!title.trim()) {
      setError("Add a title first");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const path = `${profile.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("music")
        .upload(path, file, { upsert: true, contentType: file.type || "audio/mpeg" });
      if (upErr) {
        setError(upErr.message + " — create public bucket named music");
        return;
      }
      const audio_url = supabase.storage.from("music").getPublicUrl(path).data.publicUrl;
      const price_cents = Math.max(0, Math.round(parseFloat(price || "0") * 100));
      const { data, error: insErr } = await createMusicTrack(profile.id, {
        title: title.trim(),
        audio_url,
        price_cents,
      });
      if (insErr) {
        setError(insErr.message);
        return;
      }
      if (data) setTracks((t) => [data as MusicTrack, ...t]);
      setTitle("");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleBuy(track: MusicTrack) {
    if (!profile) {
      alert("Sign in to buy");
      return;
    }
    if (track.user_id === profile.id) {
      alert("This is your track");
      return;
    }
    const { error, platformFee, sellerNet } = await purchaseMusicTrack(
      track.id,
      profile.id,
      track.user_id,
      track.price_cents
    );
    if (error) {
      alert(error.message || "Purchase failed");
      return;
    }
    alert(
      `Purchase recorded (demo).\nPrice: $${(track.price_cents / 100).toFixed(2)}\nPlatform 10%: $${((platformFee || 0) / 100).toFixed(2)}\nArtist net: $${((sellerNet || 0) / 100).toFixed(2)}\n\nStripe live payouts can be connected next.`
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>
      <main className="w-full max-w-[600px] border-x-0 border-border pb-16 sm:border-x sm:pb-0">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-pearl/85 px-4 py-3 backdrop-blur-md">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-charcoal">Music</h1>
        </div>

        <div className="px-4 py-4">
          <p className="mb-4 text-[13px] text-muted">
            Musicians upload tracks and sell direct. Lumen takes{" "}
            <span className="font-semibold text-charcoal">
              {Math.round(MUSIC_PLATFORM_FEE_RATE * 100)}% per sale
            </span>
            .
          </p>

          {profile && (
            <div className="mb-6 rounded-2xl border border-border bg-pearl-soft p-4">
              <div className="mb-2 flex items-center gap-2 text-charcoal">
                <Upload className="h-4 w-4" />
                <span className="text-[14px] font-bold">Upload track</span>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Track title"
                className="mb-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
              />
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price USD e.g. 0.99"
                className="mb-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
              />
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-gold px-4 py-2 text-[13px] font-bold text-white hover:bg-gold-deep disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Choose audio file"}
              </button>
              {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
            </div>
          )}

          <div className="space-y-3">
            {tracks.length === 0 ? (
              <div className="py-12 text-center text-muted">
                <Music className="mx-auto mb-2 h-8 w-8 opacity-40" />
                No tracks yet
              </div>
            ) : (
              tracks.map((t) => (
                <div key={t.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-charcoal">{t.title}</div>
                      <div className="text-[13px] text-muted">
                        ${(t.price_cents / 100).toFixed(2)} · {t.sales_count || 0} sales
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBuy(t)}
                      className="flex-shrink-0 rounded-full bg-charcoal px-3 py-1.5 text-[12px] font-bold text-pearl"
                    >
                      Buy
                    </button>
                  </div>
                  <audio controls className="mt-3 w-full" src={t.audio_url} preload="none" />
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
