"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listMyBlocks, toggleBlock } from "@/lib/safety";

export default function BlockedList() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const data = await listMyBlocks();
    setRows(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function unblock(id: string) {
    setBusy(id);
    await toggleBlock(id);
    await load();
    setBusy(null);
  }

  return (
    <section className="mt-6 border-t border-border pt-4">
      <h2 className="mb-3 text-[15px] font-semibold text-charcoal">Blocked accounts</h2>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted">No blocked accounts.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const prof = r.profiles || {};
            const un = String(prof.username || r.blocked_id || "").replace(/^@/, "");
            return (
              <li key={r.blocked_id} className="flex items-center justify-between gap-3">
                <Link href={"/" + un} className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{prof.display_name || un}</div>
                  <div className="truncate text-[12px] text-muted">@{un}</div>
                </Link>
                <button
                  type="button"
                  disabled={busy === r.blocked_id}
                  onClick={() => unblock(r.blocked_id)}
                  className="rounded-full border border-border px-3 py-1 text-[12px]"
                >
                  Unblock
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
