// src/modules/comment/comment.service.ts
import { Op } from "sequelize";
import Comment from "./comment.model";
import Card from "../card/card.model";
import Board from "../board/board.model";
import User from "../auth/auth.model";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../utils/errors";
import { emitToBoard } from "../../socket";
import { SocketEvent } from "../../types";
import { createNotification } from "../notification/notification.service";

const AUTHOR_INCLUDE = [{ model: User, as: "author", attributes: ["id", "name", "email", "avatar"] }];

// Extract @mentions from comment content  e.g. @[John](42) → 42
function extractMentions(content: string): number[] {
    const matches = [...content.matchAll(/@\[.+?\]\((\d+)\)/g)];
    return [...new Set(matches.map((m) => +m[1]))];
}

export const getComments = async (cardId: number, boardId: number) => {
    // Verify card belongs to board
    const card = await Card.findOne({ where: { id: cardId, boardId } });
    if (!card) throw new NotFoundError("Card not found");

    // Return top-level comments with their replies nested
    return Comment.findAll({
        where: { cardId, parentId: null, isDeleted: false },
        include: [
            ...AUTHOR_INCLUDE,
            {
                model: Comment, as: "replies",
                where: { isDeleted: false },
                required: false,
                include: AUTHOR_INCLUDE,
                order: [["createdAt", "ASC"]] as any,
            },
        ],
        order: [["createdAt", "DESC"]],
    });
};

export const createComment = async (
    userId: number, cardId: number, boardId: number,
    body: { content: string; parentId?: number }
) => {
    const card = await Card.findOne({ where: { id: cardId, boardId } });
    if (!card) throw new NotFoundError("Card not found");

    if (body.parentId) {
        const parent = await Comment.findOne({ where: { id: body.parentId, cardId } });
        if (!parent) throw new NotFoundError("Parent comment not found");
        if (parent.parentId) throw new BadRequestError("Cannot reply to a reply (max 1 level nesting)");
    }

    const mentions = extractMentions(body.content);
    const comment = await Comment.create({
        cardId, userId,
        parentId: body.parentId ?? null,
        content: body.content.trim(),
        mentions,
    });

    // Load with author
    const full = await Comment.findByPk(comment.id, { include: AUTHOR_INCLUDE as any });

    emitToBoard(boardId, SocketEvent.COMMENT_CREATED, { comment: full, cardId });

    const board = await Board.findByPk(boardId, { attributes: ["id", "workspaceId"] });
    const notifMeta = {
        cardId,
        boardId,
        listId: card.listId,
        workspaceId: board?.workspaceId,
    };

    // Notify card creator if someone else comments
    if (card.createdById !== userId) {
        await createNotification({
            userId: card.createdById, actorId: userId,
            type: "card_commented", title: "New comment on your card",
            body: `${body.content.slice(0, 80)}…`,
            entityType: "comment", entityId: comment.id,
            metadata: notifMeta,
        });
    }

    // Notify @mentioned users
    for (const mentionedId of mentions) {
        if (mentionedId !== userId) {
            await createNotification({
                userId: mentionedId, actorId: userId,
                type: "mention", title: "You were mentioned in a comment",
                body: body.content.slice(0, 80),
                entityType: "comment", entityId: comment.id,
                metadata: notifMeta,
            });
        }
    }

    return full;
};

export const updateComment = async (
    commentId: number, userId: number, boardId: number, content: string
) => {
    const comment = await Comment.findByPk(commentId, { include: AUTHOR_INCLUDE as any });
    if (!comment) throw new NotFoundError("Comment not found");
    if (comment.userId !== userId) throw new ForbiddenError("Cannot edit another user's comment");

    const mentions = extractMentions(content);
    const updated = await comment.update({ content: content.trim(), mentions, isEdited: true });

    // Find boardId via card
    const card = await Card.findByPk(comment.cardId);
    if (card) emitToBoard(card.boardId, SocketEvent.COMMENT_UPDATED, { comment: updated });

    return updated;
};

export const deleteComment = async (commentId: number, userId: number, userRole: string) => {
    const comment = await Comment.findByPk(commentId);
    if (!comment) throw new NotFoundError("Comment not found");

    const isOwner = comment.userId === userId;
    const isAdmin = userRole === "super_admin" || userRole === "admin";
    if (!isOwner && !isAdmin) throw new ForbiddenError("Cannot delete another user's comment");

    // Soft-delete: preserve thread structure
    await comment.update({ isDeleted: true, content: "[deleted]" });

    const card = await Card.findByPk(comment.cardId);
    if (card) emitToBoard(card.boardId, SocketEvent.COMMENT_DELETED, { commentId, cardId: comment.cardId });
};