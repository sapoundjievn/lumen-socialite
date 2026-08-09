/**
 * Lumen content moderation — hate, sexual, violence
 */

export type ModerationCategory = "hate" | "sexual" | "violence" | "other";

export type ModerationResult = {
  allowed: boolean;
  categories: ModerationCategory[];
  reason?: string;
};

const BLOCK_REASON =
  "This enlightenment was blocked. Lumen · Socialite does not allow hate, sexual, or violent content.";

const HATE = [
  "nigger", "niggers", "nigga", "niggas", "kike", "spic", "chink", "gook", "wetback",
  "faggot", "faggots", "tranny", "trannies", "retard", "retards", "retarded",
  "white power", "heil hitler", "neo nazi", "neonazi", "neo-nazi", "kkk",
  "kill all jews", "kill all blacks", "kill all muslims", "gas the jews",
  "racial cleansing", "ethnic cleansing", "hate crime",
];

const SEXUAL = [
  "child porn", "childporn", "child pornography", "cp video", "underage sex",
  "teen porn", "loli", "lolita porn", "revenge porn", "nonconsensual porn",
  "rape her", "rape you", "force sex", "forced sex", "sexual assault",
  "onlyfans leak", "nudes of minors", "jailbait",
  // explicit spam-style
  "suck my dick", "eat my pussy", "send nudes now", "hookers near me",
];

const VIOLENCE = [
  "i will kill you", "i'll kill you", "im going to kill you", "i'm going to kill you",
  "going to shoot you", "shoot up the", "bomb the school", "bomb the church",
  "make a bomb", "build a bomb", "mass shooting", "hire a hitman", "hire a killer",
  "i will murder", "i'll murder", "behead you", "slit your throat",
  "rape and kill", "torture you",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchList(text: string, list: string[]): string | null {
  const n = normalize(text);
  for (const w of list) {
    if (n.includes(w)) return w;
  }
  // also check without spaces for spaced-out evasion: k i l l
  const compact = n.replace(/\s/g, "");
  for (const w of list) {
    if (compact.includes(w.replace(/\s/g, ""))) return w;
  }
  return null;
}

export function moderateContentLocal(content: string): ModerationResult {
  if (!content || !content.trim()) {
    return { allowed: true, categories: [] };
  }

  const categories: ModerationCategory[] = [];
  if (matchList(content, HATE)) categories.push("hate");
  if (matchList(content, SEXUAL)) categories.push("sexual");
  if (matchList(content, VIOLENCE)) categories.push("violence");

  if (categories.length) {
    return { allowed: false, categories, reason: BLOCK_REASON };
  }
  return { allowed: true, categories: [] };
}

/** Client or server: local + optional /api/moderate (OpenAI) */
export async function moderateContentFull(content: string): Promise<ModerationResult> {
  const local = moderateContentLocal(content);
  if (!local.allowed) return local;

  try {
    const res = await fetch("/api/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return local;
    const json = await res.json();
    if (json && json.allowed === false) {
      return {
        allowed: false,
        categories: json.categories || ["other"],
        reason: json.reason || BLOCK_REASON,
      };
    }
  } catch {
    /* network — keep local allow */
  }
  return { allowed: true, categories: [] };
}
