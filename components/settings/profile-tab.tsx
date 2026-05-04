"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RiLoader4Line, RiPencilLine, RiUserLine } from "@remixicon/react";
import { updateProfile, uploadAvatar } from "@/actions";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { SettingsUser } from "./types";

export function ProfileSettingsTab({ user, onSuccess }: { user?: SettingsUser | null; onSuccess?: () => void }) {
  const router = useRouter();
  const { refetchSession } = useAuth();
  const [name, setName] = React.useState(user?.name || "");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (selectedFile) {
        setIsUploadingAvatar(true);
        const uploadResult = await uploadAvatar(selectedFile);
        setIsUploadingAvatar(false);
        if (!uploadResult.success) {
          toast.error(uploadResult.error || "Failed to upload avatar");
          setIsSaving(false);
          return;
        }
        setPreviewUrl(uploadResult.data || null);
        setSelectedFile(null);
      }

      if (name !== user?.name) {
        const result = await updateProfile(name);
        if (!result.success) {
          toast.error(result.error || "Failed to update profile");
          setIsSaving(false);
          return;
        }
      }

      await refetchSession();
      toast.success("Profile updated successfully");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="group relative">
          <Avatar className="size-24">
            {previewUrl ? <AvatarImage src={previewUrl} alt="Preview" /> : user?.image ? <AvatarImage src={user.image} alt={user.name || "User"} /> : <AvatarFallback><RiUserLine className="size-8" /></AvatarFallback>}
          </Avatar>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100" disabled={isUploadingAvatar}>
            {isUploadingAvatar ? <RiLoader4Line className="size-5 animate-spin text-white" /> : <RiPencilLine className="size-5 text-white" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
      </div>
      {selectedFile && <p className="text-center text-xs text-muted-foreground">New image selected. Click Save Changes to upload.</p>}
      <Separator />
      <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" /></div>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={user?.email || ""} disabled className="bg-muted" /></div>
      <div className="space-y-2"><Label htmlFor="role">Role</Label><Input id="role" value={user?.role || ""} disabled className="bg-muted" /></div>
      <Button className="w-full" onClick={handleSave} disabled={isSaving}>{isSaving ? <><RiLoader4Line className="mr-2 size-4 animate-spin" />Saving...</> : "Save Changes"}</Button>
    </div>
  );
}
