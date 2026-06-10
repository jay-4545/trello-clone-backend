// src/modules/auth/auth.routes.ts
import { Router } from "express";
import * as C from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { authLimiter, strictLimiter, writeLimiter } from "../../middleware/rate-limit";
import { uploadSingle } from "../../middleware/upload.middleware";

const r = Router();

r.post("/register", authLimiter(),
  validate([
    { field: "name", required: true, type: "string", minLength: 2, maxLength: 100 },
    { field: "email", required: true, type: "string", isEmail: true },
    {
      field: "password", required: true, type: "string", minLength: 8, maxLength: 100,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
      patternMessage: "Password needs uppercase, lowercase, number and special char",
    },
  ]),
  C.register);

r.post("/login", authLimiter(), validate([
  { field: "email", required: true, type: "string", isEmail: true },
  { field: "password", required: true, type: "string" },
]), C.login);

r.post("/refresh", authLimiter(), C.refresh);
r.post("/logout", authenticate, C.logout);
r.get("/me", authenticate, C.getProfile);

r.put("/change-password", authenticate, strictLimiter(),
  validate([
    { field: "currentPassword", required: true, type: "string" },
    {
      field: "newPassword", required: true, type: "string", minLength: 8, maxLength: 100,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
    },
  ]),
  C.changePassword);

// POST /api/v1/auth/avatar  (multipart/form-data, field: "avatar")
r.post("/avatar", authenticate, writeLimiter(), uploadSingle("avatar"), C.uploadAvatar);

export default r;