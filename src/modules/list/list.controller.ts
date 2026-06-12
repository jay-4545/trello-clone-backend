// src/modules/list/list.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./list.service";
import { sendSuccess, sendCreated } from "../../utils/response";

const h = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => { try { await fn(req, res); } catch (e) { next(e); } };

export const getLists = h(async (req: Request, res: Response) => { sendSuccess(res, "Lists", await S.getLists(+req.params.boardId)); });
export const getArchivedLists = h(async (req: Request, res: Response) => { sendSuccess(res, "Archived lists", await S.getArchivedLists(+req.params.boardId)); });
export const createList = h(async (req: Request, res: Response) => { sendCreated(res, "List created", await S.createList(+req.params.boardId, req.body.name)); });
export const updateList = h(async (req: Request, res: Response) => { sendSuccess(res, "Updated", await S.updateList(+req.params.listId, +req.params.boardId, req.body)); });
export const archiveList = h(async (req: Request, res: Response) => { sendSuccess(res, "Archived", await S.archiveList(+req.params.listId, +req.params.boardId)); });
export const deleteList = h(async (req: Request, res: Response) => { await S.deleteList(+req.params.listId, +req.params.boardId); sendSuccess(res, "Deleted"); });
export const reorderLists = h(async (req: Request, res: Response) => { await S.reorderLists(+req.params.boardId, req.body.orderedIds); sendSuccess(res, "Reordered"); });