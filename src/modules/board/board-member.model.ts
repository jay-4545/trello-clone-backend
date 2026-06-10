// src/modules/board/board-member.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";
import { BoardRole } from "../../types";

export interface BoardMemberAttributes {
    id: number;
    boardId: number;
    userId: number;
    role: BoardRole;
    invitedBy: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface BoardMemberCreationAttributes
    extends Optional<BoardMemberAttributes, "id" | "role" | "invitedBy"> { }

class BoardMember extends Model<BoardMemberAttributes, BoardMemberCreationAttributes>
    implements BoardMemberAttributes {
    public id!: number;
    public boardId!: number;
    public userId!: number;
    public role!: BoardRole;
    public invitedBy!: number | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

BoardMember.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    boardId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "boards", key: "id" }, onDelete: "CASCADE" },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    role: { type: DataTypes.ENUM("admin", "member", "viewer"), allowNull: false, defaultValue: "member" },
    invitedBy: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
}, {
    sequelize,
    tableName: "board_members",
    timestamps: true,
    indexes: [
        { unique: true, fields: ["boardId", "userId"] },
        { fields: ["userId"] },
    ],
});

export default BoardMember;