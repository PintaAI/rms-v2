"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  RiDashboardLine,
  RiStore2Line,
  RiToolsLine,
  RiInboxLine,
  RiProgress1Line,
  RiCheckLine,
  RiCloseLine,
  RiLogoutBoxLine,
  RiUserSettingsLine,
  RiArchiveLine,
  RiArrowDownSLine,
  RiTaskLine,
} from "@remixicon/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DemoNavItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
}

function DemoNavItem({ icon, label, badge, active }: DemoNavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active}>
        {icon}
        <span>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto bg-destructive text-background dark:text-foreground text-[0.625rem] font-medium rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
            {badge}
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface DemoNavGroupProps {
  title: string;
  icon: React.ReactNode;
  items: { icon: React.ReactNode; label: string; badge?: number }[];
  defaultOpen?: boolean;
}

function DemoNavGroup({ title, icon, items, defaultOpen = true }: DemoNavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setIsOpen(!isOpen)}
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
          {items.map((item, idx) => (
            <SidebarMenuSubItem key={idx}>
              <SidebarMenuSubButton>
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

const mockStats = {
  received: 3,
  repairing: 5,
  done: 2,
  failed: 1,
  pickedUp: 10,
};

function AdminNavDemo() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <DemoNavItem icon={<RiDashboardLine />} label="Overview" active />
          <DemoNavItem icon={<RiStore2Line />} label="Toko" />
          <DemoNavGroup
            title="Service"
            icon={<RiToolsLine />}
            defaultOpen={true}
            items={[
              { icon: <RiToolsLine />, label: "Semua" },
              { icon: <RiInboxLine />, label: "Masuk", badge: mockStats.received },
              { icon: <RiProgress1Line />, label: "Proses", badge: mockStats.repairing },
              { icon: <RiCheckLine />, label: "Selesai", badge: mockStats.done },
              { icon: <RiCloseLine />, label: "Gagal", badge: mockStats.failed },
              { icon: <RiLogoutBoxLine />, label: "Diambil", badge: mockStats.pickedUp },
            ]}
          />
          <DemoNavItem icon={<RiUserSettingsLine />} label="Karyawan" />
          <DemoNavItem icon={<RiArchiveLine />} label="Inventory" />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function StaffNavDemo() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <DemoNavItem icon={<RiDashboardLine />} label="Overview" active />
          <DemoNavGroup
            title="Service"
            icon={<RiToolsLine />}
            defaultOpen={true}
            items={[
              { icon: <RiToolsLine />, label: "Semua" },
              { icon: <RiInboxLine />, label: "Masuk", badge: mockStats.received },
              { icon: <RiProgress1Line />, label: "Proses", badge: mockStats.repairing },
              { icon: <RiCheckLine />, label: "Selesai", badge: mockStats.done },
              { icon: <RiCloseLine />, label: "Gagal", badge: mockStats.failed },
              { icon: <RiLogoutBoxLine />, label: "Diambil", badge: mockStats.pickedUp },
            ]}
          />
          <DemoNavItem icon={<RiArchiveLine />} label="Sparepart" />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function TeknisiNavDemo() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <DemoNavItem icon={<RiDashboardLine />} label="Overview" active />
          <DemoNavGroup
            title="Task"
            icon={<RiTaskLine />}
            defaultOpen={true}
            items={[
              { icon: <RiInboxLine />, label: "Tersedia", badge: mockStats.received },
              { icon: <RiProgress1Line />, label: "Dikerjakan", badge: mockStats.repairing },
              { icon: <RiCheckLine />, label: "Selesai", badge: mockStats.done },
              { icon: <RiCloseLine />, label: "Gagal", badge: mockStats.failed },
              { icon: <RiLogoutBoxLine />, label: "History", badge: mockStats.pickedUp },
            ]}
          />
          <DemoNavItem icon={<RiArchiveLine />} label="Inventory" />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function SidebarNavDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 not-prose">
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-sidebar-accent px-3 py-2 text-center text-sm font-medium text-sidebar-accent-foreground">
          Admin
        </div>
        <SidebarProvider className="!min-h-0 !w-full">
          <Sidebar collapsible="none" className="!w-full">
            <SidebarContent>
              <AdminNavDemo />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-sidebar-accent px-3 py-2 text-center text-sm font-medium text-sidebar-accent-foreground">
          Staff
        </div>
        <SidebarProvider className="!min-h-0 !w-full">
          <Sidebar collapsible="none" className="!w-full">
            <SidebarContent>
              <StaffNavDemo />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-sidebar-accent px-3 py-2 text-center text-sm font-medium text-sidebar-accent-foreground">
          Teknisi
        </div>
        <SidebarProvider className="!min-h-0 !w-full">
          <Sidebar collapsible="none" className="!w-full">
            <SidebarContent>
              <TeknisiNavDemo />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </div>
    </div>
  );
}