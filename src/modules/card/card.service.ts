// src/modules/card/card.service.ts
import { Op, literal } from "sequelize";
import sequelize from "../../config/db";
import Card, { ChecklistItem } from "./card.model";
import CardAssignee from "./card-assignee.model";
import List from "../list/list.model";
import Board from "../board/board.model";
import User from "../auth/auth.model";
import { NotFoundError, BadRequestError, ForbiddenError } from "../../utils/errors";
import { emitToBoard } from "../../socket";
import { SocketEvent, CardPriority, CardStatus } from "../../types";
import { createNotification } from "../notification/notification.service";
import { sendCardAssignedEmail } from "../../utils/email.service";
import env from "../../config/env";
import { deleteFromCloudinary, extractPublicId, uploadToCloudinary } from "../../middleware/upload.middleware";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findCard(cardId: number, boardId: number): Promise<Card> {
    const card = await Card.findOne({ where: { id: cardId, boardId, isArchived: false } });
    if (!card) throw new NotFoundError("Card not found");
    return card;
}

async function nextPosition(listId: number): Promise<number> {
    const max = (await Card.max<number, Card>("position", { where: { listId } }) as number) ?? 0;
    return max + 65536;
}

const CARD_INCLUDE = [
    { model: User, as: "creator", attributes: ["id", "name", "email", "avatar"] },
    {
        model: CardAssignee, as: "assignees",
        include: [{ model: User, as: "user", attributes: ["id", "name", "email", "avatar"] }]
    },
];

// ─── Create ───────────────────────────────────────────────────────────────────

export const createCard = async (
    userId: number, boardId: number, listId: number,
    body: { title: string; description?: string; priority?: CardPriority; dueDate?: string; labels?: string[]; tags?: string[] }
) => {
    // Verify list belongs to board
    const list = await List.findOne({ where: { id: listId, boardId } });
    if (!list) throw new NotFoundError("List not found");

    const card = await Card.create({
        listId, boardId, createdById: userId,
        title: body.title.trim(),
        description: body.description?.trim() ?? null,
        priority: body.priority ?? "medium",
        position: await nextPosition(listId),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        labels: body.labels ?? [],
        tags: body.tags ?? [],
    });

    emitToBoard(boardId, SocketEvent.CARD_CREATED, { card, listId });
    return card;
};

// ─── Get single card ──────────────────────────────────────────────────────────

export const getCard = async (cardId: number, boardId: number) => {
    const card = await Card.findOne({
        where: { id: cardId, boardId },
        include: CARD_INCLUDE as any,
    });
    if (!card) throw new NotFoundError("Card not found");
    return card;
};

// ─── List cards in a list ─────────────────────────────────────────────────────

export const getCards = async (
    boardId: number, listId: number,
    query: { page?: number; limit?: number; search?: string; priority?: CardPriority; assigneeId?: number }
) => {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 50);

    const where: any = { boardId, listId, isArchived: false };
    if (query.priority) where.priority = query.priority;
    if (query.search) where.title = { [Op.iLike]: `%${query.search}%` };
    if (query.assigneeId) {
        where["$assignees.userId$"] = query.assigneeId;
    }

    const { count, rows } = await Card.findAndCountAll({
        where,
        include: CARD_INCLUDE as any,
        limit, offset: (page - 1) * limit,
        order: [["position", "ASC"]],
        subQuery: false,
    });

    return { cards: rows, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
};

// ─── Update card ──────────────────────────────────────────────────────────────

export const updateCard = async (
    cardId: number, boardId: number,
    body: Partial<{
        title: string; description: string | null; status: CardStatus; priority: CardPriority;
        dueDate: string | null; startDate: string | null; labels: string[]; tags: string[];
        estimateHours: number | null; coverImage: string | null;
    }>
) => {
    const card = await findCard(cardId, boardId);

    const update: any = {};
    if (body.title !== undefined) update.title = body.title.trim();
    if (body.description !== undefined) update.description = body.description;
    if (body.status !== undefined) update.status = body.status;
    if (body.priority !== undefined) update.priority = body.priority;
    if (body.labels !== undefined) update.labels = body.labels;
    if (body.tags !== undefined) update.tags = body.tags;
    if (body.estimateHours !== undefined) update.estimateHours = body.estimateHours;
    if (body.coverImage !== undefined) update.coverImage = body.coverImage;
    if (body.dueDate !== undefined) update.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.startDate !== undefined) update.startDate = body.startDate ? new Date(body.startDate) : null;

    const updated = await card.update(update);
    emitToBoard(boardId, SocketEvent.CARD_UPDATED, { card: updated });
    return updated;
};

// ─── Move card (between lists or reorder within a list) ───────────────────────

export const moveCard = async (
    cardId: number, boardId: number,
    targetListId: number, position?: number
) => {
    const card = await findCard(cardId, boardId);

    // Verify target list is on same board
    const targetList = await List.findOne({ where: { id: targetListId, boardId } });
    if (!targetList) throw new BadRequestError("Target list not on this board");

    const newPosition = position ?? await nextPosition(targetListId);
    const fromListId = card.listId;

    await card.update({ listId: targetListId, position: newPosition });

    emitToBoard(boardId, SocketEvent.CARD_MOVED, {
        cardId, fromListId, toListId: targetListId, position: newPosition,
    });

    return card;
};

// ─── Reorder cards within a list ─────────────────────────────────────────────

export const reorderCards = async (boardId: number, listId: number, orderedIds: number[]) => {
    if (!orderedIds?.length) throw new BadRequestError("orderedIds required");
    const t = await sequelize.transaction();
    try {
        await Promise.all(
            orderedIds.map((id, i) =>
                Card.update({ position: (i + 1) * 65536 }, { where: { id, boardId, listId }, transaction: t })
            )
        );
        await t.commit();
        emitToBoard(boardId, SocketEvent.CARD_MOVED, { listId, orderedIds });
    } catch (e) { await t.rollback(); throw e; }
};

// ─── Assign / unassign ────────────────────────────────────────────────────────

export const assignUser = async (cardId: number, boardId: number, targetUserId: number, assignedBy: number) => {
    const card = await findCard(cardId, boardId);
    const exists = await CardAssignee.findOne({ where: { cardId, userId: targetUserId } });
    if (exists) throw new BadRequestError("User already assigned");

    await CardAssignee.create({ cardId, userId: targetUserId, assignedBy });

    emitToBoard(boardId, SocketEvent.CARD_ASSIGNED, { cardId, userId: targetUserId });

    // Notify assigned user
    const board = await Board.findByPk(boardId, { attributes: ["id", "workspaceId"] });
    await createNotification({
        userId: targetUserId, actorId: assignedBy,
        type: "card_assigned",
        title: "You were assigned to a card",
        body: `Card: ${card.title}`,
        entityType: "card", entityId: cardId,
        metadata: {
            cardId,
            boardId,
            listId: card.listId,
            workspaceId: board?.workspaceId,
        },
    });

    const assignedUser = await User.findByPk(targetUserId);
    const actor = await User.findByPk(assignedBy);
    if (assignedUser && actor) {
        const cardUrl = `${env.APP_URL}/card/${cardId}`;
        sendCardAssignedEmail(assignedUser.email, assignedUser.name, card.title, `Board #${boardId}`, actor.name, cardUrl);
    }

    return CardAssignee.findAll({
        where: { cardId },
        include: [{ model: User, as: "user", attributes: ["id", "name", "email", "avatar"] }],
    });
};

export const unassignUser = async (cardId: number, boardId: number, targetUserId: number) => {
    await findCard(cardId, boardId);
    const assignee = await CardAssignee.findOne({ where: { cardId, userId: targetUserId } });
    if (!assignee) throw new NotFoundError("Assignee not found");
    await assignee.destroy();
};

// ─── Checklist ────────────────────────────────────────────────────────────────

export const addChecklistItem = async (cardId: number, boardId: number, text: string) => {
    const card = await findCard(cardId, boardId);
    const item: ChecklistItem = { id: require("uuid").v4(), text: text.trim(), completed: false };
    await card.update({ checklist: [...card.checklist, item] });
    emitToBoard(boardId, SocketEvent.CARD_UPDATED, { cardId, checklist: card.checklist });
    return card.checklist;
};

export const updateChecklistItem = async (cardId: number, boardId: number, itemId: string, update: { text?: string; completed?: boolean }) => {
    const card = await findCard(cardId, boardId);
    const checklist = card.checklist.map((item) =>
        item.id === itemId ? { ...item, ...update } : item
    );
    if (checklist.length === card.checklist.length && !checklist.find((i) => i.id === itemId))
        throw new NotFoundError("Checklist item not found");
    await card.update({ checklist });
    emitToBoard(boardId, SocketEvent.CARD_UPDATED, { cardId, checklist });
    return checklist;
};

export const deleteChecklistItem = async (cardId: number, boardId: number, itemId: string) => {
    const card = await findCard(cardId, boardId);
    const checklist = card.checklist.filter((i) => i.id !== itemId);
    await card.update({ checklist });
    emitToBoard(boardId, SocketEvent.CARD_UPDATED, { cardId, checklist });
    return checklist;
};

// ─── Archive / restore ────────────────────────────────────────────────────────

export const archiveCard = async (cardId: number, boardId: number) => {
    const card = await findCard(cardId, boardId);
    await card.update({ isArchived: true });
    emitToBoard(boardId, SocketEvent.CARD_DELETED, { cardId });
};

export const restoreCard = async (cardId: number, boardId: number) => {
    const card = await Card.findOne({ where: { id: cardId, boardId, isArchived: true } });
    if (!card) throw new NotFoundError("Archived card not found");
    await card.update({ isArchived: false });
    emitToBoard(boardId, SocketEvent.CARD_CREATED, { card });
    return card;
};

export const deleteCard = async (cardId: number, boardId: number) => {
    const card = await Card.findOne({ where: { id: cardId, boardId } });
    if (!card) throw new NotFoundError("Card not found");
    await card.destroy();
    emitToBoard(boardId, SocketEvent.CARD_DELETED, { cardId });
};

// ─── Bulk operations ─────────────────────────────────────────────────────────

export const bulkMoveCards = async (boardId: number, cardIds: number[], targetListId: number) => {
    if (cardIds.length > 50) throw new BadRequestError("Max 50 cards per bulk move");
    const list = await List.findOne({ where: { id: targetListId, boardId } });
    if (!list) throw new BadRequestError("Target list not on this board");
    let pos = (await Card.max<number, Card>("position", { where: { listId: targetListId } }) as number ?? 0);
    const t = await sequelize.transaction();
    try {
        await Promise.all(cardIds.map((id) => {
            pos += 65536;
            return Card.update({ listId: targetListId, position: pos }, { where: { id, boardId }, transaction: t });
        }));
        await t.commit();
        emitToBoard(boardId, SocketEvent.CARD_MOVED, { cardIds, targetListId, bulk: true });
    } catch (e) { await t.rollback(); throw e; }
    return { moved: cardIds.length };
};

// ─── Search across a board ────────────────────────────────────────────────────

export const searchCards = async (boardId: number, q: string) => {
    if (!q || q.length < 2) throw new BadRequestError("Query must be at least 2 characters");
    return Card.findAll({
        where: {
            boardId,
            isArchived: false,
            [Op.or]: [
                { title: { [Op.iLike]: `%${q}%` } },
                { description: { [Op.iLike]: `%${q}%` } },
                { tags: { [Op.contains]: [q.toLowerCase()] } },
            ],
        },
        include: [{ model: User, as: "creator", attributes: ["id", "name", "email", "avatar"] }],
        limit: 50,
        order: [["updatedAt", "DESC"]],
    });
};

// ─── Stats per board ──────────────────────────────────────────────────────────

export const getBoardStats = async (boardId: number) => {
    const [total, byStatus, overdue, doneThisWeek] = await Promise.all([
        Card.count({ where: { boardId, isArchived: false } }),
        Card.findAll({
            where: { boardId, isArchived: false },
            attributes: ["status", [sequelize.fn("COUNT", "*"), "count"]],
            group: ["status"],
            raw: true,
        }),
        Card.count({ where: { boardId, isArchived: false, dueDate: { [Op.lt]: new Date() }, status: { [Op.notIn]: ["done", "archived"] } } }),
        Card.count({ where: { boardId, status: "done", completedAt: { [Op.gte]: new Date(Date.now() - 7 * 864e5) } } }),
    ]);

    return { total, byStatus, overdue, doneThisWeek };
};

export const uploadAttachment = async (cardId: number, boardId: number, fileBuffer: Buffer, originalName: string) => {
    const card = await findCard(cardId, boardId);
    const { url } = await uploadToCloudinary(fileBuffer, "card-attachments", `card_${cardId}_${Date.now()}`, "auto");
    const attachmentUrl = `${url}#${encodeURIComponent(originalName)}`;
    const attachments = [...card.attachments, attachmentUrl];
    await card.update({ attachments });
    emitToBoard(boardId, SocketEvent.CARD_UPDATED, { cardId, attachments });
    return { attachments };
};

export const deleteAttachment = async (cardId: number, boardId: number, index: number) => {
    const card = await findCard(cardId, boardId);
    if (index < 0 || index >= card.attachments.length) throw new BadRequestError("Invalid attachment index");
    const removed = card.attachments[index];
    const publicId = extractPublicId(removed.split("#")[0]);
    if (publicId) await deleteFromCloudinary(publicId);
    const attachments = card.attachments.filter((_, i) => i !== index);
    await card.update({ attachments });
    emitToBoard(boardId, SocketEvent.CARD_UPDATED, { cardId, attachments });
    return { attachments };
};

export const getArchivedCards = async (boardId: number) =>
    Card.findAll({
        where: { boardId, isArchived: true },
        include: [{ model: User, as: "creator", attributes: ["id", "name", "email", "avatar"] }],
        order: [["updatedAt", "DESC"]],
    });

export const uploadCoverImage = async (cardId: number, boardId: number, fileBuffer: Buffer) => {
    const card = await findCard(cardId, boardId);

    // Delete old cover from Cloudinary if one exists
    if (card.coverImage) {
        const oldId = extractPublicId(card.coverImage);
        if (oldId) await deleteFromCloudinary(oldId);
    }

    const { url } = await uploadToCloudinary(fileBuffer, "card-covers", `card_${cardId}`);
    await card.update({ coverImage: url });
    emitToBoard(boardId, SocketEvent.CARD_UPDATED, { cardId, coverImage: url });
    return { coverImage: url };
};