import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

const logTimestamp = () => new Date().toISOString();

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get("tag");
  const path = request.nextUrl.searchParams.get("path");

  console.log(`[${logTimestamp()}] [API] GET /api/cache-demo - tag=${tag}, path=${path}`);

  if (tag) {
    console.log(`[${logTimestamp()}] [API] Calling revalidateTag("${tag}", "max")`);
    revalidateTag(tag, "max");
    console.log(`[${logTimestamp()}] [API] Tag revalidation complete`);
    return Response.json({
      success: true,
      action: "revalidateTag",
      tag,
      mode: "SWR",
      timestamp: new Date().toISOString(),
    });
  }

  if (path) {
    console.log(`[${logTimestamp()}] [API] Calling revalidatePath("${path}")`);
    revalidateTag(`path-${path}`, "max");
    console.log(`[${logTimestamp()}] [API] Path revalidation via tag complete`);
    return Response.json({
      success: true,
      action: "revalidatePath",
      path,
      mode: "SWR",
      timestamp: new Date().toISOString(),
      note: "Route handlers use revalidateTag for path-based invalidation",
    });
  }

  return Response.json({
    success: false,
    message: "Provide 'tag' or 'path' query parameter",
    examples: [
      "/api/cache-demo?tag=cache-demo-seconds",
      "/api/cache-demo?tag=tagged-data",
      "/api/cache-demo?path=/experiment",
    ],
    availableTags: [
      "cache-demo-seconds",
      "cache-demo-minutes",
      "cache-demo-hours",
      "cache-demo-days",
      "cache-demo-max",
      "cache-demo-custom",
      "tagged-data",
      "demo-collection",
    ],
  });
}