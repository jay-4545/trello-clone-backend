// src/config/associations.ts
// Import all models — parents before children to avoid circular dep issues
import User from "../modules/auth/auth.model";
import BoardMember from "../modules/board/board-member.model";
import Board from "../modules/board/board.model";
import CardAssignee from "../modules/card/card-assignee.model";
import Card from "../modules/card/card.model";
import Comment from "../modules/comment/comment.model";
import List from "../modules/list/list.model";
import Notification from "../modules/notification/notification.model";
import WorkspaceMember from "../modules/workspace/workspace-member.model";
import Workspace from "../modules/workspace/workspace.model";
import Todo from "../modules/todo/todo.model";
import ErrorLog from "../modules/error-log/error-log.model";

export function setupAssociations() {
    // ─── User ───────────────────────────────────────────────────────────────
    User.hasMany(WorkspaceMember, { foreignKey: "userId", as: "workspaceMemberships" });
    User.hasMany(BoardMember, { foreignKey: "userId", as: "boardMemberships" });
    User.hasMany(Board, { foreignKey: "createdById", as: "createdBoards" });
    User.hasMany(Card, { foreignKey: "createdById", as: "createdCards" });
    User.hasMany(CardAssignee, { foreignKey: "userId", as: "assignedCards" });
    User.hasMany(Comment, { foreignKey: "userId", as: "comments" });
    User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
    User.hasMany(Workspace, { foreignKey: "ownerId", as: "ownedWorkspaces" });
    User.hasMany(Todo, { foreignKey: "userId", as: "todos" });
    User.hasMany(ErrorLog, { foreignKey: "userId", as: "errorLogs" });

    // ─── Workspace ──────────────────────────────────────────────────────────
    Workspace.belongsTo(User, { foreignKey: "ownerId", as: "owner" });
    Workspace.hasMany(WorkspaceMember, { foreignKey: "workspaceId", as: "members" });
    Workspace.hasMany(Board, { foreignKey: "workspaceId", as: "boards" });

    // ─── WorkspaceMember ────────────────────────────────────────────────────
    WorkspaceMember.belongsTo(Workspace, { foreignKey: "workspaceId", as: "workspace" });
    WorkspaceMember.belongsTo(User, { foreignKey: "userId", as: "user" });

    // ─── Board ──────────────────────────────────────────────────────────────
    Board.belongsTo(Workspace, { foreignKey: "workspaceId", as: "workspace" });
    Board.belongsTo(User, { foreignKey: "createdById", as: "creator" });
    Board.hasMany(BoardMember, { foreignKey: "boardId", as: "members" });
    Board.hasMany(List, { foreignKey: "boardId", as: "lists" });
    Board.hasMany(Card, { foreignKey: "boardId", as: "cards" });

    // ─── BoardMember ─────────────────────────────────────────────────────────
    BoardMember.belongsTo(Board, { foreignKey: "boardId", as: "board" });
    BoardMember.belongsTo(User, { foreignKey: "userId", as: "user" });

    // ─── List ────────────────────────────────────────────────────────────────
    List.belongsTo(Board, { foreignKey: "boardId", as: "board" });
    List.hasMany(Card, { foreignKey: "listId", as: "cards" });

    // ─── Card ────────────────────────────────────────────────────────────────
    Card.belongsTo(List, { foreignKey: "listId", as: "list" });
    Card.belongsTo(Board, { foreignKey: "boardId", as: "board" });
    Card.belongsTo(User, { foreignKey: "createdById", as: "creator" });
    Card.hasMany(CardAssignee, { foreignKey: "cardId", as: "assignees" });
    Card.hasMany(Comment, { foreignKey: "cardId", as: "comments" });
    Card.belongsToMany(User, {
        through: CardAssignee,
        foreignKey: "cardId",
        otherKey: "userId",
        as: "assignedUsers",
    });

    // ─── Comment ─────────────────────────────────────────────────────────────
    Comment.belongsTo(Card, { foreignKey: "cardId", as: "card" });
    Comment.belongsTo(User, { foreignKey: "userId", as: "author" });
    // constraints: false — Sequelize cannot generate a valid ALTER COLUMN ... REFERENCES
    // statement for self-referential FKs in PostgreSQL. The FK is declared directly
    // in the model (comment.model.ts) via the `references` option instead.
    Comment.belongsTo(Comment, { foreignKey: "parentId", as: "parent", constraints: false });
    Comment.hasMany(Comment, { foreignKey: "parentId", as: "replies", constraints: false });

    // ─── CardAssignee ─────────────────────────────────────────────────────────
    CardAssignee.belongsTo(Card, { foreignKey: "cardId", as: "card" });
    CardAssignee.belongsTo(User, { foreignKey: "userId", as: "user" });

    // ─── Notification ─────────────────────────────────────────────────────────
    Notification.belongsTo(User, { foreignKey: "userId", as: "recipient" });
    Notification.belongsTo(User, { foreignKey: "actorId", as: "actor", constraints: false });

    // ─── Todo ─────────────────────────────────────────────────────────────────
    Todo.belongsTo(User, { foreignKey: "userId", as: "user" });

    // ─── ErrorLog ─────────────────────────────────────────────────────────────
    ErrorLog.belongsTo(User, { foreignKey: "userId", as: "user" });
}

export {
    User,
    Workspace,
    WorkspaceMember,
    Board,
    BoardMember,
    List,
    Card,
    CardAssignee,
    Comment,
    Notification,
    Todo,
    ErrorLog,
};