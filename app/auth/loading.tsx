export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Checking authentication...</p>
      </div>
    </div>
  );
}