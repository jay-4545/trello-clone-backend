import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";
import User from "../auth/auth.model";

export type TodoPriority = "low" | "medium" | "high";
export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoAttributes {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TodoCreationAttributes
  extends Optional<TodoAttributes, "id" | "description" | "dueDate"> { }

class Todo extends Model<TodoAttributes, TodoCreationAttributes> implements TodoAttributes {
  public id!: number;
  public userId!: number;
  public title!: string;
  public description!: string | null;
  public status!: TodoStatus;
  public priority!: TodoPriority;
  public dueDate!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Todo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "in_progress", "completed"),
      allowNull: false,
      defaultValue: "pending",
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high"),
      allowNull: false,
      defaultValue: "medium",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "todos",
    timestamps: true,
  }
);

export default Todo;
