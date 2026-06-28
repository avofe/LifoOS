"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarLink({ href, icon, title, bottom }: { href: string; icon: string; title: string; bottom?: boolean }) {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      title={title}
      className={`flex h-[34px] w-[34px] items-center justify-center rounded-lg border text-[15px] transition
        ${pathname === href
          ? "border-zinc-700/50 bg-accent-bg text-accent-light"
          : "border-transparent text-zinc-500 hover:bg-surface-2 hover:text-zinc-200"
        }
        ${bottom ? "mt-auto" : ""}
        relative`}
    >
      {icon}
    </Link>
  );
}
