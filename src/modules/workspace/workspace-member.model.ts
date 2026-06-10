// src/modules/workspace/workspace-member.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";
import { WorkspaceRole } from "../../types";

export interface WorkspaceMemberAttributes {
    id: number;
    workspaceId: number;
    userId: number;
    role: WorkspaceRole;
    invitedBy: number | null;
    joinedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface WorkspaceMemberCreationAttributes
    extends Optional<WorkspaceMemberAttributes, "id" | "invitedBy" | "joinedAt"> { }

class WorkspaceMember extends Model<WorkspaceMemberAttributes, WorkspaceMemberCreationAttributes>
    implements WorkspaceMemberAttributes {
    public id!: number;
    public workspaceId!: number;
    public userId!: number;
    public role!: WorkspaceRole;
    public invitedBy!: number | null;
    public joinedAt!: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

WorkspaceMember.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    workspaceId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "workspaces", key: "id" }, onDelete: "CASCADE" },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    role: { type: DataTypes.ENUM("owner", "admin", "member", "viewer"), allowNull: false, defaultValue: "member" },
    invitedBy: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    joinedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, {
    sequelize,
    tableName: "workspace_members",
    timestamps: true,
    indexes: [
        { unique: true, fields: ["workspaceId", "userId"] },
        { fields: ["userId"] },
    ],
});

export default WorkspaceMember;