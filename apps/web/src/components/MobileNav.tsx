"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "⊞", label: "Главная" },
  { href: "/analytics", icon: "◷", label: "Время" },
  { href: "/subscriptions", icon: "◈", label: "Подписки" },
  { href: "/youtube", icon: "▷", label: "YouTube" },
  { href: "/twitch", icon: "◉", label: "Twitch" },
  { href: "/settings", icon: "⚙", label: "Настройки" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-zinc-800 bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] leading-none transition ${
              active
                ? "text-accent-light"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <span className="text-[15px] leading-none">{item.icon}</span>
            <span className="font-mono uppercase tracking-wider">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
