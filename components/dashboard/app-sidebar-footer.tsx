"use client";

import Image from "next/image";
import { RiUserLine, RiLogoutBoxRLine, RiSettings3Line, RiPaletteLine } from "@remixicon/react";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
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
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={user.name}
                      className="size-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                      <RiUserLine className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{user?.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="cursor-pointer"
                >
                  <RiSettings3Line className="size-4" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <RiPaletteLine className="size-4" />
                    Tema
                  </span>
                  <ModeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <RiLogoutBoxRLine className="size-4" />
                  Keluar
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