"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  Bell,
  Mail,
  User,
  LogOut,
  Bookmark,
  Music,
  ShieldCheck,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getCurrentProfile, signOut } from "@/lib/auth";
import { getUnreadSecretCount } from "@/lib/posts";
import { useI18n } from "@/lib/i18n";

type NavItem = {
  icon: typeof Home;
  label: string;
  href: string;
};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [profileHref, setProfileHref] = useState("/login");
  const [signedIn, setSignedIn] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [secretCount, setSecretCount] = useState(0);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (p?.username) {
        setProfileHref(`/${p.username}`);
        setSignedIn(true);
        if (p?.id) getUnreadSecretCount(p.id).then((n) => setSecretCount(n || 0));
        setAccountType((p as any).account_type || "personal");
      } else {
        setProfileHref("/login");
        setSignedIn(false);
        setAccountType(null);
      }
    });
  }, [pathname]);

  const row1: NavItem[] = [
    { icon: Home, label: t("home"), href: "/" },
    { icon: Search, label: t("explore"), href: "/explore" },
    { icon: Bell, badge: true as any, label: t("alerts"), href: "/notifications" },
    { icon: Mail, label: t("inbox"), href: "/messages" },
    { icon: User, label: t("profile"), href: profileHref },
  ];

  const row2: NavItem[] = [
    { icon: Bookmark, label: t("saved"), href: "/bookmarks" },
    { icon: Music, label: t("tunes"), href: "/music" },
    { icon: ShieldCheck, label: t("verify"), href: "/verify" },
    { icon: Users, label: t("social"), href: "/explore" },
    { icon: MoreHorizontal, label: t("more"), href: "/more" },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  async function handleSignOut() {
    await signOut();
    setSignedIn(false);
    router.push("/login");
  }

  function NavButton({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const active = isActive(item.href);
    const showSecret =
      item.href === "/notifications" && secretCount > 0;
    return (
      <Link
        href={item.href}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1",
          active ? "text-gold-deep" : "text-muted"
        )}
      >
        <span className="relative">
          <Icon
            className={cn("h-[18px] w-[18px]", active && "stroke-[2.5]")}
            strokeWidth={active ? 2.5 : 1.75}
          />
          {showSecret && (
            <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[9px] font-bold text-white">
              {secretCount}
            </span>
          )}
        </span>
        <span className="max-w-full truncate text-[9px] font-medium leading-none">
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-pearl/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
      {/* Top row — primary */}
      <div className="flex h-11 items-stretch justify-around px-1">
        {row1.map((item) => (
          <NavButton key={item.label} item={item} />
        ))}
      </div>
      {/* Divider */}
      <div className="mx-3 h-px bg-border/70" />
      {/* Bottom row — more menu */}
      <div className="flex h-11 items-stretch justify-around px-1">
        {row2.map((item) => (
          <NavButton key={item.label} item={item} />
        ))}
        {signedIn ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-muted transition hover:text-rose-600"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-[9px] font-medium leading-none">{t("out")}</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-muted"
          >
            <User className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-[9px] font-medium leading-none">In</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
