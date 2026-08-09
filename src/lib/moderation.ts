/**
 * Lumen content moderation — blocks hate, sexual, and violence content in enlightenments.
 * Uses local rules always; optionally OpenAI Moderation API if OPENAI_API_KEY is set (server).
 */

export type ModerationCategory = "hate" | "sexual" | "violence" | "other";

export type ModerationResult = {
  allowed: boolean;
  categories: ModerationCategory[];
  reason?: string;
};

const HATE = [
  "kill all",
  "gas the",
  "hate all",
  "racial slur",
  "nigger",
  "nigga",
  "kike",
  "spic",
  "chink",
  "faggot",
  "tranny",
  "white power",
  "heil hitler",
  "neonazi",
  "neo-nazi",
];

const SEXUAL = [
  "child porn",
  "childporn",
  "cp link",
  "underage sex",
  "teen sex tape",
  "onlyfans free leak",
  "nonconsensual",
  "revenge porn",
  "rape fantasy",
  "forced sex",
];

const VIOLENCE = [
  "i will kill you",
  "i'm going to kill",
  "im going to kill",
  "bomb the school",
  "shoot up",
  "mass shooting",
  "behead",
  "make a bomb",
  "how to kill",
  "hire a hitman",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchList(text: string, list: string[]): boolean {
  const n = normalize(text);
  return list.some((w) => n.includes(w));
}

/** Fast local scan — runs in the browser before post */
export function moderateContentLocal(content: string): ModerationResult {
  if (!content || !content.trim()) {
    return { allowed: false, categories: ["other"], reason: "Empty post" };
  }

  const categories: ModerationCategory[] = [];
  if (matchList(content, HATE)) categories.push("hate");
  if (matchList(content, SEXUAL)) categories.push("sexual");
  if (matchList(content, VIOLENCE)) categories.push("violence");

  if (categories.length) {
    return {
      allowed: false,
      categories,
      reason:
        "This enlightenment was blocked for content that may involve hate, sexual exploitation, or violence. Lumen · Socialite does not allow that.",
    };
  }

  return { allowed: true, categories: [] };
}

/**
 * Optional stronger check via OpenAI Moderations API (server-side only).
 * Set OPENAI_API_KEY in Vercel env to enable.
 */
export async function moderateContentAI(content: string): Promise<ModerationResult> {
  const local = moderateContentLocal(content);
  if (!local.allowed) return local;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return local;

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: content }),
    });
    if (!res.ok) return local;
    const json = await res.json();
    const r = json?.results?.[0];
    if (!r) return local;

    const cats: ModerationCategory[] = [];
    if (r.categories?.hate || r.categories?.["hate/threatening"]) cats.push("hate");
    if (r.categories?.sexual || r.categories?.["sexual/minors"]) cats.push("sexual");
    if (r.categories?.violence || r.categories?.["violence/graphic"]) cats.push("violence");

    if (r.flagged || cats.length) {
      return {
        allowed: false,
        categories: cats.length ? cats : ["other"],
        reason:
          "This enlightenment was blocked by safety review (hate, sexual, or violent content).",
      };
    }
  } catch {
    /* fall through to local allow */
  }

  return { allowed: true, categories: [] };
}
