"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending, refetch } = useSession();
  const [tokoList, setTokoList] = useState<TokoItem[]>([]);
  const [isTokoLoading, setIsTokoLoading] = useState(true);
  const redirectingRef = useRef(false);

  const fetchTokoList = useCallback(async () => {
    if (!session?.user) return;
    
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
      if (!session?.user) return;

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

  useEffect(() => {
    if (isPending || redirectingRef.current) return;
    
    if (!session?.user) {
      if (!pathname.startsWith("/auth") && !pathname.startsWith("/onboard")) {
        redirectingRef.current = true;
        router.push("/auth");
      }
      return;
    }

    if (pathname.startsWith("/auth")) {
      redirectingRef.current = true;
      router.replace("/dashboard");
      return;
    }

    if (pathname.startsWith("/onboard")) {
      return;
    }

    if (session.user.role === "admin" && tokoList.length === 0 && !isTokoLoading) {
      const onboardCompleted = localStorage.getItem("onboard_completed");
      if (!onboardCompleted) {
        redirectingRef.current = true;
        router.replace("/onboard");
      }
      return;
    }

    const role = session.user.role as "admin" | "staff" | "technician";
    const tokoidMatch = pathname.match(/^\/([^\/]+)\/(admin|staff|teknisi)/);
    
    if (tokoidMatch) {
      const [, tokoid, routeRole] = tokoidMatch;
      const roleMap: Record<string, string> = {
        admin: "admin",
        staff: "staff",
        teknisi: "technician",
      };
      
      if (role !== roleMap[routeRole]) {
        redirectingRef.current = true;
        const basePath = role === "admin" 
          ? `/${tokoid}/admin` 
          : role === "staff" 
            ? `/${tokoid}/staff` 
            : `/${tokoid}/teknisi`;
        router.replace(basePath);
      }
    }
  }, [session, isPending, pathname, router, tokoList, isTokoLoading]);

  const isLoading = isPending || isTokoLoading;

  useEffect(() => {
    redirectingRef.current = false;
  }, [pathname]);

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
