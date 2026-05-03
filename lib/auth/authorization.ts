import type { AuthUser } from "./request-user";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ActionResultWithData<T> extends ActionResult {
  data?: T;
}

export type AuthErrorCode = "unauthorized" | "forbidden" | "feature_locked" | "plan_limit";

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message || code);
    this.name = "AuthError";
    this.code = code;
  }
}

export function assertTokoAccess(user: AuthUser, tokoId: string): void {
  if (!user.tokoIds.includes(tokoId)) {
    throw new AuthError("forbidden", "Akses ke toko ini ditolak");
  }
}

export function actionError(error: unknown): ActionResult {
  if (error instanceof AuthError) {
    return { success: false, error: error.message };
  }
  if (error instanceof Error) {
    console.error("Unexpected action error:", error);
    return { success: false, error: "Terjadi kesalahan yang tidak terduga" };
  }
  return { success: false, error: "Terjadi kesalahan yang tidak terduga" };
}
