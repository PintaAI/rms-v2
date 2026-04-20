"use client";

import Image from "next/image";
import { RiUserLine, RiLogoutBoxRLine, RiSettings3Line, RiPaletteLine, RiArrowRightSLine } from "@remixicon/react";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/components/auth/auth-provider";
import { UserSettings } from "@/components/ui/user-settings";
import { useState } from "react";

export function AppSidebarFooter() {
  const router = useRouter();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => {
    localStorage.removeItem("onboard_completed");
    await signOut();
    router.push("/auth");
  };

  return (
    <>
      <SidebarFooter className="p-2 mt-auto bg-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative bg-gradient-to-br from-primary/5 via-sidebar to-primary/[0.02] rounded-xl border border-border/50 overflow-hidden group transition-all duration-300 hover:border-border/80 hover:shadow-sm">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-80 transition-all duration-300 group-hover:w-1.5 group-hover:opacity-100" />
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl transition-all duration-300 group-hover:opacity-60" />
                  <div className="flex items-center gap-3 pl-3 pr-2 py-2.5 relative z-10">
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={36}
                        height={36}
                        className="size-9 rounded-xl object-cover border border-border/30 transition-all duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="size-9 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border border-border/30 transition-all duration-300 group-hover:scale-105">
                        <RiUserLine className="size-4.5 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-sm font-semibold truncate transition-colors duration-300 group-hover:text-foreground/90">{user?.name}</span>
                      <span className="text-xs text-muted-foreground/70 capitalize">{user?.role}</span>
                    </div>
                    <RiArrowRightSLine className="size-4 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <UserSettings open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
    </>
  );
}