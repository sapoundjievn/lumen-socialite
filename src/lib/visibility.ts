export const HIDDEN_USERNAMES = ["kendall.vip"];
export const VIEWER_CAN_SEE_HIDDEN = ["thevip", "kendall.vip"];

export function normUser(u?: string | null) {
  return String(u || "").replace(/^@/, "").trim().toLowerCase();
}

export function canSeeHiddenProfile(viewerUsername?: string | null) {
  return VIEWER_CAN_SEE_HIDDEN.includes(normUser(viewerUsername));
}

export function isHiddenUsername(username?: string | null) {
  return HIDDEN_USERNAMES.includes(normUser(username));
}

export function filterVisibleProfiles<T extends { username?: string | null }>(
  rows: T[] | null | undefined,
  viewerUsername?: string | null
) {
  const list = rows || [];
  if (canSeeHiddenProfile(viewerUsername)) return list;
  return list.filter((r) => !isHiddenUsername(r.username));
}
