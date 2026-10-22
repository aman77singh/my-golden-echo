import bcrypt from "bcrypt";
import { Couple } from "../models/Couple.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { logger } from "../logger.js";

export interface SeedCoupleOptions {
  herName?: string;
  herEmail?: string;
  herPassword?: string;
  himName?: string;
  himEmail?: string;
  himPassword?: string;
  startDate?: string;
}

export async function seedCouple(options?: SeedCoupleOptions): Promise<{
  coupleId: string;
  herUser: { id: string; email: string; name: string };
  himUser: { id: string; email: string; name: string };
}> {
  const herName = options?.herName || env.SEED_HER_NAME;
  const herEmail = (options?.herEmail || env.SEED_HER_EMAIL).toLowerCase().trim();
  const herPassword = options?.herPassword || env.SEED_HER_PASSWORD;

  const himName = options?.himName || env.SEED_HIM_NAME;
  const himEmail = (options?.himEmail || env.SEED_HIM_EMAIL).toLowerCase().trim();
  const himPassword = options?.himPassword || env.SEED_HIM_PASSWORD;

  const startDate = options?.startDate ? new Date(options.startDate) : new Date(env.SEED_COUPLE_START_DATE);

  // Check if users already exist
  const existingUser = await User.findOne({
    email: { $in: [herEmail, himEmail] },
  });

  if (existingUser) {
    logger.warn("Users with these emails already exist. Skipping seed creation.");
    const couple = await Couple.findById(existingUser.coupleId);
    const users = await User.find({ coupleId: existingUser.coupleId });
    const her = users.find((u) => u.role === "her") || users[0];
    const him = users.find((u) => u.role === "him") || users[1];

    return {
      coupleId: couple!._id.toString(),
      herUser: { id: her._id.toString(), email: her.email, name: her.name },
      himUser: { id: him._id.toString(), email: him.email, name: him.name },
    };
  }

  // Create Couple
  const couple = await Couple.create({
    startDate,
  });

  // Hash passwords with bcrypt cost 12 as required
  const BCRYPT_ROUNDS = 12;
  const herPasswordHash = await bcrypt.hash(herPassword, BCRYPT_ROUNDS);
  const himPasswordHash = await bcrypt.hash(himPassword, BCRYPT_ROUNDS);

  // Create both users
  const herUser = await User.create({
    coupleId: couple._id,
    name: herName,
    email: herEmail,
    passwordHash: herPasswordHash,
    role: "her",
    shareCycle: false,
  });

  const himUser = await User.create({
    coupleId: couple._id,
    name: himName,
    email: himEmail,
    passwordHash: himPasswordHash,
    role: "him",
    shareCycle: false,
  });

  logger.info(
    { coupleId: couple._id, herEmail: herUser.email, himEmail: himUser.email },
    "Successfully seeded Couple and Users"
  );

  return {
    coupleId: couple._id.toString(),
    herUser: { id: herUser._id.toString(), email: herUser.email, name: herUser.name },
    himUser: { id: himUser._id.toString(), email: himUser.email, name: himUser.name },
  };
}
