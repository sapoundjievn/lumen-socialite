"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getMusicDescriptions, upsertMusicDescription } from "@/lib/posts";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

const SLOTS = 14;

type SlotLines = { line1: string; line2: string; line3: string };

function emptySlots(): SlotLines[] {
  return Array.from({ length: SLOTS }, () => ({
    line1: "",
    line2: "",
    line3: "",
  }));
}

function Inner() {
  const searchParams = useSearchParams();
  const artistParam = searchParams.get("artist");

  const [me, setMe] = useState<Profile | null>(null);
  const [artist, setArtist] = useState<Profile | null>(null);
  const [slots, setSlots] = useState<SlotLines[]>(emptySlots());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const isOwner = !!(me && artist && me.id === artist.id);

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
        art = data as Profile | null;
      } else if (profile) {
        art = profile;
      }
      setArtist(art);

      if (art) {
        const { data } = await getMusicDescriptions(art.id);
        const next = emptySlots();
        for (const row of data || []) {
          const i = Number((row as any).slot_index) - 1;
          if (i >= 0 && i < SLOTS) {
            next[i] = {
              line1: (row as any).line1 || "",
              line2: (row as any).line2 || "",
              line3: (row as any).line3 || "",
            };
          }
        }
        setSlots(next);
      }
      setLoading(false);
    })();
  }, [artistParam]);

  async function saveSlot(index: number) {
    if (!me || !artist || me.id !== artist.id) return;
    setSaving(index);
    const s = slots[index];
    const { error } = await upsertMusicDescription(
      me.id,
      index + 1,
      s.line1,
      s.line2,
      s.line3
    );
    if (error) alert(error.message || "Could not save");
    setSaving(null);
  }

  function updateLine(index: number, key: keyof SlotLines, value: string) {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
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
            <h1 className="text-lg font-bold text-charcoal">Music description</h1>
            {artist && (
              <p className="text-[12px] text-muted">
                @{artist.username} · 14 slots · 3 lines each
              </p>
            )}
          </div>
        </div>

        <div className="px-4 py-4">
          {loading ? (
            <p className="text-[13px] text-muted">Loading…</p>
          ) : !artist ? (
            <p className="text-[13px] text-muted">Artist not found.</p>
          ) : (
            <div className="space-y-3">
              {slots.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-white px-3 py-2.5"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-charcoal">
                      {i + 1}.
                    </span>
                    {isOwner && (
                      <button
                        type="button"
                        disabled={saving === i}
                        onClick={() => saveSlot(i)}
                        className="text-[11px] font-semibold text-gold-deep hover:underline disabled:opacity-50"
                      >
                        {saving === i ? "Saving…" : "Save"}
                      </button>
                    )}
                  </div>
                  {isOwner ? (
                    <div className="space-y-1.5">
                      <input
                        value={s.line1}
                        onChange={(e) => updateLine(i, "line1", e.target.value)}
                        placeholder="Line 1 — title / track name"
                        className="w-full rounded-lg border border-border bg-pearl px-2.5 py-1.5 text-[13px] text-charcoal"
                      />
                      <input
                        value={s.line2}
                        onChange={(e) => updateLine(i, "line2", e.target.value)}
                        placeholder="Line 2 — album / writers"
                        className="w-full rounded-lg border border-border bg-pearl px-2.5 py-1.5 text-[13px] text-charcoal"
                      />
                      <input
                        value={s.line3}
                        onChange={(e) => updateLine(i, "line3", e.target.value)}
                        placeholder="Line 3 — credentials / rights"
                        className="w-full rounded-lg border border-border bg-pearl px-2.5 py-1.5 text-[13px] text-charcoal"
                      />
                    </div>
                  ) : (
                    <div className="space-y-0.5 text-[13px] text-charcoal">
                      <p className="min-h-[1.25rem]">{s.line1 || "—"}</p>
                      <p className="min-h-[1.25rem] text-charcoal/80">
                        {s.line2 || "—"}
                      </p>
                      <p className="min-h-[1.25rem] text-muted">
                        {s.line3 || "—"}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

export default function MusicDescriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}
