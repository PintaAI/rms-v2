"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { RiArrowDownSLine, RiVipCrownLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface NavItemProps {
  href: string;
  icon?: ReactNode;
  label: string;
  isLocked?: boolean;
}

export function NavItem({ href, icon, label, isLocked }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href.split("?")[0];

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={href}>
          {icon}
          <span className="truncate">{label}</span>
          {isLocked && (
            <RiVipCrownLine className="size-4 ml-auto text-amber-500 shrink-0" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface NavGroupProps {
  title: string;
  icon?: ReactNode;
  items: { href: string; icon?: ReactNode; label: string; isLocked?: boolean }[];
  defaultOpen?: boolean;
}

export function NavGroup({ title, icon, items, defaultOpen = true }: NavGroupProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isGroupActive = items.some(
    (item) => pathname === item.href.split("?")[0] || pathname.startsWith(item.href.split("?")[0] + "/")
  );

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setIsOpen(!isOpen)}
        isActive={isGroupActive}
        className={cn(isOpen && "data-[state=open]:bg-sidebar-accent")}
      >
        {icon}
        <span className="truncate">{title}</span>
        <RiArrowDownSLine
          className={cn(
            "size-4 ml-auto transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </SidebarMenuButton>
      {isOpen && (
        <SidebarMenuSub>
          {items.map((item) => (
            <SidebarMenuSubItem key={item.href}>
              <SidebarMenuSubButton
                asChild
                isActive={pathname === item.href.split("?")[0]}
              >
                <Link href={item.href}>
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {item.isLocked && (
                    <RiVipCrownLine className="size-4 ml-auto text-amber-500 shrink-0" />
                  )}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

// NavFilterGroup: items use window.history.replaceState instead of router navigation.
// This updates the URL and triggers useSearchParams() re-reads in client components
// WITHOUT causing a server component re-render / data refetch.
interface NavFilterGroupProps {
  title: string;
  icon?: ReactNode;
  items: { href: string; icon?: ReactNode; label: string; badge?: number; badgeVariant?: "secondary" | "accent" | "success" | "destructive" | "outline" }[];
  defaultOpen?: boolean;
}

const badgeVariants = {
  secondary: "bg-muted/80 text-muted-foreground",
  accent: "bg-gradient-to-r from-sky-500/20 to-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  success: "bg-gradient-to-r from-green-500/20 to-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
  destructive: "bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border border-destructive/20",
  outline: "bg-muted/50 text-muted-foreground border border-border/50",
};

export function NavFilterGroup({ title, icon, items, defaultOpen = true }: NavFilterGroupProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isItemActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");
    if (pathname !== hrefPath) return false;
    if (!hrefQuery) return searchParams.toString() === "";
    const hrefParams = new URLSearchParams(hrefQuery);
    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };

  const isGroupActive = items.some((item) => isItemActive(item.href));

  const handleItemClick = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");
    // If already on the target page, update URL client-side only — no server refetch
    if (pathname === hrefPath) {
      const newUrl = hrefQuery ? `${hrefPath}?${hrefQuery}` : hrefPath;
      window.history.replaceState(null, "", newUrl);
      // Notify useSearchParams() subscribers to re-read the URL
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else {
      // Coming from a different page — do a full navigation
      router.push(href);
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setIsOpen(!isOpen)}
        isActive={isGroupActive}
        className={cn(isOpen && "data-[state=open]:bg-sidebar-accent")}
      >
        {icon}
        <span className="truncate">{title}</span>
        <RiArrowDownSLine
          className={cn(
            "size-4 ml-auto transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </SidebarMenuButton>
      {isOpen && (
        <SidebarMenuSub>
          {items.map((item) => (
            <SidebarMenuSubItem key={item.href}>
              <SidebarMenuSubButton
                isActive={isItemActive(item.href)}
                onClick={() => handleItemClick(item.href)}
                className="cursor-pointer"
              >
                {item.icon}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`ml-auto shrink-0 ${badgeVariants[item.badgeVariant || "secondary"]} min-w-[1.5rem] rounded-md px-2 py-0.5 text-center text-[0.65rem] font-semibold tabular-nums shadow-sm transition-all duration-300`}>
                    {item.badge}
                  </span>
                )}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
