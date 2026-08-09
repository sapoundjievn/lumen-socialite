import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Lumen · Socialite",
  description: "Terms of Service for Lumen · Socialite by KenNick Technologies LLC",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-pearl px-4 py-10 text-charcoal">
      <Link href="/" className="text-sm font-semibold text-gold-deep hover:underline">
        ← Lumen · Socialite
      </Link>
      <h1 className="mt-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">
        Effective: August 9, 2026 · KenNick Technologies LLC
      </p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-xl font-bold">1. Agreement</h2>
          <p>
            By using Lumen · Socialite you agree to these Terms and our Privacy Policy. If you do not
            agree, do not use the service. The platform is operated by{" "}
            <strong>KenNick Technologies LLC</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Accounts</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You must provide accurate information and keep your login secure.</li>
            <li>One person should not create accounts to evade bans or spam.</li>
            <li>Founder accounts (@thevip, @kendall.vip) and company account (@kennicktechnologies) have platform roles described in-product.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Acceptable use</h2>
          <p>You may not post or do the following:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Hate speech, harassment, or targeted abuse</li>
            <li>Sexual content involving minors, exploitation, or non-consensual intimate imagery</li>
            <li>Threats, graphic violence promotion, or instructions for violent crime</li>
            <li>Spam, scams, malware, or unauthorized scraping</li>
            <li>Impersonation of others in a deceptive way</li>
            <li>Infringement of copyrights or trademarks (including music sales without rights)</li>
          </ul>
          <p className="mt-2">
            Automated and human moderation may remove content or suspend accounts. Report tools help
            us review abuse.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Content you post</h2>
          <p>
            You keep ownership of your content. You grant KenNick Technologies LLC a worldwide,
            non-exclusive license to host, display, and distribute your content on Lumen for
            operating the service. You are responsible for content you post.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Music (LumenTunes)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Free musician accounts: up to 7 one-minute samples; no full-track store sales.</li>
            <li>Verified musicians: up to 14 samples and may sell full tracks where enabled.</li>
            <li>Sellers must hold rights; platform fee may apply (e.g. 10% on sales) as disclosed at upload.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Paid verification</h2>
          <p>
            Optional paid identity verification may be offered (pricing shown in-app). Founder
            accounts may have permanent complimentary verification as configured by the platform.
            Fees are generally non-refundable except where required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Disclaimers</h2>
          <p>
            The service is provided “as is.” We do not guarantee uninterrupted or error-free
            operation. To the maximum extent allowed by law, KenNick Technologies LLC is not liable
            for indirect or consequential damages arising from use of Lumen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Termination</h2>
          <p>
            You may stop using Lumen at any time. We may suspend or terminate accounts that violate
            these Terms or create risk for users or the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">9. Contact</h2>
          <p>
            Questions:{" "}
            <Link href="/support" className="font-semibold text-gold-deep hover:underline">
              Support
            </Link>
            .
          </p>
        </section>
      </div>

      <p className="mt-12 text-center text-xs text-muted">
        © 2026 KenNick Technologies LLC · Lumen · Socialite. All rights reserved.
      </p>
    </main>
  );
}
