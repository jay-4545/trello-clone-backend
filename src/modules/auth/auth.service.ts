// src/modules/auth/auth.service.ts
import User from "./auth.model";
import { generateTokenPair, verifyRefreshToken } from "../../utils/jwt";
import { ConflictError, UnauthorizedError, ForbiddenError, BadRequestError } from "../../utils/errors";
import logger from "../../utils/logger";
import { sendWelcomeEmail, sendPasswordChangedEmail } from "../../utils/email.service";
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from "../../middleware/upload.middleware";

export const registerUser = async (body: { name: string; email: string; password: string }) => {
  const email = body.email.toLowerCase().trim();
  if (await User.findOne({ where: { email } })) throw new ConflictError("Account already exists");
  const user = await User.create({ ...body, email });
  const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
  await user.saveRefreshToken(tokens.refreshToken);

  // Fire-and-forget welcome email
  sendWelcomeEmail(email, body.name);

  return { user: user.toJSON(), ...tokens };
};

export const loginUser = async (body: { email: string; password: string }) => {
  const email = body.email.toLowerCase().trim();
  const user = await User.findOne({ where: { email } });
  const dummy = "$2a$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX";
  if (!user) {
    await import("bcryptjs").then((b) => b.default.compare(body.password, dummy));
    throw new UnauthorizedError("Invalid email or password");
  }
  if (user.isLocked()) {
    const mins = Math.ceil((user.lockedUntil!.getTime() - Date.now()) / 60000);
    throw new ForbiddenError(`Account locked. Retry in ${mins}min.`);
  }
  if (!user.isActive) throw new ForbiddenError("Account disabled. Contact support.");
  const match = await user.comparePassword(body.password);
  if (!match) {
    await user.recordFailedLogin();
    logger.warn(`Failed login: ${email}`);
    throw new UnauthorizedError("Invalid email or password");
  }
  await user.recordSuccessfulLogin();
  const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
  await user.saveRefreshToken(tokens.refreshToken);
  return { user: user.toJSON(), ...tokens };
};

export const refreshTokens = async (rawRefresh: string) => {
  let payload;
  try { payload = verifyRefreshToken(rawRefresh); } catch { throw new UnauthorizedError("Invalid refresh token"); }
  const user = await User.findByPk(payload.id);
  if (!user || !user.isActive) throw new UnauthorizedError("User not found");
  const valid = await user.validateRefreshToken(rawRefresh);
  if (!valid) {
    await user.revokeRefreshToken();
    logger.warn(`Refresh token reuse detected: user ${user.id}`);
    throw new UnauthorizedError("Token reuse detected. Please log in again.");
  }
  const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
  await user.saveRefreshToken(tokens.refreshToken);
  return tokens;
};

export const logoutUser = async (userId: number) => {
  const u = await User.findByPk(userId);
  await u?.revokeRefreshToken();
};

export const getProfile = async (userId: number) => {
  const u = await User.findByPk(userId);
  if (!u) throw new UnauthorizedError();
  return u.toJSON();
};

export const changePassword = async (userId: number, current: string, next: string) => {
  if (current === next) throw new BadRequestError("New password must differ");
  const user = await User.findByPk(userId);
  if (!user) throw new UnauthorizedError();
  if (!(await user.comparePassword(current))) throw new UnauthorizedError("Current password incorrect");
  await user.update({ password: next });
  await user.revokeRefreshToken();

  // Fire-and-forget security alert email
  sendPasswordChangedEmail(user.email, user.name);
};

export const updateAvatar = async (userId: number, fileBuffer: Buffer): Promise<string> => {
  const user = await User.findByPk(userId);
  if (!user) throw new UnauthorizedError();

  // Delete old avatar from Cloudinary if it exists
  if (user.avatar) {
    const oldPublicId = extractPublicId(user.avatar);
    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
  }

  const { url } = await uploadToCloudinary(fileBuffer, "avatars", `user_${userId}`);
  await user.update({ avatar: url });
  return url;
};