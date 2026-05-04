"use client";

import * as React from "react";
import { toast } from "sonner";
import { RiLoader4Line } from "@remixicon/react";
import { changePassword } from "@/actions";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordSettingsTab({ onSuccess }: { onSuccess?: () => void }) {
  const { refetchSession } = useAuth();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleUpdatePassword = async () => {
    setError(null);
    if (!currentPassword) return setError("Current password is required");
    if (!newPassword) return setError("New password is required");
    if (newPassword.length < 6) return setError("New password must be at least 6 characters");
    if (newPassword !== confirmPassword) return setError("New password and confirmation do not match");

    setIsUpdating(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.success) {
        setError(result.error || "Failed to change password");
        setIsUpdating(false);
        return;
      }
      await refetchSession();
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to change password");
    }
    setIsUpdating(false);
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3"><p className="text-sm text-destructive">{error}</p></div>}
      <div className="space-y-2"><Label htmlFor="current-password">Current Password</Label><Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Enter current password" /></div>
      <div className="space-y-2"><Label htmlFor="new-password">New Password</Label><Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Enter new password" /></div>
      <div className="space-y-2"><Label htmlFor="confirm-password">Confirm New Password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" /></div>
      <Button className="w-full" onClick={handleUpdatePassword} disabled={isUpdating}>{isUpdating ? <><RiLoader4Line className="mr-2 size-4 animate-spin" />Updating...</> : "Update Password"}</Button>
    </div>
  );
}
