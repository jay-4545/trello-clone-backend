// src/modules/workspace/workspace.controller.ts
import { Request, Response, NextFunction } from "express";
import * as S from "./workspace.service";
import { sendSuccess, sendCreated } from "../../utils/response";

const h = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => { try { await fn(req, res); } catch (e) { next(e); } };

export const createWorkspace = h(async (req: Request, res: Response) => { sendCreated(res, "Workspace created", await S.createWorkspace(req.user!.id, req.body)); });
export const getMyWorkspaces = h(async (req: Request, res: Response) => { sendSuccess(res, "Workspaces", await S.getMyWorkspaces(req.user!.id)); });
export const getWorkspace = h(async (req: Request, res: Response) => { sendSuccess(res, "Workspace", await S.getWorkspace(+req.params.workspaceId, req.user!.id)); });
export const updateWorkspace = h(async (req: Request, res: Response) => { sendSuccess(res, "Updated", await S.updateWorkspace(+req.params.workspaceId, req.user!.id, req.body)); });
export const deleteWorkspace = h(async (req: Request, res: Response) => { await S.deleteWorkspace(+req.params.workspaceId, req.user!.id); sendSuccess(res, "Workspace deleted"); });
export const inviteMember = h(async (req: Request, res: Response) => { sendCreated(res, "Member invited", await S.inviteMember(+req.params.workspaceId, req.user!.id, req.body.email, req.body.role)); });
export const updateMemberRole = h(async (req: Request, res: Response) => { sendSuccess(res, "Role updated", await S.updateMemberRole(+req.params.workspaceId, +req.params.userId, req.body.role)); });
export const removeMember = h(async (req: Request, res: Response) => { await S.removeMember(+req.params.workspaceId, req.user!.id, +req.params.userId); sendSuccess(res, "Removed"); });
export const getMembers = h(async (req: Request, res: Response) => { sendSuccess(res, "Members", await S.getMembers(+req.params.workspaceId)); });