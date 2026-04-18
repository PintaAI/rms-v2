import { createAuthClient } from "better-auth/react";
import type { SessionData } from "./auth";

const baseURL = process.env.NEXT_PUBLIC_APP_URL;

export const authClient = createAuthClient({
  baseURL,
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});

export const { signIn, signUp, signOut } = authClient;

export function useSession() {
  return authClient.useSession() as {
    data: SessionData | null;
    isPending: boolean;
    isRefetching: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
  };
}