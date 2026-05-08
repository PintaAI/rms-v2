import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  createMobileScannerSession,
  deleteMobileScannerSession,
} from "@/lib/mobile-scanner-signaling-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object" || !("type" in body)) {
    return badRequest("Invalid request body");
  }

  const payload = body as Record<string, unknown>;

  if (payload.type === "offer") {
    const user = await getRequestUser();

    if (!user) {
      return unauthorized();
    }

    if (typeof payload.tokoId !== "string" || payload.tokoId.length === 0) {
      return badRequest("tokoId is required");
    }

    if (!user.tokoIds.includes(payload.tokoId)) {
      return forbidden();
    }

    const session = await createMobileScannerSession({
      ownerUserId: user.id,
    });

    return NextResponse.json(session);
  }

  return badRequest("Unsupported signal type");
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const user = await getRequestUser();

  if (!user) {
    return unauthorized();
  }

  if (!code) {
    return badRequest("code is required");
  }

  await deleteMobileScannerSession(code, user.id);
  return NextResponse.json({ ok: true });
}
