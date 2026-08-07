import Link from "next/link";
import { SidebarLink } from "./SidebarLink";

const items = [
  { href: "/", icon: "⊞", title: "Главная" },
  { sep: true },
  { href: "/analytics", icon: "◷", title: "Экранное время" },
  { href: "/subscriptions", icon: "◈", title: "Подписки" },
  { href: "/youtube", icon: "▷", title: "YouTube" },
  { href: "/twitch", icon: "◉", title: "Twitch" },
  { sep: true },
  { href: "/settings", icon: "⚙", title: "Настройки", bottom: true },
];

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 z-20 hidden h-screen w-12 flex-col items-center gap-1 border-r border-zinc-800 bg-surface py-4 md:flex"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      {items.map((item, i) =>
        "sep" in item ? (
          <div key={`sep-${i}`} className="my-1 h-px w-[22px] bg-zinc-800" />
        ) : (
          <SidebarLink key={item.title} href={item.href} icon={item.icon} title={item.title} bottom={item.bottom} />
        )
      )}
    </aside>
  );
}
