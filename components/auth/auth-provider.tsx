"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { getAuthProviderData } from "@/actions/user";
import { normalizePlan, type SubscriptionPlan } from "@/lib/features";

interface TokoItem {
  id: string;
  name: string;
  status: string;
  role: string;
  logoUrl: string | null;
  address: string | null;
}

interface AuthContextValue {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    subscription?: {
      id: string;
      plan: string;
    } | null;
    plan: SubscriptionPlan;
  } | null;
  tokoList: TokoItem[];
  isLoading: boolean;
  isTokoLoading: boolean;
  refetchTokoList: () => Promise<void>;
  refetchSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  tokoList: [],
  isLoading: true,
  isTokoLoading: true,
  refetchTokoList: async () => {},
  refetchSession: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, isPending, refetch } = useSession();
  const [tokoList, setTokoList] = useState<TokoItem[]>([]);
  const [isTokoLoading, setIsTokoLoading] = useState(true);

  const refetchTokoList = useCallback(async () => {
    if (!session?.user) {
      setTokoList([]);
      setIsTokoLoading(false);
      return;
    }

    setIsTokoLoading(true);
    try {
      const data = await getAuthProviderData();
      setTokoList(data.tokoList);
    } catch (error) {
      console.error("Failed to fetch auth provider data:", error);
    } finally {
      setIsTokoLoading(false);
    }
  }, [session?.user]);

  const refetchSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!session?.user) {
        if (active) {
          setTokoList([]);
          setIsTokoLoading(false);
        }
        return;
      }

      setIsTokoLoading(true);
      try {
        const data = await getAuthProviderData();
        if (active) {
          setTokoList(data.tokoList);
        }
      } catch (error) {
        console.error("Failed to fetch auth provider data:", error);
      } finally {
        if (active) {
          setIsTokoLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [session?.user]);

  const isLoading = isPending || isTokoLoading;

  return (
    <AuthContext.Provider
      value={{
        user: session?.user
          ? {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              role: session.user.role,
              image: session.user.image,
              subscription: session.user.subscription
                ? {
                    id: session.user.subscription.id,
                    plan: session.user.subscription.plan,
                  }
                : null,
              plan: normalizePlan(session.user.subscription?.plan),
            }
          : null,
        tokoList,
        isLoading,
        isTokoLoading,
        refetchTokoList,
        refetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
