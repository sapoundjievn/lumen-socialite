export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatTime(date: string) {
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec}s`;
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    "jayjaytorres",
    "jayjay.torres",
    "jay_jay_torres",
    "jayjay",
    "jay.jay.torres",
    "jamesdesermeaux",
    "james.desermeaux",
    "james_desermeaux",
    "desermeaux",
    "jdesermeaux",
  ];
  return list.includes(u);
}
