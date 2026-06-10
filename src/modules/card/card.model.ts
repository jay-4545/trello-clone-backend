// src/modules/card/card.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";
import { CardPriority, CardStatus } from "../../types";

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface CardAttributes {
    id: number;
    listId: number;
    boardId: number;            // denormalised for faster queries
    createdById: number;
    title: string;
    description: string | null;
    status: CardStatus;
    priority: CardPriority;
    position: number;
    dueDate: Date | null;
    completedAt: Date | null;
    startDate: Date | null;
    labels: string[];          // colour codes / names
    tags: string[];
    checklist: ChecklistItem[];
    attachments: string[];          // URLs
    coverImage: string | null;
    estimateHours: number | null;
    isArchived: boolean;
    isWatched: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CardCreationAttributes
    extends Optional<CardAttributes, "id" | "description" | "status" | "priority" | "position" |
        "dueDate" | "completedAt" | "startDate" | "labels" | "tags" | "checklist" |
        "attachments" | "coverImage" | "estimateHours" | "isArchived" | "isWatched"> { }

class Card extends Model<CardAttributes, CardCreationAttributes>
    implements CardAttributes {
    public id!: number;
    public listId!: number;
    public boardId!: number;
    public createdById!: number;
    public title!: string;
    public description!: string | null;
    public status!: CardStatus;
    public priority!: CardPriority;
    public position!: number;
    public dueDate!: Date | null;
    public completedAt!: Date | null;
    public startDate!: Date | null;
    public labels!: string[];
    public tags!: string[];
    public checklist!: ChecklistItem[];
    public attachments!: string[];
    public coverImage!: string | null;
    public estimateHours!: number | null;
    public isArchived!: boolean;
    public isWatched!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Card.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    listId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "lists", key: "id" }, onDelete: "CASCADE" },
    boardId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "boards", key: "id" }, onDelete: "CASCADE" },
    createdById: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    title: { type: DataTypes.STRING(500), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    status: { type: DataTypes.ENUM("open", "in_progress", "in_review", "done", "archived"), allowNull: false, defaultValue: "open" },
    priority: { type: DataTypes.ENUM("critical", "high", "medium", "low"), allowNull: false, defaultValue: "medium" },
    position: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 65536 },
    dueDate: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    completedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    startDate: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    labels: { type: DataTypes.ARRAY(DataTypes.STRING(50)), allowNull: false, defaultValue: [] },
    tags: { type: DataTypes.ARRAY(DataTypes.STRING(50)), allowNull: false, defaultValue: [] },
    checklist: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    attachments: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: [] },
    coverImage: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
    estimateHours: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },
    isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isWatched: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    sequelize,
    tableName: "cards",
    timestamps: true,
    hooks: {
        beforeUpdate: (card) => {
            if (card.changed("status")) {
                card.completedAt = card.status === "done" ? new Date() : null;
            }
        },
    },
    indexes: [
        { fields: ["listId"] },
        { fields: ["boardId"] },
        { fields: ["boardId", "listId", "position"] },
        { fields: ["createdById"] },
        { fields: ["dueDate"] },
        { fields: ["isArchived"] },
    ],
});

export default Card;