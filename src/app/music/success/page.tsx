"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");
  const artist = params.get("artist") || "";
  const [status, setStatus] = useState("Confirming payment…");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("Missing payment session.");
      setErr("No session_id — payment may have been cancelled.");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/confirm-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (!res.ok) {
          setErr(json.error || "Could not confirm payment");
          setStatus("Payment received, but download unlock failed.");
          return;
        }
        setOk(true);
        setStatus("Payment successful — your track is unlocked.");
        // Go to the artist store so Download appears
        const dest = artist
          ? `/music?artist=${encodeURIComponent(artist)}`
          : "/music";
        setTimeout(() => router.replace(dest), 1200);
      } catch (e: any) {
        setErr(e?.message || "Confirmation failed");
        setStatus("Could not confirm purchase");
      }
    })();
  }, [sessionId, artist, router]);

  const storeHref = artist
    ? `/music?artist=${encodeURIComponent(artist)}`
    : "/music";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-pearl px-4 text-center text-charcoal">
      <h1 className="text-2xl font-bold">{ok ? "Thank you" : "Payment"}</h1>
      <p className="mt-3 text-[15px] text-muted">{status}</p>
      {err && <p className="mt-2 text-[13px] text-rose-600">{err}</p>}
      <Link
        href={storeHref}
        className="mt-6 rounded-full bg-gold px-5 py-2 text-[14px] font-bold text-white hover:bg-gold-deep"
      >
        {artist ? `Open @${artist} store & download` : "Back to LumenTunes Store"}
      </Link>
    </main>
  );
}

export default function MusicSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
