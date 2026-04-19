import { getServerSession } from "@/lib/auth";
import { ClientSession } from "@/components/providers/client-session";
import { UserInfo } from "@/components/shared/user-info";

export default async function Home() {
  const serverSession = await getServerSession();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-8 px-16 bg-white dark:bg-black sm:items-start gap-8">
        <UserInfo />

        <div className="w-full">
          <h2 className="text-xl font-semibold mb-4">Server Session</h2>
          <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(serverSession, null, 2)}
          </pre>
        </div>

        <div className="w-full">
          <h2 className="text-xl font-semibold mb-4">Client Session</h2>
          <ClientSession />
        </div>
      </main>
    </div>
  );
}
