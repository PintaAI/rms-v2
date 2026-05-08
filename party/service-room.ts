import type * as Party from "partykit/server";
import { isServiceRealtimeEvent } from "../lib/realtime/service-realtime-types";
import { parseMobileScannerMessage, type ScannerRealtimeClientMessage } from "../lib/realtime/scanner-realtime-types";

const SCANNER_ROOM_PREFIX = "scanner-";

type ScannerRole = "host" | "guest";

export default class ServiceRoom implements Party.Server {
  private readonly connections = new Map<string, Party.Connection>();
  private scannerToken: string | null = null;
  private scannerExpiresAt = 0;
  private scannerHostId: string | null = null;
  private scannerGuestId: string | null = null;

  constructor(readonly room: Party.Room) {}

  onRequest() {
    return Response.json({ ok: true, room: this.room.id });
  }

  onConnect(connection: Party.Connection) {
    this.connections.set(connection.id, connection);
  }

  onClose(connection: Party.Connection) {
    this.connections.delete(connection.id);

    if (!this.isScannerRoom()) return;

    if (connection.id === this.scannerHostId) {
      this.scannerHostId = null;
      this.scannerToken = null;
      this.scannerExpiresAt = 0;
      this.sendToGuest({ type: "scanner.peer-left", role: "host", at: Date.now() });
    }

    if (connection.id === this.scannerGuestId) {
      this.scannerGuestId = null;
      this.sendToHost({ type: "scanner.peer-left", role: "guest", at: Date.now() });
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    if (this.isScannerRoom()) {
      this.handleScannerMessage(message, sender);
      return;
    }

    this.handleServiceMessage(message, sender);
  }

  private isScannerRoom() {
    return this.room.id.startsWith(SCANNER_ROOM_PREFIX);
  }

  private handleServiceMessage(message: string, sender: Party.Connection) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (!isServiceRealtimeEvent(parsed)) return;
    if (this.room.id !== `toko-${parsed.tokoId}`) return;

    this.room.broadcast(JSON.stringify(parsed), [sender.id]);
  }

  private handleScannerMessage(message: string, sender: Party.Connection) {
    let parsed: ScannerRealtimeClientMessage | null = null;

    try {
      parsed = JSON.parse(message) as ScannerRealtimeClientMessage;
    } catch {
      return;
    }

    if (parsed.type === "scanner.host-init") {
      this.handleScannerInit("host", sender, parsed.token, parsed.expiresAt);
      return;
    }

    if (parsed.type === "scanner.guest-init") {
      this.handleScannerInit("guest", sender, parsed.token);
      return;
    }

    const scannerMessage = parseMobileScannerMessage(message);
    if (!scannerMessage || !this.isScannerPeer(sender.id)) return;

    if (sender.id === this.scannerGuestId) {
      this.sendToHost(scannerMessage);
    } else if (sender.id === this.scannerHostId) {
      this.sendToGuest(scannerMessage);
    }
  }

  private handleScannerInit(role: ScannerRole, connection: Party.Connection, token: string, expiresAt?: number) {
    if (!token) {
      connection.send(JSON.stringify({ type: "scanner.auth-error", message: "Token scanner tidak valid", at: Date.now() }));
      return;
    }

    if (role === "host") {
      this.scannerToken = token;
      this.scannerExpiresAt = typeof expiresAt === "number" ? expiresAt : Date.now() + 90_000;
      this.scannerHostId = connection.id;
      this.sendToHost({ type: "scanner.peer-ready", role: "host", at: Date.now() });

      if (this.scannerGuestId) {
        this.sendToGuest({ type: "scanner.peer-ready", role: "host", at: Date.now() });
      }

      return;
    }

    if (!this.scannerToken || this.scannerToken !== token || this.scannerExpiresAt <= Date.now()) {
      connection.send(JSON.stringify({ type: "scanner.auth-error", message: "Pairing scanner sudah kedaluwarsa", at: Date.now() }));
      return;
    }

    this.scannerGuestId = connection.id;
    this.sendToGuest({ type: "scanner.peer-ready", role: "guest", at: Date.now() });
    this.sendToHost({ type: "scanner.peer-ready", role: "guest", at: Date.now() });
  }

  private isScannerPeer(connectionId: string) {
    return connectionId === this.scannerHostId || connectionId === this.scannerGuestId;
  }

  private sendToHost(payload: unknown) {
    if (!this.scannerHostId) return;
    this.connections.get(this.scannerHostId)?.send(JSON.stringify(payload));
  }

  private sendToGuest(payload: unknown) {
    if (!this.scannerGuestId) return;
    this.connections.get(this.scannerGuestId)?.send(JSON.stringify(payload));
  }
}
