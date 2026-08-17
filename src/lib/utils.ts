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


/** Accounts that always show a verification badge (permanent). */
export function isForcedVerifiedUsername(username?: string | null): boolean {
  const u = (username || "").toLowerCase().trim();
  if (!u) return false;
  const list = [
    "thevip",
    "kendall.vip",
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
  const u = (username || "").toLowerCase().trim();
  if (!u) return false;
  const list = [
    "thevip",
    "kendall.vip",
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
