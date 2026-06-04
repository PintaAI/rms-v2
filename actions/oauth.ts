"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import {
  buildRedirectUri,
  createAuthorizationCode,
  getClient,
  getRequestedScopes,
  recordConsent,
  validateAuthorizationRequest,
} from "@/lib/oauth/server";
import type { AuthorizationRequest } from "@/lib/oauth/types";

export async function handleOAuthAuthorize(formData: FormData) {
  const session = await getServerSession();
  if (!session) throw new Error("Not authenticated");

  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const responseType = String(formData.get("response_type") ?? "");
  const scope = String(formData.get("scope") ?? "");
  const state = String(formData.get("state") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const codeChallengeMethod = String(formData.get("code_challenge_method") ?? "");
  const resource = String(formData.get("resource") ?? "");
  const action = String(formData.get("action") ?? "");

  const client = await getClient(clientId);
  if (!client) throw new Error("Invalid client");

  const params: AuthorizationRequest = {
    clientId,
    redirectUri,
    responseType,
    scope: scope || undefined,
    state: state || undefined,
    codeChallenge: codeChallenge || undefined,
    codeChallengeMethod: codeChallengeMethod || undefined,
    resource: resource || undefined,
  };

  const validationError = validateAuthorizationRequest(client, params);
  if (validationError) throw new Error(validationError);

  if (action !== "approve") {
    const errorParams: Record<string, string> = { error: "access_denied" };
    if (state) errorParams.state = state;
    redirect(buildRedirectUri(redirectUri, errorParams));
  }

  const code = await createAuthorizationCode(clientId, session.user.id, params);
  const scopes = getRequestedScopes(scope || undefined, client);
  await recordConsent(clientId, session.user.id, scopes, true);

  const successParams: Record<string, string> = { code };
  if (state) successParams.state = state;
  redirect(buildRedirectUri(redirectUri, successParams));
}
