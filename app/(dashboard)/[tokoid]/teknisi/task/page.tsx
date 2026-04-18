"use client";

import { useSearchParams } from "next/navigation";

export default function TeknisiTaskPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Task</h1>
      <p className="text-muted-foreground">
        Status filter: {status || "Semua task"}
      </p>
    </div>
  );
}