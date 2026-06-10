// src/modules/board/board.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./board.service";
import { sendSuccess, sendCreated } from "../../utils/response";

const h = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => { try { await fn(req, res); } catch (e) { next(e); } };

export const createBoard = h(async (req: Request, res: Response) => { sendCreated(res, "Board created", await S.createBoard(req.user!.id, +req.params.workspaceId, req.body)); });
export const getBoards = h(async (req: Request, res: Response) => { sendSuccess(res, "Boards", await S.getBoards(req.user!.id, +req.params.workspaceId)); });
export const getBoardDetail = h(async (req: Request, res: Response) => { sendSuccess(res, "Board", await S.getBoardDetail(+req.params.boardId)); });
export const updateBoard = h(async (req: Request, res: Response) => { sendSuccess(res, "Updated", await S.updateBoard(+req.params.boardId, req.body)); });
export const closeBoard = h(async (req: Request, res: Response) => { sendSuccess(res, "Board closed", await S.closeBoard(+req.params.boardId)); });
export const deleteBoard = h(async (req: Request, res: Response) => { await S.deleteBoard(+req.params.boardId); sendSuccess(res, "Board deleted"); });
export const inviteMember = h(async (req: Request, res: Response) => { sendCreated(res, "Invited", await S.inviteMember(+req.params.boardId, req.user!.id, req.body.email, req.body.role)); });
export const updateMemberRole = h(async (req: Request, res: Response) => { sendSuccess(res, "Role updated", await S.updateMemberRole(+req.params.boardId, +req.params.userId, req.body.role)); });
export const removeMember = h(async (req: Request, res: Response) => { await S.removeMember(+req.params.boardId, +req.params.userId); sendSuccess(res, "Removed"); });
export const getMembers = h(async (req: Request, res: Response) => { sendSuccess(res, "Members", await S.getMembers(+req.params.boardId)); });