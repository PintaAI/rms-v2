"use client";

import { useTransition, useEffect, useState } from "react";
import Image from "next/image";
import { RiStore2Line, RiArrowDownSLine, RiLoader4Line } from "@remixicon/react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

interface AppSidebarHeaderProps {
  tokoid: string;
  userRole: string;
  tokoList?: { id: string; name: string; logoUrl?: string | null }[];
}

export function AppSidebarHeader({
  tokoid,
  userRole,
  tokoList,
}: AppSidebarHeaderProps) {
  const router = useRouter();
  const { isTokoLoading } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const currentToko = tokoList?.find((t) => t.id === tokoid);
  const canSwitchToko = userRole === "admin" && tokoList && tokoList.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTokoSwitch = (newTokoId: string) => {
    startTransition(() => {
      router.push(`/${newTokoId}/${userRole}`);
    });
  };

  const TokoIcon = ({ logoUrl, name }: { logoUrl?: string | null; name: string }) => {
    if (logoUrl) {
      return (
        <Image
          src={logoUrl}
          alt={name}
          width={32}
          height={32}
          className="size-8 rounded object-cover border bg-muted p-0.5"
        />
      );
    }
    return (
      <div className="size-8 rounded border bg-muted p-0.5 flex items-center justify-center">
        <RiStore2Line className="size-6" />
      </div>
    );
  };

  const showLoading = !mounted || isTokoLoading;

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          {showLoading ? (
            <SidebarMenuButton disabled>
              <Skeleton className="size-8 rounded" />
              <Skeleton className="h-4 w-24" />
            </SidebarMenuButton>
          ) : canSwitchToko ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  {isPending ? (
                    <RiLoader4Line className="size-4 animate-spin" />
                  ) : (
                    <TokoIcon logoUrl={currentToko?.logoUrl} name={currentToko?.name || "Toko"} />
                  )}
                  <span>{currentToko?.name || "Pilih Toko"}</span>
                  <RiArrowDownSLine className="size-4 ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {tokoList?.map((toko) => (
                  <DropdownMenuItem
                    key={toko.id}
                    onClick={() => handleTokoSwitch(toko.id)}
                    className={toko.id === tokoid ? "bg-muted" : ""}
                    disabled={isPending}
                  >
                    <TokoIcon logoUrl={toko.logoUrl} name={toko.name} />
                    <span className="ml-2">{toko.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SidebarMenuButton>
              <TokoIcon logoUrl={currentToko?.logoUrl} name={currentToko?.name || "Toko"} />
              <span>{currentToko?.name || "Toko"}</span>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}