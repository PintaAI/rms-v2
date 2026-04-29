import "dotenv/config";

import { hashPassword } from "@better-auth/utils/password";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to create a superuser");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const email = process.env.SUPERUSER_EMAIL || "superuser@seed.local";
const password = process.env.SUPERUSER_PASSWORD || process.env.SEED_PASSWORD || "test1234";
const name = process.env.SUPERUSER_NAME || "Superuser";

async function main() {
  const passwordHash = await hashPassword(password);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          role: "superuser",
          emailVerified: true,
        },
        select: { id: true, email: true, name: true, role: true },
      })
    : await prisma.user.create({
        data: {
          id: nanoid(),
          name,
          email,
          role: "superuser",
          emailVerified: true,
        },
        select: { id: true, email: true, name: true, role: true },
      });

  const existingCredentialAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
    select: { id: true },
  });

  if (existingCredentialAccount) {
    await prisma.account.update({
      where: { id: existingCredentialAccount.id },
      data: {
        accountId: user.id,
        password: passwordHash,
      },
    });
  } else {
    await prisma.account.create({
      data: {
        id: nanoid(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
      },
    });
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { plan: "enterprise" },
    create: {
      userId: user.id,
      plan: "enterprise",
    },
  });

  console.log("Superuser account is ready");
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
}

main()
  .catch((error) => {
    console.error("Failed to create superuser", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
