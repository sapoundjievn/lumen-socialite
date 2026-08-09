"use client";

import Link from "next/link";
import { useState } from "react";

export default function SupportPage() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-pearl px-4 py-10 text-charcoal">
      <Link href="/" className="text-sm font-semibold text-gold-deep hover:underline">
        ← Lumen · Socialite
      </Link>
      <h1 className="mt-6 text-3xl font-bold">Support</h1>
      <p className="mt-2 text-sm text-muted">
        KenNick Technologies LLC · Lumen · Socialite help
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-border bg-white p-6">
        <p className="text-[15px] leading-relaxed">
          For account help, safety reports, privacy requests, or business questions related to Lumen
          · Socialite, contact us:
        </p>
        <p className="text-[15px]">
          <span className="font-semibold">Email:</span>{" "}
          <a
            href="mailto:support@kennicktechnologies.com"
            className="text-gold-deep hover:underline"
          >
            support@kennicktechnologies.com
          </a>
        </p>
        <p className="text-[13px] text-muted">
          Replace this address with your real support inbox when ready. Until then, use the form
          below (opens your email app).
        </p>

        {sent ? (
          <p className="rounded-xl bg-champagne/40 px-4 py-3 text-[14px] font-medium">
            Your mail app should open. If it does not, email us directly.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const subject = encodeURIComponent("Lumen · Socialite support");
              const body = encodeURIComponent(
                `Name: ${name}\nEmail: ${email}\n\n${message}`
              );
              window.location.href = `mailto:support@kennicktechnologies.com?subject=${subject}&body=${body}`;
              setSent(true);
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-[14px]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Your email"
              className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-[14px]"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="How can we help?"
              className="w-full rounded-xl border border-border bg-pearl px-3 py-2 text-[14px]"
            />
            <button
              type="submit"
              className="rounded-full bg-gold px-5 py-2 text-[14px] font-bold text-white hover:bg-gold-deep"
            >
              Contact support
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-[13px]">
        <Link href="/privacy" className="font-semibold text-gold-deep hover:underline">
          Privacy Policy
        </Link>
        <Link href="/terms" className="font-semibold text-gold-deep hover:underline">
          Terms of Service
        </Link>
      </div>

      <p className="mt-12 text-center text-xs text-muted">
        © 2026 KenNick Technologies LLC · Lumen · Socialite. All rights reserved.
      </p>
    </main>
  );
}
