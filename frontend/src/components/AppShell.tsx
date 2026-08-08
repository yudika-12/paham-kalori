"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const TAB_ITEMS = [
  {
    href: "/dashboard",
    label: "Beranda",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="m3 11 9-7 9 7" />
        <path d="M5 9.5V21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
        <path d="M9 22v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "Statistik",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 3v18h18" />
        <path d="M7 15v-3M12 15V8M17 15v-6" />
      </svg>
    ),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href === "/dashboard" && pathname === "/");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#F4FAF6]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[24rem] w-[24rem] rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-[22rem] w-[22rem] rounded-full bg-teal-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[20rem] w-[20rem] rounded-full bg-emerald-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <div className="flex-1 pb-[5.5rem]">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto flex w-full max-w-lg items-end justify-between border-t border-slate-200/70 bg-white/95 px-5 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1 backdrop-blur shadow-[0_-6px_24px_rgba(15,23,42,0.06)]">
          <BottomTab item={TAB_ITEMS[0]} active={isActive(TAB_ITEMS[0].href)} />
          <Link
            href="/scan"
            aria-label="Tambah makanan"
            className="flex w-[60px] shrink-0 flex-col items-center gap-0 text-[#2E7D32]"
          >
            <span className="flex h-7 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="text-[10px] font-bold text-slate-400">Tambah</span>
          </Link>
          <BottomTab item={TAB_ITEMS[1]} active={isActive(TAB_ITEMS[1].href)} />
          <BottomTab item={TAB_ITEMS[2]} active={isActive(TAB_ITEMS[2].href)} />
        </div>
      </nav>
    </div>
  );
}

function BottomTab({
  item,
  active,
}: {
  item: (typeof TAB_ITEMS)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`flex w-[60px] flex-col items-center gap-0 transition ${
        active ? "text-[#2E7D32]" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
          active ? "bg-emerald-100" : ""
        }`}
      >
        {item.icon}
      </span>
      <span className="text-[10px] font-bold">{item.label}</span>
    </Link>
  );
}
