"use client";

import { Home, Search, Bell, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: Home, label: "Home", active: true },
  { icon: Search, label: "Explore" },
  { icon: Bell, label: "Alerts" },
  { icon: Mail, label: "Messages" },
  { icon: User, label: "Profile" },
];

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border bg-pearl/95 backdrop-blur-md sm:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1",
              item.active ? "text-gold-deep" : "text-muted"
            )}
          >
            <Icon
              className={cn("h-6 w-6", item.active && "stroke-[2.5]")}
              strokeWidth={item.active ? 2.5 : 1.8}
            />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
