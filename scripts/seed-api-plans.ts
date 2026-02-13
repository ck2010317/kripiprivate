// Seed the API plans into the database
// Run: npx tsx scripts/seed-api-plans.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  {
    name: "starter",
    displayName: "Starter",
    priceMonthly: 2999, // $2,999/mo
    cardsPerMonth: 500,
    requestsPerMin: 60,
    cardIssueFee: 5.0,     // $5 per card issued
    cardFundFee: 2.0,      // $2 per funding
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
    priceMonthly: 7999, // $7,999/mo
    cardsPerMonth: 2500,
    requestsPerMin: 200,
    cardIssueFee: 3.0,
    cardFundFee: 1.0,
    markupPercent: 2.0,
    liveCards: true,
    testMode: true,
    webhooks: true,
    ipWhitelist: true,
    prioritySupport: true,
    dedicatedBin: false,
    customBranding: false,
  },
  {
    name: "enterprise",
    displayName: "Enterprise",
    priceMonthly: 19999, // $19,999/mo
    cardsPerMonth: 10000,
    requestsPerMin: 500,
    cardIssueFee: 1.5,
    cardFundFee: 0.5,
    markupPercent: 1.0,
    liveCards: true,
    testMode: true,
    webhooks: true,
    ipWhitelist: true,
    prioritySupport: true,
    dedicatedBin: true,
    customBranding: true,
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
