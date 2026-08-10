"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function Inner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("Confirming verification payment…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus("Missing payment session.");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/confirm-verify", {
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
        setStatus(
          "Payment received. Your verification is pending review by Lumen · Socialite."
        );
      } catch (e: any) {
        setStatus(e?.message || "Confirmation failed");
      }
    })();
  }, [sessionId]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-pearl px-4 text-center text-charcoal">
      <h1 className="text-2xl font-bold">{ok ? "Thank you" : "Verification payment"}</h1>
      <p className="mt-3 text-[15px] text-muted">{status}</p>
      <Link
        href="/verify"
        className="mt-6 rounded-full bg-gold px-5 py-2 text-[14px] font-bold text-white hover:bg-gold-deep"
      >
        Back to verification
      </Link>
      <Link href="/" className="mt-3 text-[13px] text-gold-deep hover:underline">
        Home · Lumen · Socialite
      </Link>
    </main>
  );
}

export default function VerifySuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
