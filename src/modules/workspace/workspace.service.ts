// src/modules/workspace/workspace.service.ts
import sequelize from "../../config/db";
import Workspace from "./workspace.model";
import User from "../auth/auth.model";
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from "../../utils/errors";
import { WorkspaceRole } from "../../types";
import WorkspaceMember from "./workspace-member.model";

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function uniqueSlug(name: string): Promise<string> {
    let slug = slugify(name);
    let n = 0;
    while (await Workspace.findOne({ where: { slug } })) slug = `${slugify(name)}-${++n}`;
    return slug;
}

export const createWorkspace = async (userId: number, body: { name: string; description?: string }) => {
    const slug = await uniqueSlug(body.name);
    const t = await sequelize.transaction();
    try {
        const ws = await Workspace.create({ name: body.name, slug, description: body.description ?? null, ownerId: userId }, { transaction: t });
        await WorkspaceMember.create({ workspaceId: ws.id, userId, role: "owner", joinedAt: new Date() }, { transaction: t });
        await t.commit();
        return ws;
    } catch (e) { await t.rollback(); throw e; }
};

export const getMyWorkspaces = async (userId: number) => {
    const memberships = await WorkspaceMember.findAll({
        where: { userId },
        include: [{ model: Workspace, as: "workspace" }],
    });
    return memberships.map((m: any) => ({ ...m.workspace.toJSON(), myRole: m.role }));
};

export const getWorkspace = async (workspaceId: number, userId: number) => {
    const membership = await WorkspaceMember.findOne({ where: { workspaceId, userId } });
    if (!membership) throw new NotFoundError("Workspace not found");

    const ws = await Workspace.findByPk(workspaceId, {
        include: [{
            model: WorkspaceMember, as: "members",
            include: [{ model: User, as: "user", attributes: ["id", "name", "email", "avatar"] }],
        }],
    });
    if (!ws) throw new NotFoundError("Workspace not found");
    return { ...ws.toJSON(), myRole: membership.role };
};

export const updateWorkspace = async (workspaceId: number, userId: number, body: Partial<{ name: string; description: string }>) => {
    const ws = await Workspace.findByPk(workspaceId);
    if (!ws) throw new NotFoundError("Workspace not found");
    if (body.name) body = { ...body, ...({ slug: await uniqueSlug(body.name) } as any) };
    return ws.update(body);
};

export const deleteWorkspace = async (workspaceId: number, userId: number) => {
    const ws = await Workspace.findByPk(workspaceId);
    if (!ws) throw new NotFoundError("Workspace not found");
    if (ws.ownerId !== userId) throw new ForbiddenError("Only owner can delete workspace");
    await ws.destroy();
};

export const inviteMember = async (workspaceId: number, inviterId: number, targetEmail: string, role: WorkspaceRole = "member") => {
    const target = await User.findOne({ where: { email: targetEmail.toLowerCase() } });
    if (!target) throw new NotFoundError("User not found");
    const exists = await WorkspaceMember.findOne({ where: { workspaceId, userId: target.id } });
    if (exists) throw new ConflictError("User is already a member");
    return WorkspaceMember.create({ workspaceId, userId: target.id, role, invitedBy: inviterId, joinedAt: new Date() });
};

export const updateMemberRole = async (workspaceId: number, targetUserId: number, role: WorkspaceRole) => {
    const member = await WorkspaceMember.findOne({ where: { workspaceId, userId: targetUserId } });
    if (!member) throw new NotFoundError("Member not found");
    if (member.role === "owner") throw new ForbiddenError("Cannot change owner role");
    return member.update({ role });
};

export const removeMember = async (workspaceId: number, actorId: number, targetUserId: number) => {
    if (actorId === targetUserId) {
        // Leaving — owners cannot leave, they must transfer or delete
        const m = await WorkspaceMember.findOne({ where: { workspaceId, userId: actorId } });
        if (m?.role === "owner") throw new BadRequestError("Transfer ownership before leaving");
    }
    const member = await WorkspaceMember.findOne({ where: { workspaceId, userId: targetUserId } });
    if (!member) throw new NotFoundError("Member not found");
    await member.destroy();
};

export const getMembers = async (workspaceId: number) => {
    return WorkspaceMember.findAll({
        where: { workspaceId },
        include: [{ model: User, as: "user", attributes: ["id", "name", "email", "avatar"] }],
        order: [["createdAt", "ASC"]],
    });
};