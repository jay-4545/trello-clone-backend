// src/modules/board/board.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";

export type BoardVisibility = "private" | "workspace" | "public";

export interface BoardAttributes {
    id: number;
    workspaceId: number;
    createdById: number;
    name: string;
    description: string | null;
    background: string | null;        // CSS colour or image URL
    visibility: BoardVisibility;
    isClosed: boolean;
    isStarred: boolean;
    position: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface BoardCreationAttributes
    extends Optional<BoardAttributes, "id" | "description" | "background" | "visibility" | "isClosed" | "isStarred" | "position"> { }

class Board extends Model<BoardAttributes, BoardCreationAttributes>
    implements BoardAttributes {
    public id!: number;
    public workspaceId!: number;
    public createdById!: number;
    public name!: string;
    public description!: string | null;
    public background!: string | null;
    public visibility!: BoardVisibility;
    public isClosed!: boolean;
    public isStarred!: boolean;
    public position!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Board.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    workspaceId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "workspaces", key: "id" }, onDelete: "CASCADE" },
    createdById: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    background: { type: DataTypes.STRING(500), allowNull: true, defaultValue: "#0052CC" },
    visibility: { type: DataTypes.ENUM("private", "workspace", "public"), allowNull: false, defaultValue: "workspace" },
    isClosed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isStarred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
    sequelize,
    tableName: "boards",
    timestamps: true,
    indexes: [
        { fields: ["workspaceId"] },
        { fields: ["createdById"] },
    ],
});

export default Board;