"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SlotInfo = {
  slot: number;
  title: string;
  description: string;
};

const EMPTY: SlotInfo[] = Array.from({ length: 14 }, (_, i) => ({
  slot: i + 1,
  title: "",
  description: "",
}));

function MusicInfoInner() {
  const searchParams = useSearchParams();
  const usernameParam = searchParams.get("u") || "";

  const [profile, setProfile] = useState<any>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [editSlot, setEditSlot] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const isOwner = !!viewerId && !!profile && viewerId === profile.id;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setViewerId(user?.id || null);

      let targetId = user?.id || null;
      let targetProfile: any = null;

      if (usernameParam) {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, account_type, verified")
          .ilike("username", usernameParam)
          .maybeSingle();
        if (data) {
          targetId = data.id;
          targetProfile = data;
        }
      } else if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, account_type, verified")
          .eq("id", user.id)
          .maybeSingle();
        targetProfile = data;
      }

      if (cancelled) return;
      setProfile(targetProfile);

      if (targetId) {
        const { data: rows } = await supabase
          .from("music_tracks")
          .select("slot, title, description")
          .eq("user_id", targetId)
          .order("slot", { ascending: true });

        if (cancelled) return;

        const next = EMPTY.map((s) => {
          const row = (rows || []).find(
            (r: any) => Number(r.slot) === s.slot
          );
          return {
            slot: s.slot,
            title: row?.title || "",
            description: row?.description || "",
          };
        });
        setSlots(next);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [usernameParam]);

  const openEdit = (slot: number) => {
    const s = slots.find((x) => x.slot === slot);
    setEditSlot(slot);
    setTitle(s?.title || "");
    setDescription(s?.description || "");
  };

  const save = async () => {
    if (editSlot === null || !profile || !isOwner) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("music_tracks")
        .select("id")
        .eq("user_id", profile.id)
        .eq("slot", editSlot)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("music_tracks")
          .update({
            title: title.trim() || null,
            description: description.trim() || null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("music_tracks").insert({
          user_id: profile.id,
          slot: editSlot,
          title: title.trim() || null,
          description: description.trim() || null,
          is_sample: true,
        });
        if (error) throw error;
      }

      setSlots((prev) =>
        prev.map((s) =>
          s.slot === editSlot
            ? {
                ...s,
                title: title.trim(),
                description: description.trim(),
              }
            : s
        )
      );
      setEditSlot(null);
    } catch (e: any) {
      alert(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-[#8a7e6e] text-sm">
        Loading…
      </div>
    );
  }

  const displayName =
    profile?.display_name || profile?.username || "Artist";

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2a26]">
      <header className="border-b border-[#e8e0d5] bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo-official.jpg"
              alt="Lumen"
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="font-semibold text-[15px]">LumenTunes</span>
          </Link>
          <Link
            href={profile?.username ? `/${profile.username}` : "/"}
            className="text-[13px] text-[#8a7e6e] hover:text-[#2c2a26]"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
        <p className="text-[13px] text-[#8a7e6e] mt-1 mb-8">
          Song information · 1–14
        </p>

        <div className="space-y-5">
          {slots.map((s) => {
            const isEditing = editSlot === s.slot;
            return (
              <div key={s.slot} className="flex gap-3">
                <div className="flex-shrink-0 w-7 pt-0.5 text-right">
                  <span className="text-[15px] font-semibold text-[#c9a86c]">
                    {s.slot}.
                  </span>
                </div>

                <div className="flex-1 min-w-0 border-b border-[#ebe4da] pb-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Song title"
                        maxLength={80}
                        className="w-full rounded-lg border border-[#e8e0d5] px-3 py-2 text-[14px] outline-none focus:border-[#c9a86c]"
                      />
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={"Line 1\nLine 2\nLine 3"}
                        rows={3}
                        maxLength={240}
                        className="w-full rounded-lg border border-[#e8e0d5] px-3 py-2 text-[14px] outline-none focus:border-[#c9a86c] resize-none leading-relaxed"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={save}
                          disabled={saving}
                          className="rounded-full bg-[#c9a86c] text-white text-[13px] font-medium px-4 py-1.5 hover:bg-[#b8944f] disabled:opacity-60"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditSlot(null)}
                          className="rounded-full border border-[#e8e0d5] text-[13px] px-4 py-1.5 text-[#6b6358]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-[15px]">
                          {s.title || "—"}
                        </p>
                        {isOwner && (
                          <button
                            onClick={() => openEdit(s.slot)}
                            className="text-[12px] text-[#c9a86c] hover:underline flex-shrink-0"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-[14px] text-[#5c564c] leading-relaxed whitespace-pre-wrap min-h-[3.6em]">
                        {s.description || ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-[11px] text-[#8a7e6e]">
          © 2026 Lumen · Socialite
        </p>
      </main>
    </div>
  );
}

export default function MusicInfoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center text-[#8a7e6e] text-sm">
          Loading…
        </div>
      }
    >
      <MusicInfoInner />
    </Suspense>
  );
}
