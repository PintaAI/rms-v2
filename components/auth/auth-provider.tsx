"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { getUserTokoList } from "@/actions/user";

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

  const fetchTokoList = useCallback(async () => {
    if (!session?.user) {
      setTokoList([]);
      setIsTokoLoading(false);
      return;
    }
    
    setIsTokoLoading(true);
    try {
      const list = await getUserTokoList();
      setTokoList(list);
    } catch (error) {
      console.error("Failed to fetch toko list:", error);
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
        const list = await getUserTokoList();
        if (active) {
          setTokoList(list);
        }
      } catch (error) {
        console.error("Failed to fetch toko list:", error);
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
            }
          : null,
        tokoList,
        isLoading,
        isTokoLoading,
        refetchTokoList: fetchTokoList,
        refetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
