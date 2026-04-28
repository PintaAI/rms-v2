import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { headers } from "next/headers";
import { kv } from "@vercel/kv";
import prisma from "./prisma";

const devOrigins = [
  "http://localhost:3000",
  "http://100.127.81.7:3000",
  "http://100.108.102.102:3000",
  "http://192.168.0.102:3000",
  "http://127.0.0.1:3000",
];

const trustedOrigins =
  process.env.DEV_MODE === "true"
    ? devOrigins
    : [
        process.env.BETTER_AUTH_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000",
      ];

export const auth = betterAuth({
  trustedOrigins,

  secondaryStorage: {
    get: async (key) => await kv.get(key),
    set: async (key, value, ttl) => {
      if (ttl) await kv.set(key, value, { ex: ttl });
      else await kv.set(key, value);
    },
    delete: async (key) => { await kv.del(key); },
  },

  rateLimit: {
    storage: "secondary-storage",
    window: 60,
    max: 100,
    customRules: {
      "/sign-up/email": { window: 3600, max: 3 },
      "/sign-in/email": { window: 60, max: 5 },
    },
  },

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "admin",
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned as
        | { user?: { id: string }; session?: { id: string } }
        | undefined;

      if (!returned?.user) return;

      if (ctx.path === "/sign-up/email") {
        const existingSubscription = await prisma.subscription.findUnique({
          where: { userId: returned.user.id },
        });

        if (!existingSubscription) {
          await prisma.subscription.create({
            data: {
              userId: returned.user.id,
              plan: "free",
            },
          });
        }
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId: returned.user.id },
        select: {
          id: true,
          plan: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return ctx.json({
        ...returned,
        user: {
          ...returned.user,
          subscription,
        },
      });
    }),
  },
});

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: string;
  subscription?: {
    id: string;
    plan: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

export type SessionData = {
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    userId: string;
  };
  user: SessionUser;
};

export async function getServerSession(): Promise<SessionData | null> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  return session as SessionData | null;
}
