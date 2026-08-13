import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://lumen-socialite.vercel.app";
const LOGO = `${SITE}/logo-official.jpg`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iswajdlwvxyichfbglyf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_Sj-mESPCrjEsPqKOprW3WA_Xvpl6yM8"
);

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }> | { username: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const username = (resolved.username || "").trim();
  const path = `/${username}`;
  const url = `${SITE}${path}`;

  let displayName = username;
  let bio = "Profile on Lumen · Socialite";
  let image = LOGO;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, bio, avatar_url, username")
      .ilike("username", username)
      .maybeSingle();

    if (data) {
      displayName = data.display_name || data.username || username;
      if (data.bio && String(data.bio).trim()) {
        bio = String(data.bio).trim().slice(0, 160);
      } else {
        bio = `@${data.username || username} on Lumen · Socialite`;
      }
      // Keep site logo for Facebook/Messenger — external avatars often fail their fetch
      image = LOGO;
    }
  } catch {
    /* crawlers still get basic tags */
  }

  const title = `${displayName} (@${username}) · Lumen · Socialite`;

  return {
    title,
    description: bio,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description: bio,
      siteName: "Lumen · Socialite",
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: displayName,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description: bio,
      images: [image],
    },
    other: {
      "og:url": url,
    },
  };
}

export default function UsernameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
