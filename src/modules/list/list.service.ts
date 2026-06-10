// src/modules/list/list.service.ts
import sequelize from "../../config/db";
import List from "./list.model";
import { NotFoundError, BadRequestError } from "../../utils/errors";
import { emitToBoard } from "../../socket";
import { SocketEvent } from "../../types";
import Card from "../card/card.model";

export const getLists = async (boardId: number) =>
    List.findAll({
        where: { boardId, isArchived: false },
        include: [{ model: Card, as: "cards", where: { isArchived: false }, required: false, order: [["position", "ASC"]] as any }],
        order: [["position", "ASC"]],
    });

export const createList = async (boardId: number, name: string) => {
    const max = (await List.max<number, List>("position", { where: { boardId } }) as number) ?? 0;
    const list = await List.create({ boardId, name, position: max + 65536 });
    emitToBoard(boardId, SocketEvent.LIST_CREATED, { list });
    return list;
};

export const updateList = async (listId: number, boardId: number, body: { name?: string }) => {
    const list = await List.findOne({ where: { id: listId, boardId } });
    if (!list) throw new NotFoundError("List not found");
    const updated = await list.update(body);
    emitToBoard(boardId, SocketEvent.LIST_UPDATED, { list: updated });
    return updated;
};

export const archiveList = async (listId: number, boardId: number) => {
    const list = await List.findOne({ where: { id: listId, boardId } });
    if (!list) throw new NotFoundError("List not found");
    return list.update({ isArchived: true });
};

export const deleteList = async (listId: number, boardId: number) => {
    const list = await List.findOne({ where: { id: listId, boardId } });
    if (!list) throw new NotFoundError("List not found");
    await list.destroy();
    emitToBoard(boardId, SocketEvent.LIST_DELETED, { listId });
};

/** Fractional reorder — sets new float position to midpoint between neighbours */
export const reorderLists = async (boardId: number, orderedIds: number[]) => {
    if (!orderedIds?.length) throw new BadRequestError("orderedIds required");
    const t = await sequelize.transaction();
    try {
        await Promise.all(orderedIds.map((id, i) =>
            List.update({ position: (i + 1) * 65536 }, { where: { id, boardId }, transaction: t })
        ));
        await t.commit();
        emitToBoard(boardId, SocketEvent.LIST_REORDERED, { orderedIds });
    } catch (e) { await t.rollback(); throw e; }
};