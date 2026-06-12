// src/modules/card/card.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./card.service";
import { sendSuccess, sendCreated } from "../../utils/response";
import { BadRequestError } from "../../utils/errors";

const h = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => {
    try { await fn(req, res); } catch (e) { next(e); }
};

export const createCard = h(async (req: Request, res: Response) => { sendCreated(res, "Card created", await S.createCard(req.user!.id, +req.params.boardId, +req.params.listId, req.body)); });
export const getCard = h(async (req: Request, res: Response) => { sendSuccess(res, "Card", await S.getCard(+req.params.cardId, +req.params.boardId)); });
export const getCards = h(async (req: Request, res: Response) => {
    const { page, limit, search, priority, assigneeId } = req.query as Record<string, string>;
    const result = await S.getCards(+req.params.boardId, +req.params.listId, {
        page: page ? +page : 1, limit: limit ? +limit : 50,
        search, priority: priority as any,
        assigneeId: assigneeId ? +assigneeId : undefined,
    });
    sendSuccess(res, "Cards", result.cards, 200, result.meta);
});
export const updateCard = h(async (req: Request, res: Response) => { sendSuccess(res, "Updated", await S.updateCard(+req.params.cardId, +req.params.boardId, req.body)); });
export const moveCard = h(async (req: Request, res: Response) => {
    const { targetListId, position } = req.body;
    if (!targetListId) throw new BadRequestError("targetListId required");
    sendSuccess(res, "Card moved", await S.moveCard(+req.params.cardId, +req.params.boardId, +targetListId, position));
});
export const reorderCards = h(async (req: Request, res: Response) => { await S.reorderCards(+req.params.boardId, +req.params.listId, req.body.orderedIds); sendSuccess(res, "Reordered"); });
export const assignUser = h(async (req: Request, res: Response) => { sendSuccess(res, "Assigned", await S.assignUser(+req.params.cardId, +req.params.boardId, +req.body.userId, req.user!.id)); });
export const unassignUser = h(async (req: Request, res: Response) => { await S.unassignUser(+req.params.cardId, +req.params.boardId, +req.params.userId); sendSuccess(res, "Unassigned"); });
export const addChecklist = h(async (req: Request, res: Response) => { sendCreated(res, "Item added", await S.addChecklistItem(+req.params.cardId, +req.params.boardId, req.body.text)); });
export const updateChecklist = h(async (req: Request, res: Response) => { sendSuccess(res, "Item updated", await S.updateChecklistItem(+req.params.cardId, +req.params.boardId, req.params.itemId, req.body)); });
export const deleteChecklist = h(async (req: Request, res: Response) => { await S.deleteChecklistItem(+req.params.cardId, +req.params.boardId, req.params.itemId); sendSuccess(res, "Item deleted"); });
export const archiveCard = h(async (req: Request, res: Response) => { await S.archiveCard(+req.params.cardId, +req.params.boardId); sendSuccess(res, "Archived"); });
export const restoreCard = h(async (req: Request, res: Response) => { sendSuccess(res, "Restored", await S.restoreCard(+req.params.cardId, +req.params.boardId)); });
export const deleteCard = h(async (req: Request, res: Response) => { await S.deleteCard(+req.params.cardId, +req.params.boardId); sendSuccess(res, "Deleted"); });
export const bulkMove = h(async (req: Request, res: Response) => { sendSuccess(res, "Bulk moved", await S.bulkMoveCards(+req.params.boardId, req.body.cardIds, req.body.targetListId)); });
export const searchCards = h(async (req: Request, res: Response) => { sendSuccess(res, "Search results", await S.searchCards(+req.params.boardId, req.query.q as string)); });
export const getBoardStats = h(async (req: Request, res: Response) => { sendSuccess(res, "Stats", await S.getBoardStats(+req.params.boardId)); });

// ─── Cover image upload ───────────────────────────────────────────────────────
export const uploadCoverImage = h(async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestError("No image file provided");
    sendSuccess(res, "Cover updated", await S.uploadCoverImage(+req.params.cardId, +req.params.boardId, req.file.buffer));
});

export const uploadAttachment = h(async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestError("No file provided");
    sendSuccess(res, "Attachment uploaded", await S.uploadAttachment(
        +req.params.cardId, +req.params.boardId, req.file.buffer, req.file.originalname
    ));
});

export const deleteAttachment = h(async (req: Request, res: Response) => {
    sendSuccess(res, "Attachment deleted", await S.deleteAttachment(+req.params.cardId, +req.params.boardId, +req.params.index));
});

export const getArchivedCards = h(async (req: Request, res: Response) => {
    sendSuccess(res, "Archived cards", await S.getArchivedCards(+req.params.boardId));
});