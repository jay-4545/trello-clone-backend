// src/modules/card/card-assignee.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";

export interface CardAssigneeAttributes {
    id: number;
    cardId: number;
    userId: number;
    assignedBy: number;
    createdAt?: Date;
}

export interface CardAssigneeCreationAttributes
    extends Optional<CardAssigneeAttributes, "id"> { }

class CardAssignee extends Model<CardAssigneeAttributes, CardAssigneeCreationAttributes>
    implements CardAssigneeAttributes {
    public id!: number;
    public cardId!: number;
    public userId!: number;
    public assignedBy!: number;
    public readonly createdAt!: Date;
    public updatedAt!: Date;
}

CardAssignee.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cardId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "cards", key: "id" }, onDelete: "CASCADE" },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    assignedBy: { type: DataTypes.INTEGER, allowNull: false },
}, {
    sequelize,
    tableName: "card_assignees",
    timestamps: true,
    updatedAt: false,
    indexes: [
        { unique: true, fields: ["cardId", "userId"] },
        { fields: ["userId"] },
    ],
});

export default CardAssignee;