"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "⊞", label: "Главная" },
  { href: "/day", icon: "☐", label: "День" },
  { href: "/analytics", icon: "◷", label: "Время" },
  { href: "/subscriptions", icon: "◈", label: "Платежи" },
  { href: "/youtube", icon: "▷", label: "Ютуб" },
  { href: "/twitch", icon: "◉", label: "Твич" },
  { href: "/settings", icon: "⚙", label: "Настройки" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 items-stretch border-t border-zinc-800 bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 py-2 text-[9px] leading-none ${
              active
                ? "text-accent-light"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <span className="text-[15px] leading-none">{item.icon}</span>
            <span className="whitespace-nowrap font-mono uppercase">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
