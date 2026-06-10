// src/config/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import env from "./env";
import logger from "../utils/logger";

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

if (env.CLOUDINARY_CLOUD_NAME) {
    logger.info("Cloudinary configured");
} else {
    logger.warn("Cloudinary not configured — image uploads will fail");
}

export default cloudinary;