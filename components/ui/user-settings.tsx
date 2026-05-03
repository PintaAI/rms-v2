"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { changePassword, getBillingPlanSummary, updateProfile, uploadAvatar, setDevUserPlan, type BillingPlanSummary } from "@/actions"
import { useAuth } from "@/components/auth/auth-provider"
import { FeatureSettingsTab } from "@/components/dashboard/admin/feature-settings-tab"
import { WhatsappSettingsTab } from "@/components/dashboard/admin/whatsapp-settings-tab"
import type { SubscriptionPlan } from "@/lib/features"
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme-preference"
import {
  RiUserLine,
  RiLockPasswordLine,
  RiVipCrownLine,
  RiBankCard2Line,
  RiPencilLine,
  RiLoader4Line,
  RiPaletteLine,
  RiCheckboxCircleLine,
  RiLock2Line,
  RiSettings4Line,
  RiWhatsappLine,
} from "@remixicon/react"

export type SettingsTab = "profile" | "features" | "whatsapp" | "password" | "billing" | "premium" | "appearance"

interface UserSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  } | null
  initialTab?: SettingsTab
}

const menuItems: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <RiUserLine /> },
  { id: "features", label: "Pengaturan Fitur", icon: <RiSettings4Line /> },
  { id: "whatsapp", label: "WhatsApp", icon: <RiWhatsappLine /> },
  { id: "password", label: "Password", icon: <RiLockPasswordLine /> },
  { id: "appearance", label: "Tampilan", icon: <RiPaletteLine /> },
  { id: "billing", label: "Billing", icon: <RiBankCard2Line /> },
  { id: "premium", label: "Upgrade to Premium", icon: <RiVipCrownLine /> },
]

const planLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
}

function formatLimit(limit: number | null) {
  return limit === null ? "Unlimited" : String(limit)
}

function formatUsage(used: number, limit: number | null) {
  return `${used} / ${formatLimit(limit)}`
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function ProfileSettings({ user, onSuccess }: { user?: UserSettingsProps["user"]; onSuccess?: () => void }) {
  const router = useRouter()
  const { refetchSession } = useAuth()
  const [name, setName] = React.useState(user?.name || "")
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (selectedFile) {
        setIsUploadingAvatar(true)
        const uploadResult = await uploadAvatar(selectedFile)
        if (!uploadResult.success) {
          toast.error(uploadResult.error || "Failed to upload avatar")
          setIsUploadingAvatar(false)
          setIsSaving(false)
          return
        }
        setPreviewUrl(uploadResult.data || null)
        setSelectedFile(null)
        setIsUploadingAvatar(false)
      }

      if (name !== user?.name) {
        const result = await updateProfile(name)
        if (!result.success) {
          toast.error(result.error || "Failed to update profile")
          setIsSaving(false)
          return
        }
      }

      await refetchSession()
      toast.success("Profile updated successfully")
      router.refresh()
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save changes")
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="relative group">
          <Avatar className="size-24">
            {previewUrl ? (
              <AvatarImage src={previewUrl} alt="Preview" />
            ) : user?.image ? (
              <AvatarImage src={user.image} alt={user.name || "User"} />
            ) : (
              <AvatarFallback>
                <RiUserLine className="size-8" />
              </AvatarFallback>
            )}
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            disabled={isUploadingAvatar}
          >
            {isUploadingAvatar ? (
              <RiLoader4Line className="size-5 text-white animate-spin" />
            ) : (
              <RiPencilLine className="size-5 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
      {selectedFile && (
        <p className="text-xs text-muted-foreground text-center">
          New image selected. Click Save Changes to upload.
        </p>
      )}
      <Separator />
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={user?.email || ""}
          disabled
          className="bg-muted"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          value={user?.role || ""}
          disabled
          className="bg-muted"
        />
      </div>
      <Button className="w-full" onClick={handleSave} disabled={isSaving}>
        {isSaving ? (
          <>
            <RiLoader4Line className="size-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  )
}

function PasswordSettings({ onSuccess }: { onSuccess?: () => void }) {
  const { refetchSession } = useAuth()
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleUpdatePassword = async () => {
    setError(null)

    if (!currentPassword) {
      setError("Current password is required")
      return
    }
    if (!newPassword) {
      setError("New password is required")
      return
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match")
      return
    }

    setIsUpdating(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      if (!result.success) {
        setError(result.error || "Failed to change password")
        setIsUpdating(false)
        return
      }

      await refetchSession()
      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      onSuccess?.()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to change password")
    }
    setIsUpdating(false)
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="current-password">Current Password</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
        />
      </div>
      <Button className="w-full" onClick={handleUpdatePassword} disabled={isUpdating}>
        {isUpdating ? (
          <>
            <RiLoader4Line className="size-4 animate-spin mr-2" />
            Updating...
          </>
        ) : (
          "Update Password"
        )}
      </Button>
    </div>
  )
}

function BillingSettings({ summary, isLoading }: { summary: BillingPlanSummary | null; isLoading: boolean }) {
  const plan = summary?.plan ?? "free"

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Current Plan</p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading plan usage..." : `${planLabels[plan]} plan`}
            </p>
          </div>
          <Badge variant={plan === "free" ? "outline" : "default"}>{planLabels[plan]}</Badge>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <UsageTile label="Toko" value={summary ? formatUsage(summary.usage.tokos, summary.limits.tokos) : "-"} />
        <UsageTile label="Staff" value={summary ? formatUsage(summary.usage.staff, summary.limits.staff) : "-"} />
        <UsageTile label="Teknisi" value={summary ? formatUsage(summary.usage.technicians, summary.limits.technicians) : "-"} />
      </div>

      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Billing History</p>
        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Belum ada billing history. Payment provider belum dihubungkan.
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Upgrade</p>
        <Button variant="outline" className="w-full" disabled>
          Upgrade flow belum tersedia
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Integrasi pembayaran sengaja di luar scope MVP ini.
        </p>
      </div>
    </div>
  )
}

function UsageTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function PremiumSettings({ summary, isLoading, currentTokoId, onPlanChanged }: { summary: BillingPlanSummary | null; isLoading: boolean; currentTokoId?: string; onPlanChanged?: () => void }) {
  const plan = summary?.plan ?? "free"
  const { refetchSession } = useAuth()
  const [isUpgrading, setIsUpgrading] = React.useState(false)

  const handleDevUpgrade = async (targetPlan: SubscriptionPlan) => {
    setIsUpgrading(true)
    try {
      const result = await setDevUserPlan(targetPlan)
      if (result.success) {
        await refetchSession()
        if (currentTokoId) {
          const newSummary = await getBillingPlanSummary(currentTokoId)
          if (newSummary.success && newSummary.data) {
            onPlanChanged?.()
          }
        }
        toast.success(`Plan updated to ${targetPlan}`)
      } else {
        toast.error(result.error || "Failed to update plan")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update plan")
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <RiVipCrownLine className="size-5 text-primary" />
          <p className="font-medium">{planLabels[plan]} Feature Access</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Loading feature access..." : "Fitur di bawah mengikuti registry dan plan aktif akun/toko."}
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-medium">Included</p>
        <FeatureList features={summary?.includedFeatures ?? []} emptyLabel="Tidak ada fitur included yang bisa ditampilkan." included />
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="font-medium">Locked</p>
        <FeatureList features={summary?.lockedFeatures ?? []} emptyLabel="Semua fitur plan sudah terbuka." />
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">DEV-ONLY</p>
        <p className="text-xs text-muted-foreground">Bypass payment flow for testing. Remove before production.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => handleDevUpgrade("free")} disabled={isUpgrading || plan === "free"}>
            {isUpgrading ? <RiLoader4Line className="size-4 animate-spin" /> : "Set Free"}
          </Button>
          <Button onClick={() => handleDevUpgrade("premium")} disabled={isUpgrading || plan === "premium"}>
            {isUpgrading ? <RiLoader4Line className="size-4 animate-spin" /> : "Set Premium"}
          </Button>
          <Button onClick={() => handleDevUpgrade("enterprise")} disabled={isUpgrading || plan === "enterprise"}>
            {isUpgrading ? <RiLoader4Line className="size-4 animate-spin" /> : "Set Enterprise"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FeatureList({
  features,
  emptyLabel,
  included = false,
}: {
  features: BillingPlanSummary["includedFeatures"]
  emptyLabel: string
  included?: boolean
}) {
  if (features.length === 0) {
    return <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="space-y-2">
      {features.map((feature) => (
        <div key={feature.key} className="flex gap-3 rounded-lg border bg-card p-3">
          {included ? (
            <RiCheckboxCircleLine className="mt-0.5 size-4 shrink-0 text-green-600" />
          ) : (
            <RiLock2Line className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{feature.label}</p>
              <Badge variant={included ? "success" : "outline"}>{planLabels[feature.minimumPlan]}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function AppearanceSettings() {
  const [dynamicTheme, setDynamicTheme] = React.useState<ThemeMode>(() => getThemeMode())

  const handleToggle = (checked: boolean) => {
    const newMode: ThemeMode = checked ? "dynamic" : "default"
    setDynamicTheme(newMode)
    setThemeMode(newMode)
    toast.success(`Tema ${checked ? "dinamis" : "default"} aktif`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">Tema Dinamis</p>
            <p className="text-xs text-muted-foreground">
              Ekstrak warna dari logo toko untuk tema aplikasi
            </p>
          </div>
          <Switch checked={dynamicTheme === "dynamic"} onCheckedChange={handleToggle} />
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <p className="font-medium text-sm">Tema Default</p>
        <p className="text-xs text-muted-foreground">
          Warna statis dari konfigurasi default aplikasi
        </p>
        <div className="flex gap-2 mt-2">
          <div className="size-8 rounded-md bg-primary" title="Primary" />
          <div className="size-8 rounded-md bg-secondary border" title="Secondary" />
          <div className="size-8 rounded-md bg-accent border" title="Accent" />
        </div>
      </div>
    </div>
  )
}

export function UserSettings({ open, onOpenChange, user, initialTab }: UserSettingsProps) {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(() => initialTab || "profile")
  const params = useParams<{ tokoid?: string | string[] }>()
  const currentTokoId = getParamValue(params?.tokoid)
  const [billingSummary, setBillingSummary] = React.useState<BillingPlanSummary | null>(null)
  const [isBillingLoading, setIsBillingLoading] = React.useState(false)

  React.useEffect(() => {
    let active = true

    async function loadBillingSummary() {
      if (!open || (activeTab !== "billing" && activeTab !== "premium")) return

      setIsBillingLoading(true)
      try {
        const result = await getBillingPlanSummary(currentTokoId)
        if (!active) return

        if (result.success && result.data) {
          setBillingSummary(result.data)
        } else {
          toast.error(result.error || "Gagal memuat data plan")
        }
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Gagal memuat data plan")
        }
      } finally {
        if (active) setIsBillingLoading(false)
      }
    }

    void loadBillingSummary()

    return () => {
      active = false
    }
  }, [activeTab, currentTokoId, open])

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !initialTab) {
      setActiveTab("profile")
    }
    onOpenChange(newOpen)
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings key={`${user?.name ?? "user"}-${user?.image ?? "no-image"}`} user={user} onSuccess={() => onOpenChange(false)} />
      case "features":
        return currentTokoId ? <FeatureSettingsTab tokoId={currentTokoId} /> : <div className="text-center text-muted-foreground py-8">Pilih toko untuk mengatur fitur.</div>
      case "whatsapp":
        return currentTokoId ? <WhatsappSettingsTab tokoId={currentTokoId} /> : <div className="text-center text-muted-foreground py-8">Pilih toko untuk mengatur WhatsApp.</div>
      case "password":
        return <PasswordSettings onSuccess={() => onOpenChange(false)} />
      case "appearance":
        return <AppearanceSettings />
      case "billing":
        return <BillingSettings summary={billingSummary} isLoading={isBillingLoading} />
      case "premium":
        return <PremiumSettings summary={billingSummary} isLoading={isBillingLoading} currentTokoId={currentTokoId} onPlanChanged={() => setBillingSummary(null)} />
      default:
        return <ProfileSettings key={`${user?.name ?? "user"}-${user?.image ?? "no-image"}`} user={user} onSuccess={() => onOpenChange(false)} />
    }
  }

  const getTabTitle = () => {
    const item = menuItems.find((i) => i.id === activeTab)
    return item?.label || "Settings"
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-3xl h-[500px] max-h-[85vh] p-0 overflow-hidden" showCloseButton={true}>
        <DialogHeader className="sr-only">
          <DialogTitle>User Settings</DialogTitle>
        </DialogHeader>
        <SidebarProvider defaultOpen={true} className="h-full min-h-0">
          <div className="flex h-full min-h-0 w-full">
            <Sidebar collapsible="none" className="w-[200px] border-r shrink-0" side="left">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Settings</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            isActive={activeTab === item.id}
                            onClick={() => setActiveTab(item.id)}
                          >
                            {item.icon}
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <main className="flex min-h-0 flex-1 flex-col p-6">
              <div className="shrink-0 ">
                <h2 className="font-heading text-sm font-medium">{getTabTitle()}</h2>
                <Separator className="mt-2" />
              </div>
              <ScrollArea className="h-[500px] pr-4">
                <div className="pt-4">{renderContent()}</div>
              </ScrollArea>
            </main>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
