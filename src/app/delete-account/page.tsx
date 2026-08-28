"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile, getCurrentUser, signIn, deleteOwnAccount } from "@/lib/auth";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([getCurrentProfile(), getCurrentUser()]).then(([p, u]) => {
      if (!p || !u) {
        router.replace("/login");
        return;
      }
      setUsername((p.username || "").replace(/^@/, "").toLowerCase());
      setEmail(u.email || "");
      setReady(true);
    });
  }, [router]);

  async function confirmDelete() {
    setErr("");
    const typed = tagInput.trim().replace(/^@/, "").toLowerCase();
    if (!typed || typed !== username) {
      setErr("Enter the exact @tag for this account.");
      return;
    }
    if (!password) {
      setErr("Enter the account password.");
      return;
    }
    setBusy(true);
    const { error: authErr } = await signIn(email, password);
    if (authErr) {
      setBusy(false);
      setErr("Password is not correct.");
      return;
    }
    const { error } = await deleteOwnAccount();
    setBusy(false);
    if (error) {
      setErr(error.message || "Could not delete account.");
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
          This permanently deletes this account and its data on Lumen · Socialite.
          Confirm with the account @tag and password. This cannot be undone.
        </p>
        <label className="block text-[13px] font-medium text-charcoal">
          Account tag
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder={`@${username}`}
            autoCapitalize="none"
            className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] outline-none"
          />
        </label>
        <label className="block text-[13px] font-medium text-charcoal">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password for this account"
            className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] outline-none"
          />
        </label>
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
