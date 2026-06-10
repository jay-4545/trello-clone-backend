// src/modules/comment/comment.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";

export interface CommentAttributes {
    id: number;
    cardId: number;
    userId: number;
    parentId: number | null;           // threading
    content: string;
    mentions: number[];                // user IDs mentioned
    isEdited: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CommentCreationAttributes
    extends Optional<CommentAttributes, "id" | "parentId" | "mentions" | "isEdited" | "isDeleted"> { }

class Comment extends Model<CommentAttributes, CommentCreationAttributes>
    implements CommentAttributes {
    public id!: number;
    public cardId!: number;
    public userId!: number;
    public parentId!: number | null;
    public content!: string;
    public mentions!: number[];
    public isEdited!: boolean;
    public isDeleted!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Comment.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cardId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "cards", key: "id" }, onDelete: "CASCADE" },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        // NOTE: FK constraint is NOT declared here intentionally.
        // Sequelize cannot generate valid ALTER COLUMN ... REFERENCES SQL for
        // self-referential columns on an existing PostgreSQL table.
        // The relationship is defined via associations (constraints: false)
        // and the FK can be added once manually or via init.sql if needed.
    },
    content: { type: DataTypes.TEXT, allowNull: false },
    mentions: { type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: false, defaultValue: [] },
    isEdited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    sequelize,
    tableName: "comments",
    timestamps: true,
    indexes: [
        { fields: ["cardId"] },
        { fields: ["userId"] },
        { fields: ["parentId"] },
    ],
});

export default Comment;