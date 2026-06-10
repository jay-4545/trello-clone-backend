// src/modules/todo/todo.routes.ts
import { Router } from "express";
import * as TodoController from "./todo.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { writeLimiter } from "../../middleware/rate-limit";  // FIX: was missing entirely

const router = Router();
router.use(authenticate);

router.get("/stats", TodoController.getTodoStats);
router.get("/", TodoController.getAllTodos);

// FIX: writeLimiter() added on all write routes — was unprotected before
router.post("/",
  writeLimiter(),
  validate([
    { field: "title", required: true, type: "string", minLength: 1, maxLength: 200 },
    { field: "priority", required: false, enum: ["low", "medium", "high"] },
  ]),
  TodoController.createTodo
);

router.get("/:id", TodoController.getTodoById);

router.put("/:id",
  writeLimiter(),
  validate([
    { field: "title", required: false, type: "string", minLength: 1, maxLength: 200 },
    { field: "status", required: false, enum: ["pending", "in_progress", "completed"] },
    { field: "priority", required: false, enum: ["low", "medium", "high"] },
  ]),
  TodoController.updateTodo
);

router.delete("/:id",
  writeLimiter(),
  TodoController.deleteTodo
);

export default router;