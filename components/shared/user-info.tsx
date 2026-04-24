"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiLogoutBoxRLine, RiUserLine, RiSettings3Line, RiPaletteLine, RiArrowRightSLine } from "@remixicon/react";
import { ModeToggle } from "@/components/shared/theme-toggle";
import { UserSettings } from "@/components/ui/user-settings";
import { useState } from "react";

export function UserInfo() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isPending) {
    return (
      <div className="relative bg-gradient-to-br from-primary/5 via-card to-primary/[0.02] rounded-xl border border-border/50 overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-80" />
        <div className="flex items-center gap-3 pl-3 pr-2 py-2.5">
          <div className="size-9 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        No user found
      </div>
    );
  }

  const { user } = session;

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="group relative w-auto max-w-[11rem] cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-primary/[0.02] transition-all duration-300 hover:border-border/80 hover:shadow-sm sm:w-64 sm:max-w-none">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-80 transition-all duration-300 group-hover:w-1.5 group-hover:opacity-100" />
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl transition-all duration-300 group-hover:opacity-60" />
            <div className="relative z-10 flex items-center gap-2 py-1.5 pl-2 pr-2 sm:gap-3 sm:py-2.5 sm:pl-3">
              <Avatar className="size-8 rounded-xl border border-border/30 transition-all duration-300 group-hover:scale-105 sm:size-9">
                {user.image ? <AvatarImage src={user.image} alt={user.name} className="rounded-xl" /> : null}
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-muted to-muted/50">
                  <RiUserLine className="size-4.5 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 flex-1 flex-col sm:flex">
                <span className="text-sm font-semibold truncate transition-colors duration-300 group-hover:text-foreground/90">{user.name}</span>
                <span className="text-xs text-muted-foreground/70 capitalize">{user.role}</span>
              </div>
              <span className="max-w-20 truncate text-xs font-semibold sm:hidden">{user.name}</span>
              <RiArrowRightSLine className="hidden size-4 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-muted-foreground sm:block" />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setSettingsOpen(true)}
            className="cursor-pointer gap-2"
          >
            <div className="size-6 rounded-md bg-muted/50 flex items-center justify-center">
              <RiSettings3Line className="size-3.5" />
            </div>
            <span>Pengaturan</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-muted/50 flex items-center justify-center">
                <RiPaletteLine className="size-3.5" />
              </div>
              <span>Tema</span>
            </div>
            <ModeToggle />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive gap-2"
          >
            <div className="size-6 rounded-md bg-destructive/10 flex items-center justify-center">
              <RiLogoutBoxRLine className="size-3.5 text-destructive" />
            </div>
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UserSettings open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
    </>
  );
}
