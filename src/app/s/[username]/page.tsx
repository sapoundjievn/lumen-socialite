import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://lumen-socialite.vercel.app";
/** Same official mark as home / sidebar — one only on share cards */
const LOGO = `${SITE}/logo-official.png`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iswajdlwvxyichfbglyf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_Sj-mESPCrjEsPqKOprW3WA_Xvpl6yM8"
);

type Props = {
  params: Promise<{ username: string }> | { username: string };
};

async function loadProfile(username: string) {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url, username, verified")
    .ilike("username", username)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username: raw } = await Promise.resolve(params);
  const username = (raw || "").replace(/^@/, "").trim();
  const shareUrl = `${SITE}/s/${username}`;
  const profileUrl = `${SITE}/${username}`;
  const data = await loadProfile(username);

  const displayName = data?.display_name || username;
  const bio =
    (data?.bio && String(data.bio).trim().slice(0, 160)) ||
    `@${username} on Lumen · Socialite`;
  // Prefer site logo for Messenger — external avatar URLs often fail Facebook fetch
  const image = LOGO;
  const title = `${displayName} (@${username}) · Lumen · Socialite`;

  return {
    title,
    description: bio,
    alternates: { canonical: profileUrl },
    openGraph: {
      type: "website",
      url: shareUrl,
      title,
      description: bio,
      siteName: "Lumen · Socialite",
      images: [{ url: image, width: 512, height: 512, alt: "Lumen · Socialite" }],
    },
    twitter: {
      card: "summary",
      title,
      description: bio,
      images: [image],
    },
  };
}

export default async function ShareProfilePage({ params }: Props) {
  const { username: raw } = await Promise.resolve(params);
  const username = (raw || "").replace(/^@/, "").trim();
  const data = await loadProfile(username);
  const displayName = data?.display_name || username;
  const bio = (data?.bio && String(data.bio).trim()) || "";
  const rawAvatar = data?.avatar_url ? String(data.avatar_url) : "";
  const hasRealAvatar =
    rawAvatar.startsWith("http") &&
    !rawAvatar.includes("logo-official") &&
    !rawAvatar.includes("logo.jpg") &&
    !rawAvatar.includes("logo.png") &&
    !rawAvatar.includes("LUMR");
  const profilePath = `/${username}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAF8F5",
        padding: 24,
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 20,
          border: "1px solid #E8E0D4",
          background: "#fff",
          padding: 28,
          textAlign: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
      >
        {/* One official home-page logo only */}
        <img
          src={LOGO}
          alt="Lumen · Socialite"
          width={88}
          height={88}
          style={{
            borderRadius: 16,
            margin: "0 auto 16px",
            display: "block",
            objectFit: "contain",
            background: "#FAF8F5",
          }}
        />
        {hasRealAvatar ? (
          <img
            src={rawAvatar}
            alt={displayName}
            width={96}
            height={96}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #F5E8D3",
              margin: "0 auto 12px",
              display: "block",
            }}
          />
        ) : null}
        <h1
          style={{
            margin: "0 0 4px",
            fontSize: 22,
            fontWeight: 700,
            color: "#2C2416",
          }}
        >
          {displayName}
        </h1>
        <p style={{ margin: "0 0 12px", color: "#8A7F6E", fontSize: 15 }}>
          @{username}
        </p>
        {bio ? (
          <p
            style={{
              margin: "0 0 20px",
              color: "#2C2416",
              fontSize: 14,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
            }}
          >
            {bio.slice(0, 200)}
          </p>
        ) : null}
        <a
          href={profilePath}
          style={{
            display: "inline-block",
            background: "#C9A86C",
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            padding: "12px 28px",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          Open profile
        </a>
        <p style={{ marginTop: 16, fontSize: 12, color: "#8A7F6E" }}>
          Lumen · Socialite
          <br />
          <span style={{ wordBreak: "break-all" }}>
            {SITE}
            {profilePath}
          </span>
        </p>
      </div>
    </main>
  );
}
