"use client";

import { FileText, LogOut, Menu, Settings, Unplug } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "cn";

type SidebarUser = {
  name: string;
  email: string;
  connected: boolean;
};

const links = [
  { href: "/app", label: "Proposals", icon: FileText },
  { href: "/app/connect", label: "Connect Claude", icon: Unplug },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ user }: { user: SidebarUser }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-200 bg-white lg:flex">
        <SidebarBody user={user} connected={user.connected} />
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <Logo />
        <MobileNav user={user} connected={user.connected} />
      </header>
    </>
  );
}

function MobileNav({ user, connected }: { user: SidebarUser; connected: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Open menu">
            <Menu />
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 p-0">
        <SidebarBody user={user} connected={connected} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function SidebarBody({
  user,
  connected,
  onNavigate,
}: {
  user: SidebarUser;
  connected: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map((link) => {
          const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                active && "bg-indigo-50 text-indigo-700",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="flex-1">{link.label}</span>
              {link.href === "/app/connect" ? (
                <span
                  className={cn("size-2 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500")}
                  aria-label={connected ? "Claude connected in the last 24 hours" : "Claude not connected recently"}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-4">
        <p className="truncate text-sm font-medium text-zinc-950">{user.name}</p>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
        <form action={logout} className="mt-3">
          <Button type="submit" variant="outline" className="w-full justify-start">
            <LogOut className="size-4" />
            Log out
          </Button>
        </form>
      </div>
    </div>
  );
}
