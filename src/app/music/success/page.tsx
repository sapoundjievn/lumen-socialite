"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("Confirming payment…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus("Missing payment session.");
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
          setStatus(json.error || "Could not confirm payment");
          return;
        }
        setOk(true);
        setStatus("Payment successful. You can download your track from the store.");
      } catch (e: any) {
        setStatus(e?.message || "Confirmation failed");
      }
    })();
  }, [sessionId]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-pearl px-4 text-center text-charcoal">
      <h1 className="text-2xl font-bold">{ok ? "Thank you" : "Payment"}</h1>
      <p className="mt-3 text-[15px] text-muted">{status}</p>
      <Link
        href="/music"
        className="mt-6 rounded-full bg-gold px-5 py-2 text-[14px] font-bold text-white hover:bg-gold-deep"
      >
        Back to LumenTunes Store
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
