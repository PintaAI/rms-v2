import { getDeviceCatalogVersion } from "@/actions/device";
import { getAuthUser } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const version = await getDeviceCatalogVersion();

  return NextResponse.json({ version });
}
