"use client";

import { Search, MoreHorizontal } from "lucide-react";
import { trends, whoToFollow } from "@/lib/mock-data";

export default function RightSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[350px] flex-col gap-4 overflow-y-auto px-6 py-3 lg:flex">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search Lumen"
          className="w-full rounded-full border border-transparent bg-frost py-3 pl-12 pr-4 text-[15px] text-charcoal placeholder:text-muted focus:border-gold-soft focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold-soft"
        />
      </div>

      {/* Trends */}
      <div className="overflow-hidden rounded-2xl border border-border bg-pearl-soft">
        <h2 className="px-4 py-3 text-xl font-extrabold text-charcoal">
          Trends for you
        </h2>
        {trends.map((trend, i) => (
          <button
            key={i}
            className="flex w-full items-start justify-between px-4 py-3 text-left transition hover:bg-champagne/30"
          >
            <div>
              <div className="text-[13px] text-muted">{trend.category}</div>
              <div className="text-[15px] font-bold text-charcoal">
                {trend.title}
              </div>
              <div className="text-[13px] text-muted">{trend.posts}</div>
            </div>
            <MoreHorizontal className="mt-1 h-4 w-4 text-muted" />
          </button>
        ))}
        <button className="w-full px-4 py-3 text-left text-[15px] text-gold-deep transition hover:bg-champagne/30">
          Show more
        </button>
      </div>

      {/* Who to follow */}
      <div className="overflow-hidden rounded-2xl border border-border bg-pearl-soft">
        <h2 className="px-4 py-3 text-xl font-extrabold text-charcoal">
          Who to follow
        </h2>
        {whoToFollow.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-champagne/30"
          >
            <img
              src={user.avatar}
              alt={user.displayName}
              className="h-10 w-10 rounded-full border border-border bg-champagne"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold text-charcoal">
                {user.displayName}
              </div>
              <div className="truncate text-[13px] text-muted">
                @{user.username}
              </div>
            </div>
            <button className="rounded-full bg-charcoal px-4 py-1.5 text-[14px] font-bold text-pearl transition hover:bg-charcoal-soft">
              Follow
            </button>
          </div>
        ))}
        <button className="w-full px-4 py-3 text-left text-[15px] text-gold-deep transition hover:bg-champagne/30">
          Show more
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 text-[13px] leading-4 text-muted">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="#" className="hover:underline">
            Terms of Service
          </a>
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline">
            Cookie Policy
          </a>
          <a href="#" className="hover:underline">
            Accessibility
          </a>
        </div>
        <div className="mt-2 text-[12px] text-muted-light">
          © 2026 @Lumen social media platform. All rights reserved.
        </div>
      </div>
    </aside>
  );
}
