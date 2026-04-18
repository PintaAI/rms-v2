"use client";

import { useSession } from "@/lib/auth-client";

export function ClientSession() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg overflow-auto text-sm">
        Loading...
      </pre>
    );
  }

  return (
    <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg overflow-auto text-sm">
      {JSON.stringify(session, null, 2)}
    </pre>
  );
}