import type { Ctx } from "./bot.js";
import { now } from "./time.js";

export type Role = "owner" | "admin" | "member" | "read-only";
export type TaskStatus = "open" | "done";
export interface Member { id: number; name: string; role: Role; chatId: number; }
export interface Comment { authorId: number; authorName: string; text: string; timestamp: string; }
export interface Activity { actorId: number; action: string; timestamp: string; }
export interface TodoTask {
  id: string; listId: string; title: string; description: string; assigneeId?: number;
  dueDate?: string; reminderTime?: string; creatorId: number; status: TaskStatus; comments: Comment[];
}
export interface TodoList { id: string; name: string; ownerId: number; members: Member[]; taskIds: string[]; shared: boolean; }
export interface Flow { kind: "list-name" | "task-title" | "task-description" | "task-due" | "comment" | "invite-handle"; listId?: string; taskId?: string; }
export interface UserTodoData {
  user: { chatId: number; name: string }; lists: Record<string, TodoList>; listIds: string[];
  tasks: Record<string, TodoTask>; activity: Record<string, Activity[]>; activeListId?: string;
  notifications: boolean; flow?: Flow;
}

function id(prefix: string): string {
  return `${prefix}_${now().getTime().toString(36)}`;
}

function userIdentity(ctx: Ctx) {
  return { chatId: ctx.chat?.id ?? ctx.from?.id ?? 0, name: ctx.from?.first_name ?? "You" };
}

export function data(ctx: Ctx): UserTodoData {
  const identity = userIdentity(ctx);
  if (!ctx.session.todo) {
    const inboxId = `inbox_${identity.chatId}`;
    ctx.session.todo = {
      user: identity, lists: { [inboxId]: { id: inboxId, name: "My Inbox", ownerId: identity.chatId,
        members: [{ id: identity.chatId, name: identity.name, role: "owner", chatId: identity.chatId }], taskIds: [], shared: false } },
      listIds: [inboxId], tasks: {}, activity: { [inboxId]: [] }, activeListId: inboxId, notifications: true,
    };
  }
  ctx.session.todo.user = identity;
  pruneActivity(ctx.session.todo);
  return ctx.session.todo;
}

export function currentList(store: UserTodoData): TodoList {
  return store.lists[store.activeListId ?? store.listIds[0]] ?? store.lists[store.listIds[0]];
}
export function canEdit(list: TodoList, userId: number): boolean {
  return list.members.find((m) => m.id === userId)?.role !== "read-only";
}
export function addActivity(store: UserTodoData, listId: string, actorId: number, action: string): void {
  const entries = store.activity[listId] ?? (store.activity[listId] = []);
  entries.push({ actorId, action, timestamp: now().toISOString() });
  pruneActivity(store);
}
export function pruneActivity(store: UserTodoData): void {
  const cutoff = now().getTime() - 90 * 24 * 60 * 60 * 1000;
  for (const listId of Object.keys(store.activity)) {
    store.activity[listId] = store.activity[listId].filter((entry) => Date.parse(entry.timestamp) >= cutoff);
  }
}
export function createList(store: UserTodoData, name: string, shared: boolean): TodoList {
  const listId = id("list");
  const list: TodoList = { id: listId, name, ownerId: store.user.chatId, shared,
    members: [{ id: store.user.chatId, name: store.user.name, role: "owner", chatId: store.user.chatId }], taskIds: [] };
  store.lists[listId] = list; store.listIds.push(listId); store.activity[listId] = []; store.activeListId = listId;
  addActivity(store, listId, store.user.chatId, "created this list");
  return list;
}
export function createTask(store: UserTodoData, list: TodoList, title: string): TodoTask {
  const task: TodoTask = { id: id("task"), listId: list.id, title, description: "", creatorId: store.user.chatId, status: "open", comments: [] };
  store.tasks[task.id] = task; list.taskIds.push(task.id); addActivity(store, list.id, store.user.chatId, `added “${title}”`); return task;
}
export function shortInvite(list: TodoList): string {
  const expires = now().getTime() + 7 * 24 * 60 * 60 * 1000;
  return `join_${list.ownerId}_${list.id}_${expires}`;
}
export function escape(text: string): string { return text.replace(/[<>]/g, ""); }
