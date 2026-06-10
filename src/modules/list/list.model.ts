// src/modules/list/list.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";

export interface ListAttributes {
    id: number;
    boardId: number;
    name: string;
    position: number;
    isArchived: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ListCreationAttributes
    extends Optional<ListAttributes, "id" | "position" | "isArchived"> { }

class List extends Model<ListAttributes, ListCreationAttributes>
    implements ListAttributes {
    public id!: number;
    public boardId!: number;
    public name!: string;
    public position!: number;
    public isArchived!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

List.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    boardId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "boards", key: "id" }, onDelete: "CASCADE" },
    name: { type: DataTypes.STRING(200), allowNull: false },
    position: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 65536 },  // float for fractional reordering
    isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
    sequelize,
    tableName: "lists",
    timestamps: true,
    indexes: [
        { fields: ["boardId"] },
        { fields: ["boardId", "position"] },
    ],
});

export default List;