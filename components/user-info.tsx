"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RiLogoutBoxRLine, RiUserLine, RiSettings3Line, RiPaletteLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/theme-toggle";

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default";
    case "staff":
      return "secondary";
    default:
      return "outline";
  }
}

export function UserInfo() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="size-8 animate-pulse rounded-full bg-muted" />
        <div className="flex flex-col gap-1">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-2 w-12 animate-pulse rounded bg-muted" />
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-3 py-2 outline-none focus:bg-accent hover:bg-accent transition-colors">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <div className="size-8 rounded-full bg-muted flex items-center justify-center">
            <RiUserLine className="size-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{user.name}</span>
          <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
            {user.role}
          </Badge>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          className="cursor-pointer"
        >
          <RiSettings3Line />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer flex items-center justify-between">
          <span className="flex items-center gap-2">
            <RiPaletteLine />
            Theme
          </span>
          <ModeToggle />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            localStorage.removeItem("onboard_completed");
            signOut();
          }}
          className="cursor-pointer"
        >
          <RiLogoutBoxRLine />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}