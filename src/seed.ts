// src/seed.ts

import "dotenv/config";
import sequelize from "./config/db";
import { setupAssociations } from "./config/associations";
import User from "./modules/auth/auth.model";
import logger from "./utils/logger";
import env from "./config/env";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@trello.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";
const ADMIN_NAME = process.env.ADMIN_NAME || "Super Admin";

async function seed() {
    try {
        await sequelize.authenticate();
        logger.info("DB connected");
        setupAssociations();
        await sequelize.sync({ alter: false, force: false });

        // Check if super_admin already exists
        const existing = await User.findOne({ where: { email: ADMIN_EMAIL } });

        if (existing) {
            if (existing.role !== "super_admin") {
                // Promote to super_admin if registered as normal user
                await existing.update({ role: "super_admin" });
                logger.info(`Promoted existing user '${ADMIN_EMAIL}' to super_admin`);
            } else {
                logger.info(`super_admin '${ADMIN_EMAIL}' already exists — skipping`);
            }
            process.exit(0);
        }

        // Create fresh super_admin
        // Password is auto-hashed by the beforeCreate hook in auth.model.ts
        const admin = await User.create({
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            role: "super_admin",
            isActive: true,
            isEmailVerified: true,
        });

        logger.info("─────────────────────────────────────────");
        logger.info("super_admin created successfully!");
        logger.info(`  ID:    ${admin.id}`);
        logger.info(`  Name:  ${admin.name}`);
        logger.info(`  Email: ${admin.email}`);
        logger.info(`  Role:  ${admin.role}`);
        logger.info("─────────────────────────────────────────");
        logger.info("Login with these credentials at POST /api/v1/auth/login");

        process.exit(0);
    } catch (err) {
        logger.error("Seed failed:", err);
        process.exit(1);
    }
}

seed();