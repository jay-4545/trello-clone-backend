import { Request, Response, NextFunction } from "express";
import * as TodoService from "./todo.service";
import { sendSuccess, sendCreated } from "../../utils/response";

export const createTodo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const todo = await TodoService.createTodo(req.user!.id, req.body);
    sendCreated(res, "Todo created successfully", todo);
  } catch (err) {
    next(err);
  }
};

export const getAllTodos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, priority, search, page, limit } = req.query as {
      status?: string;
      priority?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = await TodoService.getAllTodos(req.user!.id, {
      status: status as any,
      priority: priority as any,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });

    sendSuccess(res, "Todos fetched successfully", result.todos, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

export const getTodoById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const todo = await TodoService.getTodoById(Number(req.params.id), req.user!.id);
    sendSuccess(res, "Todo fetched successfully", todo);
  } catch (err) {
    next(err);
  }
};

export const updateTodo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const todo = await TodoService.updateTodo(Number(req.params.id), req.user!.id, req.body);
    sendSuccess(res, "Todo updated successfully", todo);
  } catch (err) {
    next(err);
  }
};

export const deleteTodo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await TodoService.deleteTodo(Number(req.params.id), req.user!.id);
    sendSuccess(res, "Todo deleted successfully");
  } catch (err) {
    next(err);
  }
};

export const getTodoStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await TodoService.getTodoStats(req.user!.id);
    sendSuccess(res, "Todo stats fetched successfully", stats);
  } catch (err) {
    next(err);
  }
};
