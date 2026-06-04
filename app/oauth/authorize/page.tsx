import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import {
  buildRedirectUri,
  checkExistingConsent,
  createAuthorizationCode,
  getClient,
  getRequestedScopes,
  recordConsent,
  validateAuthorizationRequest,
} from "@/lib/oauth/server";
import { SCOPES } from "@/lib/oauth/types";
import type { AuthorizationRequest } from "@/lib/oauth/types";
import { handleOAuthAuthorize } from "@/actions/oauth";
import { Button } from "@/components/ui/button";

type OAuthSearchParams = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  resource?: string;
};

function buildAuthorizePath(searchParams: OAuthSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  return `/oauth/authorize?${params.toString()}`;
}

async function autoApprove(clientId: string, userId: string, params: AuthorizationRequest) {
  const client = await getClient(clientId);
  if (!client) throw new Error("Invalid client");

  const validationError = validateAuthorizationRequest(client, params);
  if (validationError) throw new Error(validationError);

  const code = await createAuthorizationCode(clientId, userId, params);
  const scopes = getRequestedScopes(params.scope, client);
  await recordConsent(clientId, userId, scopes, true);

  const successParams: Record<string, string> = { code };
  if (params.state) successParams.state = params.state;
  redirect(buildRedirectUri(params.redirectUri, successParams));
}

export default async function OAuthAuthorizePage(props: {
  searchParams: Promise<OAuthSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const clientId = searchParams.client_id;
  const redirectUri = searchParams.redirect_uri;
  const responseType = searchParams.response_type;

  if (!clientId || !redirectUri || !responseType) {
    return <OAuthMessage title="Invalid Request" message="Missing required OAuth parameters: client_id, redirect_uri, and response_type." />;
  }

  const client = await getClient(clientId);
  if (!client) return <OAuthMessage title="Invalid Request" message="Unknown client_id." />;

  const params: AuthorizationRequest = {
    clientId,
    redirectUri,
    responseType,
    scope: searchParams.scope || undefined,
    state: searchParams.state || undefined,
    codeChallenge: searchParams.code_challenge || undefined,
    codeChallengeMethod: searchParams.code_challenge_method || undefined,
    resource: searchParams.resource || undefined,
  };

  const validationError = validateAuthorizationRequest(client, params);
  if (validationError) return <OAuthMessage title="Invalid Request" message={validationError} />;

  const session = await getServerSession();
  if (!session) {
    const currentPath = buildAuthorizePath(searchParams);
    redirect(`/auth?redirect=${encodeURIComponent(currentPath)}`);
  }

  const scopes = getRequestedScopes(searchParams.scope, client);
  const hasConsent = await checkExistingConsent(clientId, session.user.id, scopes);
  if (hasConsent) await autoApprove(clientId, session.user.id, params);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border bg-background p-6 shadow-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Authorize RMS Access</h1>
          <p className="text-sm text-muted-foreground">
            <strong>{client.clientName}</strong> wants to connect to your RMS data through MCP.
          </p>
        </div>

        <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
          <p className="font-medium">This allows the client to:</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 rounded-full bg-primary" />
              <span>{scopes.includes(SCOPES.READ) ? "Read store context, device catalog, inventory, and repair orders." : "No RMS scopes requested."}</span>
            </li>
            {scopes.includes(SCOPES.WRITE) && (
              <li className="flex gap-2">
                <span className="mt-2 size-1.5 rounded-full bg-primary" />
                <span>Create, update, and delete repair orders according to your RMS permissions.</span>
              </li>
            )}
          </ul>
        </div>

        <form action={handleOAuthAuthorize} className="space-y-3">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="response_type" value={responseType} />
          {searchParams.scope && <input type="hidden" name="scope" value={searchParams.scope} />}
          {searchParams.state && <input type="hidden" name="state" value={searchParams.state} />}
          {searchParams.code_challenge && <input type="hidden" name="code_challenge" value={searchParams.code_challenge} />}
          {searchParams.code_challenge_method && <input type="hidden" name="code_challenge_method" value={searchParams.code_challenge_method} />}
          {searchParams.resource && <input type="hidden" name="resource" value={searchParams.resource} />}

          <Button type="submit" name="action" value="approve" className="w-full">Approve</Button>
          <Button type="submit" name="action" value="deny" variant="outline" className="w-full">Deny</Button>
        </form>
      </div>
    </div>
  );
}

function OAuthMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
