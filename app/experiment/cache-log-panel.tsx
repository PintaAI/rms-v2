"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface LogEntry {
  id: string;
  time: string;
  type: "info" | "cache" | "action" | "error";
  message: string;
}

const initialLogs: LogEntry[] = [
  {
    id: "init-1",
    time: new Date().toLocaleTimeString(),
    type: "info",
    message: "Client log panel initialized",
  },
  {
    id: "init-2",
    time: new Date().toLocaleTimeString(),
    type: "info",
    message: "Client cache uses stale time from server (x-nextjs-stale-time header)",
  },
  {
    id: "init-3",
    time: new Date().toLocaleTimeString(),
    type: "info",
    message: "Minimum stale time enforced: 30 seconds",
  },
];

export function CacheLogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry["type"], message: string) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs((prev) => [...prev.slice(-49), entry]);
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      addLog("action", "Auto-refresh triggered (every 10s)");
      router.refresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAutoRefresh, router]);

  const handleManualRefresh = () => {
    addLog("action", "Manual refresh triggered - router.refresh()");
    router.refresh();
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleStartAutoRefresh = () => {
    addLog("action", "Auto-refresh enabled (every 10s)");
    setIsAutoRefresh(true);
  };

  const handleStopAutoRefresh = () => {
    addLog("action", "Auto-refresh disabled");
    setIsAutoRefresh(false);
  };

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return "text-gray-500";
      case "cache":
        return "text-blue-500";
      case "action":
        return "text-green-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getTypeBg = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return "bg-gray-100";
      case "cache":
        return "bg-blue-100";
      case "action":
        return "bg-green-100";
      case "error":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <div className="border rounded-lg bg-white">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-medium text-sm">Client Cache Log</h3>
        <div className="flex gap-2">
          <button
            onClick={handleManualRefresh}
            className="px-2 py-1 text-xs rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
          >
            Refresh
          </button>
          {isAutoRefresh ? (
            <button
              onClick={handleStopAutoRefresh}
              className="px-2 py-1 text-xs rounded bg-green-200 text-green-700"
            >
              Auto ON
            </button>
          ) : (
            <button
              onClick={handleStartAutoRefresh}
              className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Auto OFF
            </button>
          )}
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-700"
          >
            Clear
          </button>
        </div>
      </div>
      <div ref={logRef} className="p-3 h-[600px] overflow-auto space-y-1 text-xs">
        {logs.map((log) => (
          <div key={log.id} className={`flex gap-2 ${getTypeBg(log.type)} rounded p-1`}>
            <span className="text-gray-400 font-mono shrink-0">{log.time}</span>
            <span className={`font-mono ${getTypeColor(log.type)} shrink-0`}>[{log.type}]</span>
            <span className="text-gray-700">{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-400 text-center py-4">No logs yet</div>
        )}
      </div>
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
        <p className="mb-1">
          <strong>Tip:</strong> Server logs appear in terminal where <code className="bg-gray-100 px-1 rounded">bun run dev</code> runs.
        </p>
        <p>
          <strong>Debug:</strong> Set <code className="bg-gray-100 px-1 rounded">NEXT_PRIVATE_DEBUG_CACHE=1</code> for verbose cache logs.
        </p>
      </div>
    </div>
  );
}