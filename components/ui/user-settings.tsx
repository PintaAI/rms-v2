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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  changePassword,
  createProSubscriptionInvoice,
  applyProTrial,
  getBillingPlanSummary,
  getOwnerBillingSummary,
  submitSubscriptionPaymentProof,
  updateProfile,
  uploadAvatar,
  setDevUserPlan,
  type BillingPlanSummary,
  type OwnerBillingSummary,
} from "@/actions"
import { useAuth } from "@/components/auth/auth-provider"
import { FeatureSettingsTab } from "@/components/dashboard/admin/feature-settings-tab"
import { WhatsappSettingsTab } from "@/components/dashboard/admin/whatsapp-settings-tab"
import { AffiliateSettings } from "@/components/affiliate/affiliate-settings"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
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
  RiMoneyDollarCircleLine,
} from "@remixicon/react"

export type SettingsTab = "profile" | "features" | "whatsapp" | "password" | "billing" | "premium" | "appearance" | "affiliate"

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
  { id: "affiliate", label: "Affiliate", icon: <RiMoneyDollarCircleLine /> },
  { id: "billing", label: "Billing", icon: <RiBankCard2Line /> },
  { id: "premium", label: "Upgrade to Pro", icon: <RiVipCrownLine /> },
]

const planLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Pro",
  enterprise: "Enterprise",
}

function formatLimit(limit: number | null) {
  return limit === null ? "Unlimited" : String(limit)
}

function formatUsage(used: number, limit: number | null) {
  return `${used} / ${formatLimit(limit)}`
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Custom"

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
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

function BillingSettings({ summary, ownerBilling, isLoading, onChanged }: { summary: BillingPlanSummary | null; ownerBilling: OwnerBillingSummary | null; isLoading: boolean; onChanged: () => void }) {
  const plan = summary?.plan ?? "free"
  const [isPending, startTransition] = React.useTransition()
  const [method, setMethod] = React.useState("bank_transfer")
  const invoice = ownerBilling?.latestInvoice ?? null

  const handleCreateInvoice = () => {
    startTransition(async () => {
      const result = await createProSubscriptionInvoice()
      if (!result.success) {
        toast.error(result.error || "Gagal membuat invoice")
        return
      }
      toast.success("Invoice Pro siap dibayar")
      onChanged()
    })
  }

  const handleSubmitPayment = (formData: FormData) => {
    formData.set("method", method)
    startTransition(async () => {
      const result = await submitSubscriptionPaymentProof(formData)
      if (!result.success) {
        toast.error(result.error || "Gagal upload bukti bayar")
        return
      }
      toast.success("Bukti pembayaran dikirim untuk review")
      onChanged()
    })
  }

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

      <div className="rounded-lg border bg-muted/20 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Estimasi tagihan bulanan</span>
          <span className="font-semibold">{summary ? formatCurrency(summary.pricing.estimatedMonthlyAmount) : "-"}</span>
        </div>
        {summary?.plan === "premium" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Pro termasuk {summary.pricing.includedTokos ?? 2} toko. Tambahan toko {formatCurrency(summary.pricing.additionalTokoPrice)}/toko/bulan.
          </p>
        )}
        {summary?.plan === "free" && (
          <p className="mt-1 text-xs text-muted-foreground">Free permanen dengan 1 toko dan 20 service/bulan.</p>
        )}
        {summary?.plan === "enterprise" && (
          <p className="mt-1 text-xs text-muted-foreground">Enterprise memakai harga custom dan diaktifkan manual oleh super admin.</p>
        )}
      </div>

      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Status Subscription</p>
        <div className="rounded-lg border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={ownerBilling?.subscription.status === "active" || ownerBilling?.subscription.status === "trialing" ? "success" : ownerBilling?.subscription.status === "past_due" ? "warning" : "outline"}>
              {ownerBilling?.subscription.status ?? "-"}
            </Badge>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
            {ownerBilling?.subscription.trialEndsAt && <span>Trial sampai {new Date(ownerBilling.subscription.trialEndsAt).toLocaleDateString("id-ID")}</span>}
            {ownerBilling?.subscription.currentPeriodEnd && <span>Aktif sampai {new Date(ownerBilling.subscription.currentPeriodEnd).toLocaleDateString("id-ID")}</span>}
            {ownerBilling?.subscription.graceEndsAt && <span>Grace period sampai {new Date(ownerBilling.subscription.graceEndsAt).toLocaleDateString("id-ID")}</span>}
          </div>
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Pembayaran Manual</p>
        {ownerBilling?.subscription.plan === "free" && !ownerBilling.subscription.proTrialStartedAt && (
          <Button variant="outline" className="w-full" disabled={isPending || isLoading} onClick={() => startTransition(async () => {
            const result = await applyProTrial()
            if (!result.success) {
              toast.error(result.error || "Gagal apply trial Pro")
              return
            }
            toast.success("Trial Pro 1 bulan aktif")
            onChanged()
          })}>
            Coba Pro gratis 1 bulan
          </Button>
        )}
        {!invoice || ["paid", "void"].includes(invoice.status) ? (
          <Button variant="outline" className="w-full" disabled={isPending || isLoading} onClick={handleCreateInvoice}>
            Buat invoice Pro Rp990.000
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{invoice.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">Jatuh tempo {new Date(invoice.dueAt).toLocaleDateString("id-ID")}</p>
              </div>
              <Badge variant={invoice.status === "pending_review" ? "warning" : invoice.status === "rejected" ? "destructive" : "outline"}>{invoice.status}</Badge>
            </div>
            <div className="rounded-md bg-muted/30 p-3 text-sm">
              <div className="flex justify-between"><span>Total</span><strong>{formatCurrency(invoice.amount)}</strong></div>
              <p className="mt-1 text-xs text-muted-foreground">{invoice.tokoCount} toko · {invoice.additionalTokos} toko tambahan</p>
            </div>
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Transfer ke {ownerBilling?.instructions.bankName} · {ownerBilling?.instructions.accountNumber} a.n. {ownerBilling?.instructions.accountName}, atau QRIS RMS.
            </div>
            {invoice.status !== "pending_review" && (
              <form action={handleSubmitPayment} className="space-y-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nominal dibayar</Label>
                    <Input name="amount" inputMode="numeric" defaultValue={invoice.amount} />
                  </div>
                  <div className="space-y-1">
                    <Label>Metode</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                        <SelectItem value="ewallet">E-Wallet</SelectItem>
                        <SelectItem value="other">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Nomor referensi</Label>
                  <Input name="referenceNumber" placeholder="Opsional" />
                </div>
                <div className="space-y-1">
                  <Label>Bukti pembayaran</Label>
                  <Input name="proof" type="file" accept="image/*,.pdf" />
                </div>
                <div className="space-y-1">
                  <Label>Catatan</Label>
                  <Textarea name="note" placeholder="Opsional" />
                </div>
                <Button className="w-full" disabled={isPending}>{isPending ? "Mengirim..." : "Kirim bukti bayar"}</Button>
              </form>
            )}
            {invoice.payments.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Riwayat bukti bayar</p>
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="rounded-md bg-muted/20 p-2 text-xs">
                    <div className="flex justify-between gap-2"><span>{formatCurrency(payment.amount)}</span><Badge variant="outline">{payment.status}</Badge></div>
                    {payment.rejectionReason && <p className="mt-1 text-destructive">{payment.rejectionReason}</p>}
                    {payment.proofUrl && <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-primary underline">Lihat bukti</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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

function PlanSettings({ summary, isLoading, currentTokoId, onPlanChanged }: { summary: BillingPlanSummary | null; isLoading: boolean; currentTokoId?: string; onPlanChanged?: () => void }) {
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
            {isUpgrading ? <RiLoader4Line className="size-4 animate-spin" /> : "Set Pro"}
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
  const isMobile = useIsMobile()
  const params = useParams<{ tokoid?: string | string[] }>()
  const currentTokoId = getParamValue(params?.tokoid)
  const [billingSummary, setBillingSummary] = React.useState<BillingPlanSummary | null>(null)
  const [ownerBillingSummary, setOwnerBillingSummary] = React.useState<OwnerBillingSummary | null>(null)
  const [isBillingLoading, setIsBillingLoading] = React.useState(false)
  const [billingReloadKey, setBillingReloadKey] = React.useState(0)

  const reloadBilling = React.useCallback(() => {
    setBillingSummary(null)
    setOwnerBillingSummary(null)
    setBillingReloadKey((key) => key + 1)
  }, [])

  React.useEffect(() => {
    let active = true

    async function loadBillingSummary() {
      if (!open || (activeTab !== "billing" && activeTab !== "premium")) return

      setIsBillingLoading(true)
      try {
        const [result, ownerBillingResult] = await Promise.all([
          getBillingPlanSummary(currentTokoId),
          getOwnerBillingSummary(),
        ])
        if (!active) return

        if (result.success && result.data) {
          setBillingSummary(result.data)
        } else {
          toast.error(result.error || "Gagal memuat data plan")
        }
        if (ownerBillingResult.success && ownerBillingResult.data) {
          setOwnerBillingSummary(ownerBillingResult.data)
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
  }, [activeTab, currentTokoId, open, billingReloadKey])

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
      case "affiliate":
        return <AffiliateSettings />
      case "billing":
        return <BillingSettings summary={billingSummary} ownerBilling={ownerBillingSummary} isLoading={isBillingLoading} onChanged={reloadBilling} />
      case "premium":
        return <PlanSettings summary={billingSummary} isLoading={isBillingLoading} currentTokoId={currentTokoId} onPlanChanged={reloadBilling} />
      default:
        return <ProfileSettings key={`${user?.name ?? "user"}-${user?.image ?? "no-image"}`} user={user} onSuccess={() => onOpenChange(false)} />
    }
  }

  const getTabTitle = () => {
    const item = menuItems.find((i) => i.id === activeTab)
    return item?.label || "Settings"
  }

  const settingsContent = (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <nav className="shrink-0 border-b bg-sidebar text-sidebar-foreground md:w-[200px] md:border-b-0 md:border-r">
        <div className="px-3 pb-2 pt-3 text-xs text-sidebar-foreground/70 md:h-8 md:px-4 md:py-2">
          Settings
        </div>
        <div className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-x-visible md:px-2 md:pb-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative flex h-9 shrink-0 items-center gap-2 overflow-hidden rounded-lg px-3 text-left text-xs whitespace-nowrap transition-all hover:bg-primary/10 hover:text-primary md:w-full",
                activeTab === item.id && "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent font-semibold text-foreground shadow-sm"
              )}
            >
              <span className="[&>svg]:size-4 [&>svg]:shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
        <div className="shrink-0">
          <h2 className="font-heading text-sm font-medium">{getTabTitle()}</h2>
          <Separator className="mt-2" />
        </div>
        {isMobile ? (
          <div className="min-h-0 flex-1 overflow-y-auto pr-3">
            <div className="pt-4 pb-4">{renderContent()}</div>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1 pr-4">
            <div className="pt-4">{renderContent()}</div>
          </ScrollArea>
        )}
      </main>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90dvh] max-h-[90dvh] overflow-hidden rounded-t-2xl p-0"
          showCloseButton={true}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>User Settings</SheetTitle>
          </SheetHeader>
          {settingsContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[min(640px,90vh)] w-[calc(100%-1rem)] overflow-hidden p-0 sm:max-w-3xl" showCloseButton={true}>
        <DialogHeader className="sr-only">
          <DialogTitle>User Settings</DialogTitle>
        </DialogHeader>
        {settingsContent}
      </DialogContent>
    </Dialog>
  )
}
