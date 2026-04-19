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
import { RiArrowDownSLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface NavItemProps {
  href: string;
  icon?: ReactNode;
  label: string;
}

export function NavItem({ href, icon, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={href}>
          {icon}
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface NavGroupProps {
  title: string;
  icon?: ReactNode;
  items: { href: string; icon?: ReactNode; label: string }[];
  defaultOpen?: boolean;
}

export function NavGroup({ title, icon, items, defaultOpen = true }: NavGroupProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isGroupActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href.split("?")[0] + "/")
  );

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setIsOpen(!isOpen)}
        isActive={isGroupActive}
        className={cn(isOpen && "data-[state=open]:bg-sidebar-accent")}
      >
        {icon}
        <span>{title}</span>
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
                isActive={pathname === item.href || pathname.startsWith(item.href.split("?")[0] + "/")}
              >
                <Link href={item.href}>
                  {item.icon}
                  <span>{item.label}</span>
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
  items: { href: string; icon?: ReactNode; label: string; badge?: number }[];
  defaultOpen?: boolean;
}

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
        <span>{title}</span>
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
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-destructive text-background dark:text-foreground text-[0.625rem] font-medium rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
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