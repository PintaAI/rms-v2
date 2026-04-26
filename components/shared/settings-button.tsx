"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RiSettings3Line } from "@remixicon/react";
import { UserSettings } from "@/components/ui/user-settings";
import { useSession } from "@/lib/auth-client";

export function SettingsButton() {
  const { data: session } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => setSettingsOpen(true)}
      >
        <RiSettings3Line className="size-4" />
      </Button>
      <UserSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={session?.user}
      />
    </>
  );
}
