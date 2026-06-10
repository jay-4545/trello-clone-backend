// src/modules/card/card.routes.ts
import { Router } from "express";
import * as C from "./card.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireBoardAccess } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validation.middleware";
import { writeLimiter } from "../../middleware/rate-limit";
import { uploadSingle } from "../../middleware/upload.middleware";

const r = Router({ mergeParams: true });
r.use(authenticate);

// Board-level card routes
r.get("/search", requireBoardAccess("viewer", "member", "admin"), C.searchCards);
r.get("/stats", requireBoardAccess("viewer", "member", "admin"), C.getBoardStats);
r.patch("/bulk/move", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([
        { field: "cardIds", required: true, type: "array" },
        { field: "targetListId", required: true, type: "number" },
    ]),
    C.bulkMove);

// Per-list card routes
r.get("/", requireBoardAccess("viewer", "member", "admin"), C.getCards);
r.post("/", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "title", required: true, type: "string", minLength: 1, maxLength: 500 }]),
    C.createCard);
r.patch("/reorder", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "orderedIds", required: true, type: "array" }]),
    C.reorderCards);

// Single card routes
r.get("/:cardId", requireBoardAccess("viewer", "member", "admin"), C.getCard);
r.patch("/:cardId", requireBoardAccess("member", "admin"), writeLimiter(), C.updateCard);
r.patch("/:cardId/move", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "targetListId", required: true, type: "number" }]),
    C.moveCard);
r.delete("/:cardId", requireBoardAccess("member", "admin"), C.deleteCard);
r.post("/:cardId/archive", requireBoardAccess("member", "admin"), C.archiveCard);
r.post("/:cardId/restore", requireBoardAccess("member", "admin"), C.restoreCard);

// Cover image upload — POST /cards/:cardId/cover  (multipart/form-data, field: "cover")
r.post("/:cardId/cover", requireBoardAccess("member", "admin"), writeLimiter(),
    uploadSingle("cover"), C.uploadCoverImage);

// Assignees
r.post("/:cardId/assignees", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "userId", required: true, type: "number" }]),
    C.assignUser);
r.delete("/:cardId/assignees/:userId", requireBoardAccess("member", "admin"), C.unassignUser);

// Checklist
r.post("/:cardId/checklist", requireBoardAccess("member", "admin"), writeLimiter(),
    validate([{ field: "text", required: true, type: "string", minLength: 1, maxLength: 500 }]),
    C.addChecklist);
r.patch("/:cardId/checklist/:itemId", requireBoardAccess("member", "admin"), writeLimiter(), C.updateChecklist);
r.delete("/:cardId/checklist/:itemId", requireBoardAccess("member", "admin"), C.deleteChecklist);

export default r;