import { RiLoader2Fill } from "@remixicon/react";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center">
      <RiLoader2Fill className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
