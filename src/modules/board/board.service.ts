// src/modules/board/board.service.ts
import { Op, literal } from "sequelize";
import sequelize from "../../config/db";
import Board, { BoardVisibility } from "./board.model";
import { NotFoundError, ConflictError, BadRequestError } from "../../utils/errors";
import { BoardRole } from "../../types";
import { emitToBoard } from "../../socket";
import { SocketEvent } from "../../types";
import BoardMember from "./board-member.model";
import User from "../auth/auth.model";
import List from "../list/list.model";
import Card from "../card/card.model";
import env from "../../config/env";

const BOARD_INCLUDE = [
    { model: BoardMember, as: "members", include: [{ model: User, as: "user", attributes: ["id", "name", "email", "avatar"] }] },
    {
        model: List, as: "lists", where: { isArchived: false }, required: false, order: [["position", "ASC"]] as any,
        include: [{ model: Card, as: "cards", where: { isArchived: false }, required: false, order: [["position", "ASC"]] as any }]
    },
];

export const createBoard = async (userId: number, workspaceId: number, body: {
    name: string; description?: string; background?: string; visibility?: string;
}) => {
    const t = await sequelize.transaction();
    try {
        const count = await Board.count({ where: { workspaceId } });
        const board = await Board.create({
            workspaceId, createdById: userId,
            name: body.name, description: body.description ?? null,
            background: body.background ?? "#0052CC",
            visibility: (body.visibility as any) ?? "workspace",
            position: count,
        }, { transaction: t });
        await BoardMember.create({ boardId: board.id, userId, role: "admin", invitedBy: userId }, { transaction: t });
        // Auto-create default lists (like Trello)
        await List.bulkCreate([
            { boardId: board.id, name: "To Do", position: 65536 },
            { boardId: board.id, name: "In Progress", position: 131072 },
            { boardId: board.id, name: "Done", position: 196608 },
        ], { transaction: t });
        await t.commit();
        return board;
    } catch (e) { await t.rollback(); throw e; }
};

export const getBoards = async (userId: number, workspaceId: number, options?: { closedOnly?: boolean }) => {
    const boards = await Board.findAll({
        where: {
            workspaceId,
            isClosed: options?.closedOnly ? true : false,
            [Op.or]: [
                { visibility: { [Op.in]: ["workspace", "public"] } },
                literal(`EXISTS (SELECT 1 FROM board_members bm WHERE bm."boardId" = "Board"."id" AND bm."userId" = ${Number(userId)})`),
            ],
        },
        include: [{ model: BoardMember, as: "members", required: false }],
        order: [["position", "ASC"]],
    });
    return boards;
};

export const getBoardDetail = async (boardId: number) => {
    const board = await Board.findByPk(boardId, { include: BOARD_INCLUDE as any });
    if (!board) throw new NotFoundError("Board not found");
    return board;
};

export const updateBoard = async (boardId: number, body: Partial<{
    name: string; description: string; background: string; visibility: BoardVisibility;
    isStarred: boolean; isClosed: boolean;
}>) => {
    const board = await Board.findByPk(boardId);
    if (!board) throw new NotFoundError("Board not found");
    const allowed: Partial<typeof body> = {};
    if (body.name !== undefined) allowed.name = body.name;
    if (body.description !== undefined) allowed.description = body.description;
    if (body.background !== undefined) allowed.background = body.background;
    if (body.visibility !== undefined) allowed.visibility = body.visibility;
    if (body.isStarred !== undefined) allowed.isStarred = body.isStarred;
    if (body.isClosed !== undefined) allowed.isClosed = body.isClosed;
    const updated = await board.update(allowed);
    emitToBoard(boardId, SocketEvent.BOARD_UPDATED, { board: updated });
    return updated;
};

export const closeBoard = async (boardId: number) => {
    const board = await Board.findByPk(boardId);
    if (!board) throw new NotFoundError("Board not found");
    return board.update({ isClosed: true });
};

export const deleteBoard = async (boardId: number) => {
    const board = await Board.findByPk(boardId);
    if (!board) throw new NotFoundError("Board not found");
    await board.destroy();
};

export const inviteMember = async (boardId: number, inviterId: number, email: string, role: BoardRole = "member") => {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) throw new NotFoundError("User not found");
    const exists = await BoardMember.findOne({ where: { boardId, userId: user.id } });
    if (exists) throw new ConflictError("User already a board member");
    const member = await BoardMember.create({ boardId, userId: user.id, role, invitedBy: inviterId });
    emitToBoard(boardId, SocketEvent.MEMBER_JOINED, { userId: user.id });

    const inviter = await User.findByPk(inviterId);
    const board = await Board.findByPk(boardId);
    if (inviter && board) {
        const { sendBoardInviteEmail } = await import("../../utils/email.service");
        const boardUrl = `${env.APP_URL}/board/${boardId}`;
        sendBoardInviteEmail(user.email, user.name, inviter.name, board.name, boardUrl);
    }

    return member;
};

export const updateMemberRole = async (boardId: number, targetUserId: number, role: BoardRole) => {
    const member = await BoardMember.findOne({ where: { boardId, userId: targetUserId } });
    if (!member) throw new NotFoundError("Member not found");
    return member.update({ role });
};

export const removeMember = async (boardId: number, targetUserId: number) => {
    const member = await BoardMember.findOne({ where: { boardId, userId: targetUserId } });
    if (!member) throw new NotFoundError("Member not found");
    await member.destroy();
    emitToBoard(boardId, SocketEvent.MEMBER_LEFT, { userId: targetUserId });
};

export const getMembers = async (boardId: number) =>
    BoardMember.findAll({
        where: { boardId },
        include: [{ model: User, as: "user", attributes: ["id", "name", "email", "avatar"] }],
    });