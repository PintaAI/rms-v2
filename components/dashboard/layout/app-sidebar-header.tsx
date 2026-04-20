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
import { useDynamicTheme } from "@/hooks/use-dynamic-theme";

interface AppSidebarHeaderProps {
  tokoid: string;
  userRole: string;
  tokoList?: { id: string; name: string; logoUrl?: string | null; address?: string | null }[];
}

function TokoIcon({ logoUrl, name, isActive = false }: { logoUrl?: string | null; name: string; isActive?: boolean }) {
  if (logoUrl) {
    return (
      <div className={`relative size-9 rounded-lg overflow-hidden shrink-0 transition-all duration-300 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-md ${isActive ? "ring-2 ring-primary/50 ring-offset-1 ring-offset-sidebar" : ""}`}>
        <Image
          src={logoUrl}
          alt={name}
          width={36}
          height={36}
          className="size-full object-cover"
        />
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
        )}
      </div>
    );
  }
  return (
    <div className={`size-9 rounded-lg bg-gradient-to-br from-primary/10 via-sidebar-accent to-primary/5 flex items-center justify-center shrink-0 transition-all duration-300 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-md ${isActive ? "ring-2 ring-primary/50 ring-offset-1 ring-offset-sidebar" : ""}`}>
      <RiStore2Line className="size-4.5 text-primary transition-all duration-300" />
    </div>
  );
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

  useDynamicTheme(currentToko?.logoUrl);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTokoSwitch = (newTokoId: string) => {
    startTransition(() => {
      router.push(`/${newTokoId}/${userRole}`);
    });
  };

  const showLoading = !mounted || isTokoLoading;

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          {showLoading ? (
            <SidebarMenuButton disabled className="group-data-[collapsible=icon]:!p-0 h-auto py-3">
              <Skeleton className="size-9 rounded-lg group-data-[collapsible=icon]:size-8 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5 group-data-[collapsible=icon]:hidden">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            </SidebarMenuButton>
          ) : canSwitchToko ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip={currentToko?.name || "Pilih Toko"}
                  className="relative group-data-[collapsible=icon]:!p-0 h-auto py-3 overflow-hidden data-[state=open]:bg-sidebar-accent/80 data-[state=open]:text-sidebar-accent-foreground transition-all duration-300 hover:bg-sidebar-accent/50 group"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-all duration-300 group-data-[collapsible=icon]:hidden" />
                  <div className="absolute -top-6 -right-6 w-12 h-12 bg-primary/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300 group-data-[collapsible=icon]:hidden" />
                  {isPending ? (
                    <RiLoader4Line className="size-4.5 animate-spin text-primary shrink-0" />
                  ) : (
                    <TokoIcon logoUrl={currentToko?.logoUrl} name={currentToko?.name || "Toko"} />
                  )}
                  <div className="flex-1 min-w-0 relative z-10 group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-semibold">{currentToko?.name || "Pilih Toko"}</span>
                    {currentToko?.address && (
                      <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">{currentToko.address}</p>
                    )}
                  </div>
                  <RiArrowDownSLine className="size-4 ml-auto transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-1.5">
                {tokoList?.map((toko) => {
                  const isSelected = toko.id === tokoid;
                  return (
                    <DropdownMenuItem
                      key={toko.id}
                      onClick={() => handleTokoSwitch(toko.id)}
                      className={`relative p-2.5 border border-border rounded-lg overflow-hidden transition-all duration-300 ${isSelected ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" : ""} hover:bg-sidebar-accent/80`}
                      disabled={isPending}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                      )}
                      <TokoIcon logoUrl={toko.logoUrl} name={toko.name} isActive={isSelected} />
                      <div className="ml-3 flex-1 min-w-0 relative z-10">
                        <span className="font-semibold truncate text-sm">{toko.name}</span>
                        {toko.address && (
                          <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">{toko.address}</p>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SidebarMenuButton
              tooltip={currentToko?.name || "Toko"}
              className="relative group-data-[collapsible=icon]:!p-0 h-auto py-3 overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 group-data-[collapsible=icon]:hidden" />
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-primary/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300 group-data-[collapsible=icon]:hidden" />
              <TokoIcon logoUrl={currentToko?.logoUrl} name={currentToko?.name || "Toko"} />
              <div className="flex-1 min-w-0 relative z-10 group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold">{currentToko?.name || "Toko"}</span>
                {currentToko?.address && (
                  <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">{currentToko.address}</p>
                )}
              </div>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}