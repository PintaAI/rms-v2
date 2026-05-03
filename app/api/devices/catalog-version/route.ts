import { getDeviceCatalogVersion } from "@/actions/device";
import { getRequestUser } from "@/lib/auth/request-user";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getRequestUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const version = await getDeviceCatalogVersion();

  return NextResponse.json({ version });
}
