export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

/** Full post time: time · weekday, month day, year  e.g. 3:42 PM · Sat, Aug 16, 2026 */
export function formatTime(date: string) {
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "now";
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const day = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${time} · ${day}`;
  } catch {
    return "now";
  }
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
}

export function normUser(u?: string | null): string {
  return String(u || "").replace(/^@/, "").trim().toLowerCase();
}

export const TAG_NIKOLAY = "TheVIP.Nikolay";
export const TAG_KENDALL = "TheVIP.Kendall";

export function isTheVipUsername(username?: string | null): boolean {
  const u = normUser(username);
  return u === "thevip" || u === "thevip.nikolay";
}

export function isKendallUsername(username?: string | null): boolean {
  const u = normUser(username);
  return u === "kendall.vip" || u === "thevip.kendall";
}

export function isFounderUsername(username?: string | null): boolean {
  return isTheVipUsername(username) || isKendallUsername(username);
}

export function usernameAliases(username?: string | null): string[] {
  if (isTheVipUsername(username)) return ["thevip", "TheVIP.Nikolay", "thevip.nikolay"];
  if (isKendallUsername(username)) return ["kendall.vip", "TheVIP.Kendall", "thevip.kendall"];
  const u = String(username || "").replace(/^@/, "").trim();
  return u ? [u] : [];
}

/** Hidden from the public. Only @TheVIP.Nikolay and the owner can see it. */
export const HIDDEN_PUBLIC_USERNAMES = ["kendall.vip", "thevip.kendall"];

export function isPubliclyHiddenUsername(username?: string | null): boolean {
  return isKendallUsername(username);
}

export function canSeeHiddenAccount(
  viewerUsername?: string | null,
  targetUsername?: string | null
): boolean {
  if (!isPubliclyHiddenUsername(targetUsername)) return true;
  return isTheVipUsername(viewerUsername) || isKendallUsername(viewerUsername);
}

/** Accounts that always show a verification badge (permanent). */
export function isForcedVerifiedUsername(username?: string | null): boolean {
  const u = normUser(username);
  if (!u) return false;
  if (isFounderUsername(u)) return true;
  const list = [
    "igorpiven",
    "mikeavramov",
    "mr.samsnuggles",
    "samsnuggles1",
    "mrsamsnuggles",
    "kennicktechnologies",
    "kennick",
    "kennicktechnologiesllc",
    "jaytowers69",
    "tireur",
    "berdychowski",
    "mskaceequinn",
    "justinhenrycomedy",
  ];
  return list.includes(u);
}

/** Special-tag accounts can use the secret message vault with each other */
export function isSpecialTagUsername(username?: string | null): boolean {
  const u = normUser(username);
  if (!u) return false;
  if (isFounderUsername(u)) return true;
  const list = [
    "kennicktechnologies",
    "kennick",
    "kennicktechnologiesllc",
    "mr.samsnuggles",
    "samsnuggles1",
    "mrsamsnuggles",
    "mikeavramov",
    "igorpiven",
  ];
  return list.includes(u);
}
