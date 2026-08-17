"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  LogIn,
  Bookmark,
  User,
  Bell,
  Mail,
  Search,
  ShieldCheck,
  Music,
  FileText,
  LifeBuoy,
  Scale,
} from "lucide-react";
import { getCurrentProfile, signOut } from "@/lib/auth";
import { updateUserInterests, getProfilesByInterests } from "@/lib/posts";
import { useI18n, LANGUAGE_OPTIONS, type LangCode } from "@/lib/i18n";
import type { Profile } from "@/types";
import VerifiedBadge from "@/components/VerifiedBadge";
import SpecialStars from "@/components/SpecialStars";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

/** Main categories + most popular subcategories (Comedy first) */
const INTEREST_CATEGORIES: { name: string; subs: string[] }[] = [
  {
    name: "Comedy",
    subs: [
      "Stand-up",
      "Improv",
      "Sketch",
      "Sitcoms",
      "Dark comedy",
      "Roasts",
      "Specials",
      "Memes",
      "Satire",
      "Pranks",
    ],
  },
  {
    name: "Music",
    subs: [
      "Pop",
      "Hip-Hop / Rap",
      "R&B",
      "Rock",
      "Country",
      "EDM",
      "Latin",
      "Jazz",
      "K-Pop",
      "Classical",
      "Indie",
    ],
  },
  {
    name: "Sports",
    subs: [
      "NFL",
      "NBA",
      "Soccer",
      "MLB",
      "UFC / MMA",
      "Tennis",
      "Golf",
      "F1",
      "Boxing",
      "Olympics",
      "College sports",
    ],
  },
  {
    name: "Business",
    subs: [
      "Startups",
      "Marketing",
      "Finance",
      "Entrepreneurship",
      "Investing",
      "E-commerce",
      "Sales",
      "Leadership",
      "Small business",
    ],
  },
  {
    name: "Technology",
    subs: [
      "AI",
      "Software",
      "Gadgets",
      "Coding",
      "Cybersecurity",
      "Apps",
      "Cloud",
      "Robotics",
      "Space tech",
    ],
  },
  {
    name: "Fashion",
    subs: [
      "Streetwear",
      "Luxury",
      "Beauty",
      "Sneakers",
      "Runway",
      "Accessories",
      "Makeup",
      "Skincare",
      "Jewelry",
    ],
  },
  {
    name: "Food",
    subs: [
      "Restaurants",
      "Cooking",
      "Baking",
      "Wine",
      "Coffee",
      "Vegan",
      "BBQ",
      "Street food",
      "Desserts",
      "Cocktails",
    ],
  },
  {
    name: "Travel",
    subs: [
      "Beach",
      "Adventure",
      "Luxury travel",
      "Road trips",
      "City breaks",
      "Hotels",
      "Europe",
      "Asia",
      "USA",
      "Cruises",
    ],
  },
  {
    name: "Art",
    subs: [
      "Painting",
      "Photography",
      "Design",
      "Sculpture",
      "Digital art",
      "Galleries",
      "Illustration",
      "Street art",
    ],
  },
  {
    name: "Fitness",
    subs: [
      "Gym",
      "Yoga",
      "Running",
      "CrossFit",
      "Nutrition",
      "Wellness",
      "Weightlifting",
      "Pilates",
      "Cycling",
    ],
  },
  {
    name: "Gaming",
    subs: [
      "Console",
      "PC",
      "Esports",
      "Mobile",
      "Streaming",
      "Indie games",
      "PlayStation",
      "Xbox",
      "Nintendo",
    ],
  },
  {
    name: "Real estate",
    subs: [
      "Investing",
      "Luxury homes",
      "Commercial",
      "Flipping",
      "Rentals",
      "Mortgages",
      "Development",
    ],
  },
  {
    name: "Crypto",
    subs: [
      "Bitcoin",
      "Ethereum",
      "NFTs",
      "DeFi",
      "Trading",
      "Web3",
      "Altcoins",
      "Blockchain",
    ],
  },
  {
    name: "Film",
    subs: [
      "Movies",
      "TV series",
      "Documentaries",
      "Indie",
      "Hollywood",
      "Animation",
      "Netflix",
      "Awards",
    ],
  },
  {
    name: "Education",
    subs: [
      "Online learning",
      "Languages",
      "Science",
      "History",
      "Books",
      "University",
      "Tutoring",
      "STEM",
    ],
  },
  {
    name: "Health",
    subs: [
      "Mental health",
      "Wellness",
      "Medicine",
      "Sleep",
      "Nutrition",
      "Therapy",
      "Longevity",
    ],
  },
  {
    name: "Lifestyle",
    subs: [
      "Home",
      "Parenting",
      "Pets",
      "Relationships",
      "Self-care",
      "Minimalism",
      "Luxury lifestyle",
    ],
  },
  {
    name: "News",
    subs: [
      "Politics",
      "World news",
      "Local",
      "Economy",
      "Science news",
      "Celebrity",
    ],
  },
];

export default function MorePage() {
  const { lang, setLang, t } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState<string[]>([]);
  const [savingInt, setSavingInt] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      setProfile(p);
      if (p) {
        const ints = ((p as any).interests || []) as string[];
        setInterests(ints);
        if (ints.length) {
          getProfilesByInterests(ints, 12).then(({ data }) =>
            setMatches((data || []).filter((x: any) => x.id !== p.id))
          );
        }
      }
      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    await signOut();
    setProfile(null);
    router.push("/login");
  }

  const accountType = ((profile as any)?.account_type || "personal") as string;
  const uname = (profile?.username || "").toLowerCase();
  const isFounder = uname === "thevip" || uname === "kendall.vip";
  const isMusician = accountType === "musician" || isFounder;
  const isBusiness = accountType === "business";

  const verifyLabel = isFounder
    ? "Verified free for infinity · @thevip & @kendall.vip"
    : isBusiness
    ? "Verify Business account ($168/yr)"
    : accountType === "musician"
    ? "Verify Musician account ($168/yr)"
    : "Get verified ($60/yr)";

  const links = [
    { icon: ShieldCheck, label: verifyLabel, href: "/verify" },
    ...(isBusiness
      ? [{ icon: ShieldCheck, label: "Business verification $168/yr", href: "/verify" }]
      : []),
    ...(isMusician
      ? [{ icon: Music, label: "Music · samples & sales", href: "/music" }]
      : [{ icon: Music, label: "Music store (listen / buy)", href: "/music" }]),
    { icon: Search, label: "Explore", href: "/explore" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Mail, label: "Messages", href: "/messages" },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    {
      icon: User,
      label: "Profile",
      href: profile?.username ? `/${profile.username}` : "/login",
    },
    { icon: FileText, label: "Privacy Policy", href: "/privacy" },
    { icon: Scale, label: "Terms of Service", href: "/terms" },
    { icon: LifeBuoy, label: "Support", href: "/support" },
  ];
  // de-dupe verify if business double
  const seen = new Set<string>();
  const uniqueLinks = links.filter((l) => {
    const k = l.label + l.href;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 border-border pb-16 sm:border-x sm:pb-0">
        <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40"
            >
              <ArrowLeft className="h-5 w-5 text-charcoal" />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">{t("more")}</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : (
          <div className="px-4 py-4">
            {profile && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-pearl-soft p-4">
                <img
                  src={
                    profile.avatar_url ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.id}`
                  }
                  alt={profile.display_name}
                  className="h-14 w-14 flex-shrink-0 rounded-full border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="truncate font-bold text-charcoal">
                      {profile.display_name}
                    </span>
                    {(profile.verified ||
                      ["thevip", "kendall.vip"].includes(
                        (profile.username || "").toLowerCase()
                      )) && (
                      <VerifiedBadge
                        username={profile.username}
                        gender={(profile as any).gender}
                      />
                    )}
                  </div>
                  <SpecialStars username={profile.username || ""} />
                  <div className="text-[14px] text-muted">@{profile.username}</div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-border">
              
            {/* Language — label always English */}
            <div className="mb-6 rounded-2xl border border-border bg-white p-4">
              <h2 className="text-[15px] font-bold text-charcoal">Language</h2>
              <p className="mt-1 text-[12px] text-muted">
                Choose your language. Everything updates automatically. The word &quot;Language&quot; stays in English.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setLang(opt.code as LangCode)}
                    className={`rounded-full px-3 py-2 text-[12px] font-semibold transition ${
                      lang === opt.code
                        ? "bg-gold text-white"
                        : "border border-border bg-pearl text-charcoal hover:bg-champagne/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {profile && (
              <div className="mb-6 rounded-2xl border border-border bg-white p-4">
                <h2 className="text-[15px] font-bold text-charcoal">{t("interests")}</h2>
                <p className="mt-1 text-[12px] text-muted">
                  Pick main categories and popular subcategories (Comedy, Music, Sports, and more).
                  Your home feed prioritizes enlightenments that match what you select.
                </p>
                <div className="mt-3 space-y-4">
                  {INTEREST_CATEGORIES.map((cat) => {
                    const catOn = interests.includes(cat.name);
                    return (
                      <div key={cat.name}>
                        <button
                          type="button"
                          onClick={() =>
                            setInterests((prev) => {
                              if (catOn) {
                                // remove category + all its subs
                                const subSet = new Set(cat.subs.map((s) => `${cat.name} · ${s}`));
                                return prev.filter(
                                  (x) => x !== cat.name && !subSet.has(x)
                                );
                              }
                              return [...prev, cat.name];
                            })
                          }
                          className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition ${
                            catOn
                              ? "bg-gold text-white"
                              : "border border-border bg-pearl text-charcoal hover:bg-champagne/40"
                          }`}
                        >
                          {cat.name}
                        </button>
                        <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                          {cat.subs.map((sub) => {
                            const key = `${cat.name} · ${sub}`;
                            const on = interests.includes(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  setInterests((prev) => {
                                    if (on) return prev.filter((x) => x !== key);
                                    // also ensure parent category is selected
                                    const next = prev.includes(cat.name)
                                      ? prev
                                      : [...prev, cat.name];
                                    return [...next, key];
                                  })
                                }
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                                  on
                                    ? "bg-gold/90 text-white"
                                    : "border border-border/80 bg-pearl/80 text-charcoal/80 hover:bg-champagne/40"
                                }`}
                              >
                                {sub}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={savingInt}
                  onClick={async () => {
                    if (!profile) return;
                    setSavingInt(true);
                    const { data, error } = await updateUserInterests(profile.id, interests);
                    setSavingInt(false);
                    if (error) {
                      alert(error.message);
                      return;
                    }
                    if (data) setProfile(data);
                    const { data: m } = await getProfilesByInterests(interests, 12);
                    setMatches((m || []).filter((x: any) => x.id !== profile.id));
                  }}
                  className="mt-3 rounded-full bg-charcoal px-4 py-1.5 text-[13px] font-bold text-pearl hover:bg-charcoal-soft disabled:opacity-50"
                >
                  {savingInt ? "Saving…" : "Save interests"}
                </button>
                {matches.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-[12px] font-semibold text-muted">Matched for you</p>
                    <div className="mt-2 space-y-2">
                      {matches.map((u) => (
                        <Link
                          key={u.id}
                          href={`/${u.username}`}
                          className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-champagne/40"
                        >
                          <img
                            src={
                              u.avatar_url ||
                              `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.id}`
                            }
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-bold text-charcoal">
                              {u.display_name}
                            </div>
                            <div className="truncate text-[11px] text-muted">
                              @{(u.username || "")}
                              {Array.isArray(u.interests)
                                ? " · " + u.interests.slice(0, 3).join(", ")
                                : ""}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {uniqueLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 transition hover:bg-champagne/30"
                  >
                    <Icon className="h-5 w-5 text-charcoal" />
                    <span className="text-[15px] font-medium text-charcoal">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6">
              {profile ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-[15px] font-bold text-rose-600 transition hover:bg-rose-100"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-3 text-[15px] font-bold text-white"
                >
                  <LogIn className="h-5 w-5" />
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
