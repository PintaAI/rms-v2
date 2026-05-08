import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  createMobileScannerDeviceFromSession,
  createMobileScannerSession,
  deleteMobileScannerSession,
  getLatestMobileScannerSessionForDevice,
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

function notFound() {
  return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
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
      tokoId: payload.tokoId,
      ownerUserId: user.id,
    });

    return NextResponse.json(session);
  }

  if (payload.type === "register-device") {
    if (typeof payload.code !== "string" || payload.code.length === 0) {
      return badRequest("code is required");
    }

    if (typeof payload.token !== "string" || payload.token.length === 0) {
      return badRequest("token is required");
    }

    const device = await createMobileScannerDeviceFromSession(payload.code, payload.token);
    if (!device) return notFound();

    return NextResponse.json(device);
  }

  return badRequest("Unsupported signal type");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  const deviceToken = searchParams.get("deviceToken");

  if (!deviceId) {
    return badRequest("deviceId is required");
  }

  if (!deviceToken) {
    return badRequest("deviceToken is required");
  }

  const result = await getLatestMobileScannerSessionForDevice(deviceId, deviceToken);
  if (!result) return notFound();

  return NextResponse.json(result);
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
