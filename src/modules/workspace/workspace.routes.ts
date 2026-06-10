// src/modules/workspace/workspace.routes.ts
import { Router } from "express";
import * as C from "./workspace.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireWorkspaceRole } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validation.middleware";
import { writeLimiter } from "../../middleware/rate-limit";

const r = Router({ mergeParams: true });
r.use(authenticate);

// GET  /api/workspaces                — list my workspaces
// POST /api/workspaces                — create workspace
r.get("/", C.getMyWorkspaces);
r.post("/", writeLimiter(),
    validate([{ field: "name", required: true, type: "string", minLength: 2, maxLength: 100 }]),
    C.createWorkspace);

// GET    /api/workspaces/:workspaceId          — workspace detail
// PATCH  /api/workspaces/:workspaceId          — update (admin+)
// DELETE /api/workspaces/:workspaceId          — delete (owner only)
r.get("/:workspaceId", requireWorkspaceRole("viewer", "member", "admin", "owner"), C.getWorkspace);
r.patch("/:workspaceId", requireWorkspaceRole("admin", "owner"), writeLimiter(),
    validate([{ field: "name", required: false, type: "string", minLength: 2, maxLength: 100 }]),
    C.updateWorkspace);
r.delete("/:workspaceId", requireWorkspaceRole("owner"), C.deleteWorkspace);

// Members
r.get("/:workspaceId/members", requireWorkspaceRole("viewer", "member", "admin", "owner"), C.getMembers);
r.post("/:workspaceId/members", requireWorkspaceRole("admin", "owner"), writeLimiter(),
    validate([
        { field: "email", required: true, type: "string", isEmail: true },
        { field: "role", required: false, enum: ["admin", "member", "viewer"] },
    ]),
    C.inviteMember);
r.patch("/:workspaceId/members/:userId", requireWorkspaceRole("admin", "owner"),
    validate([{ field: "role", required: true, enum: ["admin", "member", "viewer"] }]),
    C.updateMemberRole);
r.delete("/:workspaceId/members/:userId", requireWorkspaceRole("admin", "owner"), C.removeMember);

export default r;