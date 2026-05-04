import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to backfill subscriptions");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const PRO_PERIOD_DAYS = 30;
const GRACE_PERIOD_DAYS = 7;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function main() {
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({
    select: {
      id: true,
      plan: true,
      status: true,
      createdAt: true,
      trialEndsAt: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      graceEndsAt: true,
      proTrialStartedAt: true,
    },
  });

  let updated = 0;

  for (const subscription of subscriptions) {
    if (subscription.plan === "free") {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          trialEndsAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          graceEndsAt: null,
          cancelledAt: null,
        },
      });
      updated += 1;
      continue;
    }

    if (subscription.plan === "premium") {
      if (subscription.status === "trialing") {
        const trialEndsAt = subscription.trialEndsAt ?? addDays(subscription.proTrialStartedAt ?? now, 30);
        if (trialEndsAt <= now) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              plan: "free",
              status: "active",
              trialEndsAt: null,
              currentPeriodStart: null,
              currentPeriodEnd: null,
              graceEndsAt: null,
              cancelledAt: null,
            },
          });
          updated += 1;
          continue;
        }
      }

      const currentPeriodStart = subscription.currentPeriodStart ?? now;
      const currentPeriodEnd = subscription.currentPeriodEnd ?? addDays(now, PRO_PERIOD_DAYS);

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: subscription.status === "trialing" ? "trialing" : currentPeriodEnd > now ? "active" : "past_due",
          trialEndsAt: subscription.status === "trialing" ? subscription.trialEndsAt : null,
          currentPeriodStart,
          currentPeriodEnd,
          graceEndsAt: currentPeriodEnd > now ? null : subscription.graceEndsAt ?? addDays(currentPeriodEnd, GRACE_PERIOD_DAYS),
          cancelledAt: null,
        },
      });
      updated += 1;
      continue;
    }

    if (subscription.plan === "enterprise") {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          trialEndsAt: null,
          currentPeriodStart: subscription.currentPeriodStart ?? now,
          currentPeriodEnd: null,
          graceEndsAt: null,
          cancelledAt: null,
        },
      });
      updated += 1;
    }
  }

  console.info(`Backfilled ${updated} subscription records.`);
}

main()
  .catch((error) => {
    console.error("Subscription backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
