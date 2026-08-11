"use client";

import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2a26]">
      {/* Header */}
      <header className="border-b border-[#e8e0d5] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/logo-official.jpg"
              alt="Lumen · Socialite"
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="font-semibold text-[15px] tracking-tight">
              Lumen · Socialite
            </span>
          </Link>
          <Link
            href="/"
            className="text-[13px] text-[#8a7e6e] hover:text-[#2c2a26] transition"
          >
            Back to app
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Support
        </h1>
        <p className="text-[#8a7e6e] text-[15px] mb-10">
          We’re here to help. Reach out anytime.
        </p>

        {/* Contact card */}
        <div className="rounded-2xl border border-[#e8e0d5] bg-white p-6 mb-8 shadow-sm">
          <h2 className="text-[17px] font-semibold mb-1">Contact us</h2>
          <p className="text-[14px] text-[#8a7e6e] mb-5">
            For account help, billing, verification, music store, or technical
            issues.
          </p>
          <a
            href="mailto:support@lumensocialite.com"
            className="inline-flex items-center gap-2 rounded-full bg-[#c9a86c] hover:bg-[#b8944f] text-white text-[14px] font-medium px-5 py-2.5 transition"
          >
            Email Support
          </a>
          <p className="mt-4 text-[13px] text-[#8a7e6e]">
            support@lumensocialite.com
          </p>
        </div>

        {/* Quick help */}
        <div className="space-y-4 mb-10">
          <h2 className="text-[17px] font-semibold">Quick help</h2>

          <div className="rounded-xl border border-[#e8e0d5] bg-white p-5">
            <h3 className="font-medium text-[15px] mb-1">Account & Login</h3>
            <p className="text-[14px] text-[#6b6358] leading-relaxed">
              Use the “Forgot password” link on the login page to reset your
              password. For email changes or locked accounts, email us with
              your username.
            </p>
          </div>

          <div className="rounded-xl border border-[#e8e0d5] bg-white p-5">
            <h3 className="font-medium text-[15px] mb-1">Verification</h3>
            <p className="text-[14px] text-[#6b6358] leading-relaxed">
              Personal, Business, and Musician verification is available in the
              More menu. Founder accounts (@thevip, @kendall.vip) are verified
              for life at no cost.
            </p>
          </div>

          <div className="rounded-xl border border-[#e8e0d5] bg-white p-5">
            <h3 className="font-medium text-[15px] mb-1">Musician Store</h3>
            <p className="text-[14px] text-[#6b6358] leading-relaxed">
              Verified musicians can upload samples and sell full tracks in
              their LumenTunes store. Platform fee is 10% per sale. Contact us
              for payout or copyright questions.
            </p>
          </div>

          <div className="rounded-xl border border-[#e8e0d5] bg-white p-5">
            <h3 className="font-medium text-[15px] mb-1">Business Profiles</h3>
            <p className="text-[14px] text-[#6b6358] leading-relaxed">
              Business accounts can upload a promotional banner and present
              their brand cleanly. Reach out if you need help setting up your
              business profile.
            </p>
          </div>

          <div className="rounded-xl border border-[#e8e0d5] bg-white p-5">
            <h3 className="font-medium text-[15px] mb-1">Report a problem</h3>
            <p className="text-[14px] text-[#6b6358] leading-relaxed">
              To report content, harassment, or a technical issue, email
              support with a description and (if possible) a screenshot or link
              to the post.
            </p>
          </div>
        </div>

        {/* Legal */}
        <div className="border-t border-[#e8e0d5] pt-8 text-[13px] text-[#8a7e6e] space-y-2">
          <p>
            Lumen · Socialite is owned and operated by KenNick Technologies
            LLC.
          </p>
          <p>© 2026 Lumen · Socialite. All rights reserved.</p>
          <div className="flex gap-4 pt-2">
            <Link href="/privacy" className="hover:text-[#2c2a26] underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#2c2a26] underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
