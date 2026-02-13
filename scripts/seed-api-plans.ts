// Seed the API plans into the database
// Run: npx tsx scripts/seed-api-plans.ts

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://shaan@localhost:5432/privatepay";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const plans = [
  {
    name: "starter",
    displayName: "Starter",
    priceMonthly: 2999, // $2,999 one-time fee
    cardsPerMonth: 500,
    requestsPerMin: 60,
    cardIssueFee: 20.0,    // $20 per card issued
    cardFundFee: 1.0,      // $1 per funding
    markupPercent: 3.0,    // 3% on card load
    liveCards: true,
    testMode: true,
    webhooks: false,
    ipWhitelist: false,
    prioritySupport: false,
    dedicatedBin: false,
    customBranding: false,
  },
  {
    name: "growth",
    displayName: "Growth",
    priceMonthly: 7999, // $7,999 one-time fee
    cardsPerMonth: 2500,
    requestsPerMin: 200,
    cardIssueFee: 9.0,     // $9 per card issued
    cardFundFee: 1.0,      // $1 per funding
    markupPercent: 2.0,    // 2% on card load
    liveCards: true,
    testMode: true,
    webhooks: true,
    ipWhitelist: true,
    prioritySupport: true,
    dedicatedBin: false,
    customBranding: false,
  },
];

async function seed() {
  console.log("Seeding API plans...");

  for (const plan of plans) {
    await prisma.apiPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`  ✓ ${plan.displayName} — $${plan.priceMonthly}/mo`);
  }

  console.log("\nDone! Plans seeded successfully.");
}

seed()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
