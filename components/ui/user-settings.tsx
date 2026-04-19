"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { toast } from "sonner"
import { changePassword, updateProfile, uploadAvatar } from "@/actions"
import { useAuth } from "@/components/auth/auth-provider"
import {
  RiUserLine,
  RiLockPasswordLine,
  RiVipCrownLine,
  RiBankCard2Line,
  RiPencilLine,
  RiLoader4Line,
} from "@remixicon/react"

type SettingsTab = "profile" | "password" | "billing" | "premium"

interface UserSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  } | null
}

const menuItems: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <RiUserLine /> },
  { id: "password", label: "Password", icon: <RiLockPasswordLine /> },
  { id: "billing", label: "Billing", icon: <RiBankCard2Line /> },
  { id: "premium", label: "Upgrade to Premium", icon: <RiVipCrownLine /> },
]

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
    setName(user?.name || "")
    setPreviewUrl(null)
    setSelectedFile(null)
  }, [user?.name, user?.image])

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
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes")
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
    } catch (error: any) {
      setError(error.message || "Failed to change password")
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

function BillingSettings() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Current Plan</p>
            <p className="text-xs text-muted-foreground">Free Plan</p>
          </div>
          <Badge variant="outline">Free</Badge>
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Billing History</p>
        <div className="text-xs text-muted-foreground">No billing history available</div>
      </div>
      <Separator />
      <div className="space-y-2">
        <p className="font-medium">Payment Method</p>
        <Button variant="outline" className="w-full">
          Add Payment Method
        </Button>
      </div>
    </div>
  )
}

function PremiumSettings() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <RiVipCrownLine className="size-5 text-primary" />
          <p className="font-medium">Premium Features</p>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Unlimited services tracking</li>
          <li>Advanced analytics dashboard</li>
          <li>Priority customer support</li>
          <li>Custom branding options</li>
          <li>API access</li>
        </ul>
      </div>
      <div className="space-y-2">
        <p className="font-medium">Pricing</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">$19.99</span>
          <span className="text-xs text-muted-foreground">/month</span>
        </div>
      </div>
      <Button className="w-full">
        <RiVipCrownLine className="size-4 mr-2" />
        Upgrade to Premium
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Cancel anytime. No questions asked.
      </p>
    </div>
  )
}

export function UserSettings({ open, onOpenChange, user }: UserSettingsProps) {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("profile")

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setActiveTab("profile")
    }
    onOpenChange(newOpen)
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings user={user} onSuccess={() => onOpenChange(false)} />
      case "password":
        return <PasswordSettings onSuccess={() => onOpenChange(false)} />
      case "billing":
        return <BillingSettings />
      case "premium":
        return <PremiumSettings />
      default:
        return <ProfileSettings user={user} onSuccess={() => onOpenChange(false)} />
    }
  }

  const getTabTitle = () => {
    const item = menuItems.find((i) => i.id === activeTab)
    return item?.label || "Settings"
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-3xl h-[500px] p-0 overflow-hidden" showCloseButton={true}>
        <DialogHeader className="sr-only">
          <DialogTitle>User Settings</DialogTitle>
        </DialogHeader>
        <SidebarProvider defaultOpen={true} className="h-full">
          <div className="flex h-full w-full">
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
            <main className="flex-1 p-6 overflow-auto">
              <div className="mb-4">
                <h2 className="font-heading text-sm font-medium">{getTabTitle()}</h2>
                <Separator className="mt-2" />
              </div>
              {renderContent()}
            </main>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}