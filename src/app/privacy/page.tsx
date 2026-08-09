import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Lumen · Socialite",
  description: "Privacy Policy for Lumen · Socialite by KenNick Technologies LLC",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-pearl px-4 py-10 text-charcoal">
      <Link href="/" className="text-sm font-semibold text-gold-deep hover:underline">
        ← Lumen · Socialite
      </Link>
      <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">
        Effective: August 9, 2026 · Operated by KenNick Technologies LLC
      </p>

      <div className="prose mt-8 max-w-none space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-xl font-bold">1. Who we are</h2>
          <p>
            Lumen · Socialite (“Lumen”, “we”, “us”) is a social media platform operated by{" "}
            <strong>KenNick Technologies LLC</strong>. This policy explains what information we
            collect and how we use it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Information we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Account data: email, username, display name, password (secured by our auth provider)</li>
            <li>Profile data: bio, photo, banner, links, interests, account type</li>
            <li>Content you post: enlightenments, images, videos, messages, music samples</li>
            <li>Usage data: likes, follows, device/browser type, approximate logs for security</li>
            <li>Optional: verification documents you upload for identity checks</li>
            <li>Payments-related data if you buy verification or music (processed by payment partners)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. How we use information</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To provide and improve the Lumen · Socialite service</li>
            <li>To personalize feeds and interest matching</li>
            <li>To moderate content for hate, sexual exploitation, and violence</li>
            <li>To send service notices (security, password reset)</li>
            <li>To comply with law and enforce our Terms</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with infrastructure providers
            (hosting, database, storage, analytics) under contracts, or when required by law, or to
            protect users and the platform from harm or fraud.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Storage and security</h2>
          <p>
            Data is stored with reputable cloud providers. No method of transmission is 100% secure.
            You are responsible for keeping your password confidential.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Your choices</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Edit or delete your posts and profile information</li>
            <li>Block other users and report content</li>
            <li>Request account deletion by contacting support</li>
            <li>Language preference is stored on your device</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Children</h2>
          <p>
            Lumen · Socialite is not directed to children under 13 (or higher age where required by
            local law). We do not knowingly collect data from children under that age.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Contact</h2>
          <p>
            Privacy questions: see our{" "}
            <Link href="/support" className="font-semibold text-gold-deep hover:underline">
              Support
            </Link>{" "}
            page or email the address listed there.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">9. Changes</h2>
          <p>
            We may update this policy. The “Effective” date above will change when we do. Continued
            use of Lumen means you accept the updated policy.
          </p>
        </section>
      </div>

      <p className="mt-12 text-center text-xs text-muted">
        © 2026 KenNick Technologies LLC · Lumen · Socialite. All rights reserved.
      </p>
    </main>
  );
}
