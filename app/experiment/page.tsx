import { Suspense } from "react";
import {
  getStaticData,
  getCachedSeconds,
  getCachedMinutes,
  getCachedHours,
  getCachedDays,
  getCachedMax,
  getCachedCustom,
  getDynamicData,
  getTaggedData,
} from "./actions";
import { CacheLogPanel } from "./cache-log-panel";

async function CachedSection({
  title,
  fetcher,
  profile,
  tag,
}: {
  title: string;
  fetcher: () => Promise<{ fetchedAt: number; message: string; serverTime: string } & Record<string, unknown>>;
  profile: string;
  tag: string;
}) {
  const data = await fetcher();

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">{profile}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{data.message}</p>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Server time:</span>
          <span className="font-mono">{data.serverTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Tag:</span>
          <span className="font-mono text-xs">{tag}</span>
        </div>
      </div>
      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer">View data</summary>
        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

async function DynamicSection() {
  const data = await getDynamicData();

  return (
    <div className="border rounded-lg p-4 bg-green-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">Dynamic (connection())</h3>
        <span className="text-xs px-2 py-1 rounded bg-green-200 text-green-700">fresh per request</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{data.message}</p>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Request ID:</span>
          <span className="font-mono">{data.requestId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Server time:</span>
          <span className="font-mono">{data.serverTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Live users:</span>
          <span className="font-mono">{data.liveData.currentUsers}</span>
        </div>
      </div>
      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer">View data</summary>
        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

async function StaticSection() {
  const data = await getStaticData();

  return (
    <div className="border rounded-lg p-4 bg-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">Cached Static</h3>
        <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">use cache + max</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{data.message}</p>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Build time:</span>
          <span className="font-mono">{data.buildTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Math result:</span>
          <span className="font-mono">{data.mathResult}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Constant:</span>
          <span className="font-mono">{data.constantValue}</span>
        </div>
      </div>
    </div>
  );
}

async function TaggedSection() {
  const data = await getTaggedData();

  return (
    <div className="border rounded-lg p-4 bg-purple-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">Tagged Cache</h3>
        <span className="text-xs px-2 py-1 rounded bg-purple-200 text-purple-700">multi-tagged</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{data.message}</p>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Server time:</span>
          <span className="font-mono">{data.serverTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Tags:</span>
          <span className="font-mono text-xs">tagged-data, demo-collection</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Items:</span>
          <span className="font-mono">{data.items.length}</span>
        </div>
      </div>
      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer">View data</summary>
        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

async function RevalidationControls() {
  const {
    triggerRevalidatePath,
    triggerRevalidateTag,
    triggerUpdateTag,
    triggerRevalidateAll,
  } = await import("./actions");

  async function revalidatePathAction() {
    "use server";
    await triggerRevalidatePath("/experiment");
  }

  async function revalidateAllAction() {
    "use server";
    await triggerRevalidateAll();
  }

  async function revalidateTagSeconds() {
    "use server";
    await triggerRevalidateTag("cache-demo-seconds");
  }

  async function updateTagSeconds() {
    "use server";
    await triggerUpdateTag("cache-demo-seconds");
  }

  async function revalidateTagMinutes() {
    "use server";
    await triggerRevalidateTag("cache-demo-minutes");
  }

  async function updateTagMinutes() {
    "use server";
    await triggerUpdateTag("cache-demo-minutes");
  }

  async function revalidateTagTagged() {
    "use server";
    await triggerRevalidateTag("tagged-data");
  }

  async function updateTagTagged() {
    "use server";
    await triggerUpdateTag("tagged-data");
  }

  return (
    <div className="border rounded-lg p-4 bg-yellow-50">
      <h3 className="font-medium text-sm mb-3">Cache Revalidation Controls</h3>
      <div className="grid gap-2">
        <div className="flex gap-2">
          <form action={revalidatePathAction} className="flex-1">
            <button type="submit" className="w-full px-3 py-2 text-xs rounded bg-yellow-200 hover:bg-yellow-300">
              revalidatePath(&quot;/experiment&quot;)
            </button>
          </form>
          <form action={revalidateAllAction} className="flex-1">
            <button type="submit" className="w-full px-3 py-2 text-xs rounded bg-red-200 hover:bg-red-300">
              Invalidate All Caches
            </button>
          </form>
        </div>
        <div className="text-xs text-gray-500 mb-2">Tag-based revalidation:</div>
        <div className="grid grid-cols-2 gap-2">
          <form action={revalidateTagSeconds}>
            <button type="submit" className="w-full px-2 py-1.5 text-xs rounded bg-orange-100 hover:bg-orange-200">
              revalidateTag(&quot;seconds&quot;) [SWR]
            </button>
          </form>
          <form action={updateTagSeconds}>
            <button type="submit" className="w-full px-2 py-1.5 text-xs rounded bg-orange-300 hover:bg-orange-400">
              updateTag(&quot;seconds&quot;) [immediate]
            </button>
          </form>
          <form action={revalidateTagMinutes}>
            <button type="submit" className="w-full px-2 py-1.5 text-xs rounded bg-orange-100 hover:bg-orange-200">
              revalidateTag(&quot;minutes&quot;) [SWR]
            </button>
          </form>
          <form action={updateTagMinutes}>
            <button type="submit" className="w-full px-2 py-1.5 text-xs rounded bg-orange-300 hover:bg-orange-400">
              updateTag(&quot;minutes&quot;) [immediate]
            </button>
          </form>
          <form action={revalidateTagTagged}>
            <button type="submit" className="w-full px-2 py-1.5 text-xs rounded bg-purple-100 hover:bg-purple-200">
              revalidateTag(&quot;tagged-data&quot;) [SWR]
            </button>
          </form>
          <form action={updateTagTagged}>
            <button type="submit" className="w-full px-2 py-1.5 text-xs rounded bg-purple-300 hover:bg-purple-400">
              updateTag(&quot;tagged-data&quot;) [immediate]
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default async function ExperimentPage() {
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Next.js 16 Cache Components Demo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Demonstrates all caching strategies with server and client-side logging.
            <br />
            <strong>Server logs:</strong> Check terminal where <code className="bg-gray-100 px-1 rounded">bun run dev</code> runs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StaticSection />
              <Suspense fallback={<div className="border rounded-lg p-4 bg-green-50"><p className="text-xs text-gray-500">Loading dynamic...</p></div>}>
                <DynamicSection />
              </Suspense>
            </div>

            <div className="border rounded-lg p-4 bg-blue-50">
              <h2 className="font-medium mb-3 flex items-center gap-2">
                <span>Cached Content (use cache + cacheLife)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-200 text-blue-700">PPR Static Shell</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CachedSection title="Seconds Profile" fetcher={getCachedSeconds} profile="seconds" tag="cache-demo-seconds" />
                <CachedSection title="Minutes Profile" fetcher={getCachedMinutes} profile="minutes" tag="cache-demo-minutes" />
                <CachedSection title="Hours Profile" fetcher={getCachedHours} profile="hours" tag="cache-demo-hours" />
                <CachedSection title="Days Profile" fetcher={getCachedDays} profile="days" tag="cache-demo-days" />
                <CachedSection title="Max Profile" fetcher={getCachedMax} profile="max" tag="cache-demo-max" />
                <CachedSection title="Custom Profile" fetcher={getCachedCustom} profile="custom" tag="cache-demo-custom" />
              </div>
            </div>

            <TaggedSection />

            <RevalidationControls />
          </div>

          <div className="lg:col-span-1">
            <CacheLogPanel />
          </div>
        </div>

        <div className="mt-8 border rounded-lg p-4 bg-gray-100">
          <h2 className="font-medium mb-3">Cache Profile Reference</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-2 text-left">Profile</th>
                <th className="py-2 px-2 text-left">Stale (client)</th>
                <th className="py-2 px-2 text-left">Revalidate</th>
                <th className="py-2 px-2 text-left">Expire</th>
                <th className="py-2 px-2 text-left">Use Case</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b">
                <td className="py-1.5 px-2 font-mono">seconds</td>
                <td className="py-1.5 px-2">30s</td>
                <td className="py-1.5 px-2">1s</td>
                <td className="py-1.5 px-2">1m</td>
                <td className="py-1.5 px-2">Real-time data</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-2 font-mono">minutes</td>
                <td className="py-1.5 px-2">5m</td>
                <td className="py-1.5 px-2">1m</td>
                <td className="py-1.5 px-2">1h</td>
                <td className="py-1.5 px-2">Social feeds, news</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-2 font-mono">hours</td>
                <td className="py-1.5 px-2">5m</td>
                <td className="py-1.5 px-2">1h</td>
                <td className="py-1.5 px-2">1d</td>
                <td className="py-1.5 px-2">Inventory, weather</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-2 font-mono">days</td>
                <td className="py-1.5 px-2">5m</td>
                <td className="py-1.5 px-2">1d</td>
                <td className="py-1.5 px-2">1w</td>
                <td className="py-1.5 px-2">Blog posts</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-2 font-mono">weeks</td>
                <td className="py-1.5 px-2">5m</td>
                <td className="py-1.5 px-2">1w</td>
                <td className="py-1.5 px-2">30d</td>
                <td className="py-1.5 px-2">Podcasts, newsletters</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 px-2 font-mono">max</td>
                <td className="py-1.5 px-2">5m</td>
                <td className="py-1.5 px-2">30d</td>
                <td className="py-1.5 px-2">1y</td>
                <td className="py-1.5 px-2">Legal pages, archived</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-mono">custom</td>
                <td className="py-1.5 px-2">2m</td>
                <td className="py-1.5 px-2">5m</td>
                <td className="py-1.5 px-2">10m</td>
                <td className="py-1.5 px-2">Promotions, offers</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 border rounded-lg p-4 bg-gray-100">
          <h2 className="font-medium mb-3">Revalidation API Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-white rounded">
              <h3 className="font-medium mb-1">revalidatePath(path, type)</h3>
              <p className="text-gray-500">Invalidates specific page/layout. Next visit fetches fresh data.</p>
              <p className="text-gray-400 mt-1">Use: Route Handlers, Server Actions</p>
            </div>
            <div className="p-3 bg-white rounded">
              <h3 className="font-medium mb-1">revalidateTag(tag, profile)</h3>
              <p className="text-gray-500">SWR: serves stale while fetching fresh. Use profile=&quot;max&quot;.</p>
              <p className="text-gray-400 mt-1">Use: Route Handlers, Server Actions</p>
            </div>
            <div className="p-3 bg-white rounded">
              <h3 className="font-medium mb-1">updateTag(tag)</h3>
              <p className="text-gray-500">Immediate: blocks until fresh data ready. Read-your-own-writes.</p>
              <p className="text-gray-400 mt-1">Use: Server Actions ONLY</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}