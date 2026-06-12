// src/middleware/upload.middleware.ts
import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import cloudinary from "../config/cloudinary";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// FIX: magic-byte signatures — the real file type is in the first bytes of the
// buffer, not in the Content-Type header that the client can fake.
const MAGIC_BYTES: { hex: string; mime: string }[] = [
    { hex: "ffd8ff", mime: "image/jpeg" },
    { hex: "89504e47", mime: "image/png" },
    { hex: "47494638", mime: "image/gif" },
    { hex: "52494646", mime: "image/webp" }, // RIFF....WEBP
];

function detectMimeFromBuffer(buf: Buffer): string | null {
    for (const { hex, mime } of MAGIC_BYTES) {
        const bytes = hex.length / 2;
        if (buf.slice(0, bytes).toString("hex") === hex) return mime;
    }
    // WebP has "WEBP" at offset 8
    if (buf.length >= 12 && buf.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
    return null;
}

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // First gate: Content-Type header check (fast, not spoofable at this layer)
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
        return;
    }
    cb(null, true);
};

export const uploadSingle = (fieldName: string) =>
    multer({ storage, limits: { fileSize: MAX_FILE_SIZE_BYTES }, fileFilter }).single(fieldName);

// ─── Cloudinary helpers ───────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
}

export async function uploadToCloudinary(
    buffer: Buffer,
    folder: string,
    publicId?: string,
    resourceType: "image" | "auto" = "image"
): Promise<CloudinaryUploadResult> {
    if (resourceType === "image") {
        // FIX: second gate — verify actual file magic bytes before uploading.
        const detectedMime = detectMimeFromBuffer(buffer);
        if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
            throw new Error("File content does not match an allowed image type");
        }
    }

    return new Promise((resolve, reject) => {
        const options: Record<string, unknown> = {
            folder,
            resource_type: resourceType,
        };
        if (resourceType === "image") {
            options.transformation = [{ quality: "auto", fetch_format: "auto" }];
        }
        if (publicId) options.public_id = publicId;

        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
            resolve({ url: result.secure_url, publicId: result.public_id });
        });

        stream.end(buffer);
    });
}

const ATTACHMENT_MIME_TYPES = [
    ...ALLOWED_MIME_TYPES,
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const attachmentFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
        cb(new Error("File type not allowed for attachments"));
        return;
    }
    cb(null, true);
};

export const uploadAttachment = () =>
    multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: attachmentFileFilter }).single("attachment");

export async function deleteFromCloudinary(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch {
        // Non-fatal
    }
}

export function extractPublicId(cloudinaryUrl: string): string | null {
    try {
        const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}