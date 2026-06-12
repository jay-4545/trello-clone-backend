// src/modules/notification/notification.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";
import { NotificationType } from "../../types";

export interface NotificationMetadata {
    workspaceId?: number;
    boardId?: number;
    listId?: number;
    cardId?: number;
}

export interface NotificationAttributes {
    id: number;
    userId: number;           // recipient
    actorId: number | null;    // who triggered it
    type: NotificationType;
    title: string;
    body: string;
    entityType: "card" | "board" | "workspace" | "comment";
    entityId: number;
    metadata: NotificationMetadata;
    isRead: boolean;
    readAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface NotificationCreationAttributes
    extends Optional<NotificationAttributes, "id" | "actorId" | "metadata" | "isRead" | "readAt"> { }

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes>
    implements NotificationAttributes {
    public id!: number;
    public userId!: number;
    public actorId!: number | null;
    public type!: NotificationType;
    public title!: string;
    public body!: string;
    public entityType!: "card" | "board" | "workspace" | "comment";
    public entityId!: number;
    public metadata!: NotificationMetadata;
    public isRead!: boolean;
    public readAt!: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Notification.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    actorId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    type: { type: DataTypes.ENUM("card_assigned", "card_due_soon", "card_overdue", "card_moved", "card_commented", "board_invite", "workspace_invite", "mention"), allowNull: false },
    title: { type: DataTypes.STRING(300), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    entityType: { type: DataTypes.ENUM("card", "board", "workspace", "comment"), allowNull: false },
    entityId: { type: DataTypes.INTEGER, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    readAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, {
    sequelize,
    tableName: "notifications",
    timestamps: true,
    indexes: [
        { fields: ["userId", "isRead"] },
        { fields: ["userId", "createdAt"] },
    ],
});

export default Notification;