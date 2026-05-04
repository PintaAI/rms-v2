"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  RiBankCard2Line,
  RiLockPasswordLine,
  RiMoneyDollarCircleLine,
  RiPaletteLine,
  RiSettings4Line,
  RiUserLine,
  RiVipCrownLine,
  RiWhatsappLine,
} from "@remixicon/react";
import { getBillingPlanSummary, getOwnerBillingSummary, type BillingPlanSummary, type OwnerBillingSummary } from "@/actions";
import { AffiliateSettings } from "@/components/affiliate/affiliate-settings";
import { useAuth } from "@/components/auth/auth-provider";
import { FeatureSettingsTab } from "@/components/dashboard/admin/feature-settings-tab";
import { WhatsappSettingsTab } from "@/components/dashboard/admin/whatsapp-settings-tab";
import { AppearanceSettingsTab } from "@/components/settings/appearance-tab";
import { BillingSettingsTab } from "@/components/settings/billing-tab";
import { getParamValue } from "@/components/settings/helpers";
import { PasswordSettingsTab } from "@/components/settings/password-tab";
import { PlanSettingsTab } from "@/components/settings/plan-tab";
import { ProfileSettingsTab } from "@/components/settings/profile-tab";
import type { SettingsTab, SettingsUser } from "@/components/settings/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { isPlanAtLeast, normalizePlan } from "@/lib/plans";

export type { SettingsTab } from "@/components/settings/types";

interface UserSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: SettingsUser | null;
  initialTab?: SettingsTab;
}

const baseMenuItems: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <RiUserLine /> },
  { id: "features", label: "Pengaturan Fitur", icon: <RiSettings4Line /> },
  { id: "whatsapp", label: "WhatsApp", icon: <RiWhatsappLine /> },
  { id: "password", label: "Password", icon: <RiLockPasswordLine /> },
  { id: "appearance", label: "Tampilan", icon: <RiPaletteLine /> },
  { id: "affiliate", label: "Affiliate", icon: <RiMoneyDollarCircleLine /> },
  { id: "billing", label: "Billing", icon: <RiBankCard2Line /> },
  { id: "premium", label: "Upgrade ke Pro", icon: <RiVipCrownLine /> },
];

export function UserSettings({ open, onOpenChange, user, initialTab }: UserSettingsProps) {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(() => initialTab || "profile");
  const isMobile = useIsMobile();
  const { tokoList, user: authUser } = useAuth();
  const params = useParams<{ tokoid?: string | string[] }>();
  const currentTokoId = getParamValue(params?.tokoid);
  const currentToko = tokoList.find((toko) => toko.id === currentTokoId) ?? tokoList[0];
  const currentPlan = authUser?.plan ?? "free";
  const [billingSummary, setBillingSummary] = React.useState<BillingPlanSummary | null>(null);
  const [ownerBillingSummary, setOwnerBillingSummary] = React.useState<OwnerBillingSummary | null>(null);
  const [isBillingLoading, setIsBillingLoading] = React.useState(false);
  const [billingReloadKey, setBillingReloadKey] = React.useState(0);

  const premiumTabLabel = currentPlan === "enterprise" ? "Enterprise Benefit" : currentPlan === "premium" ? "Pro Benefit" : "Upgrade ke Pro";
  const menuItems = React.useMemo(
    () => baseMenuItems.map((item) => item.id === "premium" ? { ...item, label: premiumTabLabel } : item),
    [premiumTabLabel]
  );

  const reloadBilling = React.useCallback(() => {
    setBillingSummary(null);
    setOwnerBillingSummary(null);
    setBillingReloadKey((key) => key + 1);
  }, []);

  React.useEffect(() => {
    let active = true;

    async function loadBillingSummary() {
      if (!open || (activeTab !== "billing" && activeTab !== "premium")) return;

      setIsBillingLoading(true);
      try {
        const [result, ownerBillingResult] = await Promise.all([
          getBillingPlanSummary(currentTokoId),
          getOwnerBillingSummary(),
        ]);
        if (!active) return;

        if (result.success && result.data) setBillingSummary(result.data);
        else toast.error(result.error || "Gagal memuat data plan");

        if (ownerBillingResult.success && ownerBillingResult.data) setOwnerBillingSummary(ownerBillingResult.data);
      } catch (error) {
        if (active) toast.error(error instanceof Error ? error.message : "Gagal memuat data plan");
      } finally {
        if (active) setIsBillingLoading(false);
      }
    }

    void loadBillingSummary();
    return () => { active = false; };
  }, [activeTab, currentTokoId, open, billingReloadKey]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !initialTab) setActiveTab("profile");
    onOpenChange(newOpen);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettingsTab key={`${user?.name ?? "user"}-${user?.image ?? "no-image"}`} user={user} onSuccess={() => onOpenChange(false)} />;
      case "features":
        return currentTokoId ? <FeatureSettingsTab tokoId={currentTokoId} /> : <EmptyTabMessage message="Pilih toko untuk mengatur fitur." />;
      case "whatsapp":
        if (!isPlanAtLeast(normalizePlan(currentPlan), "premium")) {
          return <WhatsappLocked currentPlan={currentPlan} />;
        }
        return currentTokoId ? <WhatsappSettingsTab tokoId={currentTokoId} /> : <EmptyTabMessage message="Pilih toko untuk mengatur WhatsApp." />;
      case "password":
        return <PasswordSettingsTab onSuccess={() => onOpenChange(false)} />;
      case "appearance":
        return <AppearanceSettingsTab />;
      case "affiliate":
        return <AffiliateSettings />;
      case "billing":
        return <BillingSettingsTab summary={billingSummary} ownerBilling={ownerBillingSummary} isLoading={isBillingLoading} onChanged={reloadBilling} userEmail={user?.email} tokoName={currentToko?.name} />;
      case "premium":
        return <PlanSettingsTab summary={billingSummary} ownerBilling={ownerBillingSummary} isLoading={isBillingLoading} currentTokoId={currentTokoId} onChanged={reloadBilling} userEmail={user?.email} tokoName={currentToko?.name} />;
      default:
        return <ProfileSettingsTab key={`${user?.name ?? "user"}-${user?.image ?? "no-image"}`} user={user} onSuccess={() => onOpenChange(false)} />;
    }
  };

  const getTabTitle = () => menuItems.find((item) => item.id === activeTab)?.label || "Settings";

  const settingsContent = (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <nav className="shrink-0 border-b bg-sidebar text-sidebar-foreground md:w-[200px] md:border-b-0 md:border-r">
        <div className="px-3 pb-2 pt-3 text-xs text-sidebar-foreground/70 md:h-8 md:px-4 md:py-2">Settings</div>
        <div className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-x-visible md:px-2 md:pb-2">
          {menuItems.map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={cn("relative flex h-9 shrink-0 items-center gap-2 overflow-hidden rounded-lg px-3 text-left text-xs whitespace-nowrap transition-all hover:bg-primary/10 hover:text-primary md:w-full", activeTab === item.id && "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent font-semibold text-foreground shadow-sm", item.id === "premium" && !isPlanAtLeast(normalizePlan(currentPlan), "premium") && "border border-amber-500/30 bg-amber-500/5 font-medium text-amber-600 hover:bg-amber-500/10 hover:text-amber-600")}>
              <span className={cn("[&>svg]:size-4 [&>svg]:shrink-0", item.id === "premium" && "[&>svg]:text-amber-500")}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "whatsapp" && !isPlanAtLeast(normalizePlan(currentPlan), "premium") && <RiVipCrownLine className="ml-auto size-3.5 text-amber-500" />}
            </button>
          ))}
        </div>
      </nav>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
        <div className="shrink-0"><h2 className="font-heading text-sm font-medium">{getTabTitle()}</h2><Separator className="mt-2" /></div>
        {isMobile ? <div className="min-h-0 flex-1 overflow-y-auto pr-3"><div className="pb-4 pt-4">{renderContent()}</div></div> : <ScrollArea className="min-h-0 flex-1 pr-4"><div className="pt-4">{renderContent()}</div></ScrollArea>}
      </main>
    </div>
  );

  if (isMobile) {
    return <Sheet open={open} onOpenChange={handleOpenChange}><SheetContent side="bottom" className="h-[90dvh] max-h-[90dvh] overflow-hidden rounded-t-2xl p-0" showCloseButton><SheetHeader className="sr-only"><SheetTitle>User Settings</SheetTitle></SheetHeader>{settingsContent}</SheetContent></Sheet>;
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}><DialogContent className="h-[min(640px,90vh)] w-[calc(100%-1rem)] overflow-hidden p-0 sm:max-w-4xl" showCloseButton><DialogHeader className="sr-only"><DialogTitle>User Settings</DialogTitle></DialogHeader>{settingsContent}</DialogContent></Dialog>;
}

function EmptyTabMessage({ message }: { message: string }) {
  return <div className="py-8 text-center text-muted-foreground">{message}</div>;
}

function WhatsappLocked({ currentPlan }: { currentPlan: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
        <RiVipCrownLine className="size-7" />
      </div>
      <h3 className="text-base font-semibold">Fitur WhatsApp Terkunci</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Fitur WhatsApp hanya tersedia di paket Pro. Upgrade untuk mengirim notifikasi status service otomatis ke pelanggan.
      </p>
    </div>
  );
}
