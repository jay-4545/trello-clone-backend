// src/modules/workspace/workspace.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";

export interface WorkspaceAttributes {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    ownerId: number;
    isPersonal: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface WorkspaceCreationAttributes
    extends Optional<WorkspaceAttributes, "id" | "description" | "logo" | "isPersonal"> { }

class Workspace extends Model<WorkspaceAttributes, WorkspaceCreationAttributes>
    implements WorkspaceAttributes {
    public id!: number;
    public name!: string;
    public slug!: string;
    public description!: string | null;
    public logo!: string | null;
    public ownerId!: number;
    public isPersonal!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Workspace.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    logo: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
    ownerId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    isPersonal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    sequelize,
    tableName: "workspaces",
    timestamps: true,
    indexes: [
        { unique: true, fields: ["slug"] },
        { fields: ["ownerId"] },
    ],
});

export default Workspace;