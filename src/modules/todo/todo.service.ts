import { Op, WhereOptions } from "sequelize";
import Todo, { TodoAttributes, TodoPriority, TodoStatus } from "./todo.model";
import { NotFoundError, ForbiddenError } from "../../utils/errors";

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: TodoPriority;
  dueDate?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string | null;
}

export interface GetTodosQuery {
  status?: TodoStatus;
  priority?: TodoPriority;
  search?: string;
  page?: number;
  limit?: number;
}

export const createTodo = async (userId: number, input: CreateTodoInput) => {
  const todo = await Todo.create({
    userId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority ?? "medium",
    status: "pending",
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
  });
  return todo;
};

export const getAllTodos = async (userId: number, query: GetTodosQuery) => {
  const { status, priority, search, page = 1, limit = 10 } = query;
  const offset = (page - 1) * limit;

  const where: WhereOptions<TodoAttributes> = { userId };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.title = { [Op.iLike]: `%${search}%` };
  }

  const { count, rows } = await Todo.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  return {
    todos: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

export const getTodoById = async (id: number, userId: number) => {
  const todo = await Todo.findByPk(id);

  if (!todo) {
    throw new NotFoundError("Todo not found");
  }

  if (todo.userId !== userId) {
    throw new ForbiddenError("You do not have access to this todo");
  }

  return todo;
};

export const updateTodo = async (
  id: number,
  userId: number,
  input: UpdateTodoInput
) => {
  const todo = await getTodoById(id, userId);

  await todo.update({
    ...(input.title && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status && { status: input.status }),
    ...(input.priority && { priority: input.priority }),
    ...(input.dueDate !== undefined && {
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    }),
  });

  return todo;
};

export const deleteTodo = async (id: number, userId: number) => {
  const todo = await getTodoById(id, userId);
  await todo.destroy();
};

export const getTodoStats = async (userId: number) => {
  const [pending, in_progress, completed] = await Promise.all([
    Todo.count({ where: { userId, status: "pending" } }),
    Todo.count({ where: { userId, status: "in_progress" } }),
    Todo.count({ where: { userId, status: "completed" } }),
  ]);

  return {
    total: pending + in_progress + completed,
    pending,
    in_progress,
    completed,
  };
};
