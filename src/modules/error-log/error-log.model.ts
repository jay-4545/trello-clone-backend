// src/modules/error-log/error-log.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";

export type ErrorLogSource =
    | "error_middleware"
    | "auth"
    | "validation"
    | "rbac"
    | "not_found"
    | "socket";

export type ErrorLogLevel = "error" | "warning";

export interface ErrorLogAttributes {
    id: number;
    requestId: string | null;
    userId: number | null;
    level: ErrorLogLevel;
    source: ErrorLogSource;
    method: string;
    path: string;
    statusCode: number;
    errorName: string | null;
    message: string;
    stack: string | null;
    isOperational: boolean;
    responseMessage: string | null;
    validationErrors: string[] | null;
    ip: string | null;
    userAgent: string | null;
    query: Record<string, unknown> | null;
    body: Record<string, unknown> | null;
    context: Record<string, unknown> | null;
    durationMs: number | null;
    createdAt?: Date;
}

export interface ErrorLogCreationAttributes
    extends Optional<
        ErrorLogAttributes,
        | "id"
        | "requestId"
        | "userId"
        | "errorName"
        | "stack"
        | "isOperational"
        | "responseMessage"
        | "validationErrors"
        | "ip"
        | "userAgent"
        | "query"
        | "body"
        | "context"
        | "durationMs"
    > { }

class ErrorLog extends Model<ErrorLogAttributes, ErrorLogCreationAttributes>
    implements ErrorLogAttributes {
    public id!: number;
    public requestId!: string | null;
    public userId!: number | null;
    public level!: ErrorLogLevel;
    public source!: ErrorLogSource;
    public method!: string;
    public path!: string;
    public statusCode!: number;
    public errorName!: string | null;
    public message!: string;
    public stack!: string | null;
    public isOperational!: boolean;
    public responseMessage!: string | null;
    public validationErrors!: string[] | null;
    public ip!: string | null;
    public userAgent!: string | null;
    public query!: Record<string, unknown> | null;
    public body!: Record<string, unknown> | null;
    public context!: Record<string, unknown> | null;
    public durationMs!: number | null;
    public readonly createdAt!: Date;
}

ErrorLog.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    requestId: { type: DataTypes.STRING(64), allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
    level: { type: DataTypes.ENUM("error", "warning"), allowNull: false, defaultValue: "error" },
    source: {
        type: DataTypes.ENUM("error_middleware", "auth", "validation", "rbac", "not_found", "socket"),
        allowNull: false,
    },
    method: { type: DataTypes.STRING(10), allowNull: false },
    path: { type: DataTypes.STRING(2048), allowNull: false },
    statusCode: { type: DataTypes.INTEGER, allowNull: false },
    errorName: { type: DataTypes.STRING(128), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    stack: { type: DataTypes.TEXT, allowNull: true },
    isOperational: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    responseMessage: { type: DataTypes.TEXT, allowNull: true },
    validationErrors: { type: DataTypes.JSONB, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    query: { type: DataTypes.JSONB, allowNull: true },
    body: { type: DataTypes.JSONB, allowNull: true },
    context: { type: DataTypes.JSONB, allowNull: true },
    durationMs: { type: DataTypes.INTEGER, allowNull: true },
}, {
    sequelize,
    tableName: "error_logs",
    timestamps: true,
    updatedAt: false,
    indexes: [
        { fields: ["createdAt"] },
        { fields: ["statusCode"] },
        { fields: ["source"] },
        { fields: ["userId"] },
        { fields: ["requestId"] },
        { fields: ["level"] },
    ],
});

export default ErrorLog;
