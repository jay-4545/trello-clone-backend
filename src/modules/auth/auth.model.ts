// src/modules/auth/auth.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/db";
import bcrypt from "bcryptjs";
import env from "../../config/env";
import { SystemRole } from "../../types";

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  role: SystemRole;
  avatar: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  passwordChangedAt: Date | null;
  refreshTokenHash: string | null;
  lastLoginAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes
  extends Optional<UserAttributes, "id" | "role" | "avatar" | "isActive" | "isEmailVerified" |
    "failedLoginAttempts" | "lockedUntil" | "passwordChangedAt" | "refreshTokenHash" | "lastLoginAt"> { }

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: SystemRole;
  public avatar!: string | null;
  public isActive!: boolean;
  public isEmailVerified!: boolean;
  public failedLoginAttempts!: number;
  public lockedUntil!: Date | null;
  public passwordChangedAt!: Date | null;
  public refreshTokenHash!: string | null;
  public lastLoginAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public isLocked = (): boolean =>
    !!(this.lockedUntil && this.lockedUntil > new Date());

  public async comparePassword(c: string) {
    return bcrypt.compare(c, this.password);
  }

  public async recordFailedLogin() {
    const attempts = this.failedLoginAttempts + 1;
    await this.update({
      failedLoginAttempts: attempts,
      ...(attempts >= 5 && { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }),
    });
  }

  public async recordSuccessfulLogin() {
    await this.update({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() });
  }

  public async saveRefreshToken(raw: string) {
    await this.update({ refreshTokenHash: await bcrypt.hash(raw, 8) });
  }

  public async validateRefreshToken(raw: string): Promise<boolean> {
    if (!this.refreshTokenHash) return false;
    return bcrypt.compare(raw, this.refreshTokenHash);
  }

  public async revokeRefreshToken() {
    await this.update({ refreshTokenHash: null });
  }

  public toJSON() {
    const { password: _p, refreshTokenHash: _r, ...safe } =
      super.toJSON() as UserAttributes;
    return safe;
  }
}

User.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM("super_admin", "admin", "user"), allowNull: false, defaultValue: "user" },
  avatar: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  isEmailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  failedLoginAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lockedUntil: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  passwordChangedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  refreshTokenHash: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, {
  sequelize,
  tableName: "users",
  timestamps: true,
  hooks: {
    beforeCreate: async (u) => { u.password = await bcrypt.hash(u.password, env.BCRYPT_ROUNDS); },
    beforeUpdate: async (u) => {
      if (u.changed("password")) {
        u.password = await bcrypt.hash(u.password, env.BCRYPT_ROUNDS);
        u.passwordChangedAt = new Date();
      }
    },
  },
  indexes: [{ unique: true, fields: ["email"] }],
});

export default User;