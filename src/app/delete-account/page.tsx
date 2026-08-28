"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile, deleteOwnAccount } from "@/lib/auth";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (!p) {
        router.replace("/login");
        return;
      }
      setUsername((p.username || "").toLowerCase());
      setReady(true);
    });
  }, [router]);

  async function confirmDelete() {
    setErr("");
    if (typed.trim().toLowerCase() !== "delete") {
      setErr('Type DELETE to confirm.');
      return;
    }
    setBusy(true);
    const { error } = await deleteOwnAccount();
    setBusy(false);
    if (error) {
      setErr(error.message || "Could not delete account. Run the SQL in Supabase first.");
      return;
    }
    router.replace("/login?deleted=1");
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-[600px] px-4 py-16 text-center text-muted">
        Loading…
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[600px] border-x border-border bg-pearl pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-pearl/90 px-4 py-3 backdrop-blur">
        <Link href="/more" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[17px] font-bold text-charcoal">Delete account</h1>
      </div>
      <div className="space-y-4 px-4 py-6">
        <p className="text-[15px] text-charcoal">
          This permanently deletes @{username} and the data tied to it on Lumen · Socialite
          (profile, enlightenments, likes, follows, messages). This cannot be undone.
        </p>
        <p className="text-[13px] text-muted">
          Type <span className="font-bold text-charcoal">DELETE</span> then confirm.
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] outline-none"
        />
        {err ? <p className="text-[13px] text-rose-600">{err}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={confirmDelete}
          className="w-full rounded-full bg-rose-600 py-3 text-[15px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Permanently delete my account"}
        </button>
        <Link href="/more" className="block text-center text-[14px] text-gold-deep">
          Cancel
        </Link>
      </div>
    </main>
  );
}
