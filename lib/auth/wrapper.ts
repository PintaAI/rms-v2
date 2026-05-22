import type { AuthUser } from "./request-user";
import type { UserRole } from "./request-user";
import { getRequestUser } from "./request-user";
import { getRequestScope, type RequestScope } from "./request-scope";
import { assertCapability, assertFeature } from "./request-scope";
import type { CapabilityKey } from "./request-scope";
import type { FeatureKey } from "@/lib/features";
import { actionError } from "./authorization";
import type { ActionResult, ActionResultWithData } from "./authorization";

export type { AuthUser, UserRole, RequestScope, ActionResult, ActionResultWithData };
export type { CapabilityKey, FeatureKey };

export interface ActionContext {
  user: AuthUser;
}

export interface ScopedActionContext extends ActionContext {
  storeId: string;
  scope: RequestScope;
}

export interface ActionConfig {
  role?: UserRole[];
  capability?: CapabilityKey;
  feature?: FeatureKey;
}

function checkRole(user: AuthUser, allowedRoles?: UserRole[]): ActionResult | null {
  if (!allowedRoles || allowedRoles.length === 0) return null;
  if (!allowedRoles.includes(user.role)) {
    return { success: false, error: "Akses ditolak" };
  }
  return null;
}

export function defineAction<TOutput>(
  config: ActionConfig,
  handler: (ctx: ActionContext) => Promise<TOutput>
): () => Promise<ActionResultWithData<TOutput>> {
  return async function (): Promise<ActionResultWithData<TOutput>> {
    try {
      const user = await getRequestUser();
      if (!user) return { success: false, error: "Silakan login terlebih dahulu" };

      const roleError = checkRole(user, config.role);
      if (roleError) return roleError;

      const result = await handler({ user });

      if (result && typeof result === "object" && "success" in result) {
        return result as ActionResultWithData<TOutput>;
      }

      return { success: true, data: result as TOutput };
    } catch (error) {
      return actionError(error) as ActionResultWithData<TOutput>;
    }
  };
}

export function defineActionWithInput<TInput, TOutput>(
  config: ActionConfig,
  handler: (ctx: ActionContext, input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<ActionResultWithData<TOutput>> {
  return async function (input: TInput): Promise<ActionResultWithData<TOutput>> {
    try {
      const user = await getRequestUser();
      if (!user) return { success: false, error: "Silakan login terlebih dahulu" };

      const roleError = checkRole(user, config.role);
      if (roleError) return roleError;

      const result = await handler({ user }, input);

      if (result && typeof result === "object" && "success" in result) {
        return result as ActionResultWithData<TOutput>;
      }

      return { success: true, data: result as TOutput };
    } catch (error) {
      return actionError(error) as ActionResultWithData<TOutput>;
    }
  };
}

export function defineScopedAction<TOutput>(
  config: ActionConfig,
  handler: (ctx: ScopedActionContext) => Promise<TOutput>
): (storeId: string) => Promise<ActionResultWithData<TOutput>> {
  return async function (storeId: string): Promise<ActionResultWithData<TOutput>> {
    try {
      const user = await getRequestUser();
      if (!user) return { success: false, error: "Silakan login terlebih dahulu" };

      const roleError = checkRole(user, config.role);
      if (roleError) return roleError;

      const scope = await getRequestScope(storeId);

      if (config.capability) assertCapability(scope, config.capability);
      if (config.feature) assertFeature(scope, config.feature);

      const result = await handler({ user, storeId, scope });

      if (result && typeof result === "object" && "success" in result) {
        return result as ActionResultWithData<TOutput>;
      }

      return { success: true, data: result as TOutput };
    } catch (error) {
      return actionError(error) as ActionResultWithData<TOutput>;
    }
  };
}

export function defineScopedActionWithInput<TInput, TOutput>(
  config: ActionConfig,
  handler: (ctx: ScopedActionContext, input: TInput) => Promise<TOutput>
): (input: TInput & { storeId: string }) => Promise<ActionResultWithData<TOutput>> {
  return async function (input: TInput & { storeId: string }): Promise<ActionResultWithData<TOutput>> {
    try {
      const user = await getRequestUser();
      if (!user) return { success: false, error: "Silakan login terlebih dahulu" };

      const roleError = checkRole(user, config.role);
      if (roleError) return roleError;

      const scope = await getRequestScope(input.storeId);

      if (config.capability) assertCapability(scope, config.capability);
      if (config.feature) assertFeature(scope, config.feature);

      const result = await handler({ user, storeId: input.storeId, scope }, input);

      if (result && typeof result === "object" && "success" in result) {
        return result as ActionResultWithData<TOutput>;
      }

      return { success: true, data: result as TOutput };
    } catch (error) {
      return actionError(error) as ActionResultWithData<TOutput>;
    }
  };
}

/**
 * Lightweight helper for actions whose signature doesn't match
 * defineScopedAction / defineScopedActionWithInput.
 * Handles auth, role check, scope resolution, feature/capability assertion,
 * and error wrapping — same guarantees, no wrapper factory.
 */
export async function withScope<T>(
  storeId: string,
  config: ActionConfig,
  handler: (scope: RequestScope) => Promise<T>
): Promise<ActionResultWithData<T>> {
  try {
    const user = await getRequestUser();
    if (!user) return { success: false, error: "Silakan login terlebih dahulu" };

    const roleError = checkRole(user, config.role);
    if (roleError) return roleError;

    const scope = await getRequestScope(storeId);

    if (config.capability) assertCapability(scope, config.capability);
    if (config.feature) assertFeature(scope, config.feature);

    const result = await handler(scope);

    if (result && typeof result === "object" && "success" in result) {
      return result as ActionResultWithData<T>;
    }

    return { success: true, data: result as T };
  } catch (error) {
    return actionError(error) as ActionResultWithData<T>;
  }
}
