"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bell, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/lib/auth";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [profileHref, setProfileHref] = useState("/login");

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (p?.username) setProfileHref(`/${p.username}`);
    });
  }, []);

  const items = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Explore", href: "#" },
    { icon: Bell, label: "Alerts", href: "/notifications" },
    { icon: Mail, label: "Messages", href: "/messages" },
    { icon: User, label: "Profile", href: profileHref },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border bg-pearl/95 backdrop-blur-md sm:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href) && item.href !== "#";
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1",
              active ? "text-gold-deep" : "text-muted"
            )}
          >
            <Icon
              className={cn("h-6 w-6", active && "stroke-[2.5]")}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
