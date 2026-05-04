import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  createMobileScannerDeviceFromSession,
  createMobileScannerSession,
  deleteMobileScannerSession,
  getLatestMobileScannerSessionForDevice,
  getMobileScannerSessionForGuest,
  getMobileScannerSessionForHost,
  listMobileScannerDevicesForUser,
  revokeMobileScannerDevice,
  setMobileScannerAnswer,
  setMobileScannerAnswerForDevice,
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

    if (typeof payload.sdp !== "string" || payload.sdp.length === 0) {
      return badRequest("sdp is required");
    }

    const session = await createMobileScannerSession({
      tokoId: payload.tokoId,
      ownerUserId: user.id,
      offer: payload.sdp,
    });

    return NextResponse.json(session);
  }

  if (payload.type === "answer") {
    if (typeof payload.code !== "string" || payload.code.length === 0) {
      return badRequest("code is required");
    }

    if (typeof payload.token !== "string" || payload.token.length === 0) {
      return badRequest("token is required");
    }

    if (typeof payload.sdp !== "string" || payload.sdp.length === 0) {
      return badRequest("sdp is required");
    }

    const ok = await setMobileScannerAnswer(payload.code, payload.token, payload.sdp);

    if (!ok) {
      return notFound();
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.type === "saved-answer") {
    if (typeof payload.code !== "string" || payload.code.length === 0) {
      return badRequest("code is required");
    }

    if (typeof payload.deviceId !== "string" || payload.deviceId.length === 0) {
      return badRequest("deviceId is required");
    }

    if (typeof payload.deviceToken !== "string" || payload.deviceToken.length === 0) {
      return badRequest("deviceToken is required");
    }

    if (typeof payload.sdp !== "string" || payload.sdp.length === 0) {
      return badRequest("sdp is required");
    }

    const ok = await setMobileScannerAnswerForDevice(payload.code, payload.deviceId, payload.deviceToken, payload.sdp);

    if (!ok) {
      return notFound();
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.type === "register-device") {
    if (typeof payload.code !== "string" || payload.code.length === 0) {
      return badRequest("code is required");
    }

    if (typeof payload.token !== "string" || payload.token.length === 0) {
      return badRequest("token is required");
    }

    const name = typeof payload.name === "string" ? payload.name : "Phone scanner";
    const result = await createMobileScannerDeviceFromSession(payload.code, payload.token, name);

    if (!result) {
      return notFound();
    }

    return NextResponse.json(result);
  }

  return badRequest("Unsupported signal type");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (searchParams.get("role") === "host") {
    const user = await getRequestUser();

    if (!code) {
      return badRequest("code is required");
    }

    if (!user) {
      return unauthorized();
    }

    const session = await getMobileScannerSessionForHost(code, user.id);

    if (!session) {
      return notFound();
    }

    return NextResponse.json({ answer: session.answer });
  }

  if (searchParams.get("role") === "devices") {
    const user = await getRequestUser();
    const tokoId = searchParams.get("tokoId");

    if (!user) {
      return unauthorized();
    }

    if (!tokoId) {
      return badRequest("tokoId is required");
    }

    if (!user.tokoIds.includes(tokoId)) {
      return forbidden();
    }

    const devices = await listMobileScannerDevicesForUser({ userId: user.id, role: user.role, tokoId });
    return NextResponse.json({ devices });
  }

  if (searchParams.get("role") === "saved-device") {
    const deviceId = searchParams.get("deviceId");
    const deviceToken = searchParams.get("deviceToken");

    if (!deviceId) {
      return badRequest("deviceId is required");
    }

    if (!deviceToken) {
      return badRequest("deviceToken is required");
    }

    const result = await getLatestMobileScannerSessionForDevice(deviceId, deviceToken);

    if (!result) {
      return notFound();
    }

    return NextResponse.json({
      device: {
        id: result.device.id,
        name: result.device.name,
        tokoId: result.device.tokoId,
      },
      session: result.session
        ? {
            code: result.session.code,
            offer: result.session.offer,
            tokoId: result.session.tokoId,
          }
        : null,
    });
  }

  const token = searchParams.get("token");

  if (!code) {
    return badRequest("code is required");
  }

  if (!token) {
    return badRequest("token is required");
  }

  const session = await getMobileScannerSessionForGuest(code, token);

  if (!session) {
    return notFound();
  }

  return NextResponse.json({ offer: session.offer, tokoId: session.tokoId });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const deviceId = searchParams.get("deviceId");
  const user = await getRequestUser();

  if (!user) {
    return unauthorized();
  }

  if (deviceId) {
    const ok = await revokeMobileScannerDevice({
      deviceId,
      userId: user.id,
      role: user.role,
      tokoIds: user.tokoIds,
    });

    if (!ok) {
      return notFound();
    }

    return NextResponse.json({ ok: true });
  }

  if (!code) {
    return badRequest("code is required");
  }

  await deleteMobileScannerSession(code, user.id);
  return NextResponse.json({ ok: true });
}
