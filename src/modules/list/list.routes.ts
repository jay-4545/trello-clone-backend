// src/modules/list/list.routes.ts
import { Router } from "express";
import * as C from "./list.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireBoardAccess } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validation.middleware";
import { writeLimiter } from "../../middleware/rate-limit";

const r = Router({ mergeParams: true });
r.use(authenticate);

// All under /api/workspaces/:workspaceId/boards/:boardId/lists
r.get("/", requireBoardAccess("viewer", "member", "admin"), C.getLists);
r.post("/", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "name", required: true, type: "string", minLength: 1, maxLength: 200 }]),
    C.createList);
r.patch("/reorder", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "orderedIds", required: true, type: "array" }]),
    C.reorderLists);
r.patch("/:listId", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "name", required: false, type: "string", minLength: 1, maxLength: 200 }]),
    C.updateList);
r.post("/:listId/archive", requireBoardAccess("member", "admin"), C.archiveList);
r.delete("/:listId", requireBoardAccess("admin"), C.deleteList);

export default r;