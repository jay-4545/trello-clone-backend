// src/types/index.ts

// ─── Global Roles ─────────────────────────────────────────────────────────────
export type SystemRole = "super_admin" | "admin" | "user";

// ─── Workspace-level roles ────────────────────────────────────────────────────
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

// ─── Board-level roles ────────────────────────────────────────────────────────
export type BoardRole = "admin" | "member" | "viewer";

// ─── Card priority ────────────────────────────────────────────────────────────
export type CardPriority = "critical" | "high" | "medium" | "low";

// ─── Card status ──────────────────────────────────────────────────────────────
export type CardStatus = "open" | "in_progress" | "in_review" | "done" | "archived";

// ─── Notification types ───────────────────────────────────────────────────────
export type NotificationType =
    | "card_assigned"
    | "card_due_soon"
    | "card_overdue"
    | "card_moved"
    | "card_commented"
    | "board_invite"
    | "workspace_invite"
    | "mention";

// ─── Socket events ────────────────────────────────────────────────────────────
export enum SocketEvent {
    // Card events
    CARD_CREATED = "card:created",
    CARD_UPDATED = "card:updated",
    CARD_MOVED = "card:moved",
    CARD_DELETED = "card:deleted",
    CARD_ASSIGNED = "card:assigned",
    // List events
    LIST_CREATED = "list:created",
    LIST_UPDATED = "list:updated",
    LIST_DELETED = "list:deleted",
    LIST_REORDERED = "list:reordered",
    // Comment events
    COMMENT_CREATED = "comment:created",
    COMMENT_UPDATED = "comment:updated",
    COMMENT_DELETED = "comment:deleted",
    // Board events
    BOARD_UPDATED = "board:updated",
    MEMBER_JOINED = "board:member_joined",
    MEMBER_LEFT = "board:member_left",
    // Presence
    USER_ONLINE = "presence:online",
    USER_OFFLINE = "presence:offline",
    USER_VIEWING = "presence:viewing",
}

// ─── Augment Express Request ──────────────────────────────────────────────────
// NOTE: JwtPayload is defined here inline to avoid circular imports.
// jwt.ts imports from this file (SystemRole), so we cannot import JwtPayload
// from jwt.ts here.
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                role: SystemRole;
            };
            requestId?: string;
            startTime?: number;
        }
    }
}