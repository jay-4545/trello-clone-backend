// src/modules/comment/comment.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./comment.service";
import { sendSuccess, sendCreated } from "../../utils/response";

const h = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => { try { await fn(req, res); } catch (e) { next(e); } };

export const getComments = h(async (req: Request, res: Response) => { sendSuccess(res, "Comments", await S.getComments(+req.params.cardId, +req.params.boardId)); });
export const createComment = h(async (req: Request, res: Response) => { sendCreated(res, "Comment created", await S.createComment(req.user!.id, +req.params.cardId, +req.params.boardId, req.body)); });
export const updateComment = h(async (req: Request, res: Response) => { sendSuccess(res, "Updated", await S.updateComment(+req.params.commentId, req.user!.id, +req.params.boardId, req.body.content)); });
export const deleteComment = h(async (req: Request, res: Response) => { await S.deleteComment(+req.params.commentId, req.user!.id, req.user!.role); sendSuccess(res, "Deleted"); });