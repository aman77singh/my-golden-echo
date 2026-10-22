import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { seedCouple } from "../services/seedService.js";
import { logger } from "../logger.js";

async function run() {
  try {
    logger.info("Starting couple seed script...");
    await connectDatabase();
    const result = await seedCouple();
    console.log("\n=========================================");
    console.log("💍 Couple & Users Initialized Successfully");
    console.log("=========================================");
    console.log(`Couple ID : ${result.coupleId}`);
    console.log(`Her Account: ${result.herUser.name} <${result.herUser.email}>`);
    console.log(`Him Account: ${result.himUser.name} <${result.himUser.email}>`);
    console.log("=========================================\n");
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Seed script failed");
    await disconnectDatabase();
    process.exit(1);
  }
}

run();
