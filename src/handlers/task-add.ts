import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { canEdit, createTask, currentList, data } from "../todo-data.js";
import { now, parseCalendarDate } from "../time.js";
import { scheduleReminder, type ReminderEnv } from "../reminders.js";

registerMainMenuItem({ label: "Add task", data: "task:add", order: 20 });
const composer = new Composer<Ctx>();

composer.callbackQuery("task:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = data(ctx); const list = currentList(store);
  if (!canEdit(list, store.user.chatId)) { await ctx.editMessageText("This list is read-only for you. Ask an admin for edit access."); return; }
  store.flow = { kind: "task-title", listId: list.id };
  await ctx.editMessageText("What needs doing?", { reply_markup: { force_reply: true, input_field_placeholder: "Task title" } as never });
});

composer.on("message:text", async (ctx, next) => {
  const store = data(ctx); const flow = store.flow;
  if (!flow || !["task-title", "task-description", "task-due"].includes(flow.kind)) return next();
  const text = ctx.message.text.trim(); const list = currentList(store);
  if (flow.kind === "task-title") {
    if (!text || text.length > 180) { await ctx.reply("Use a clear task title, then try again."); return; }
    const task = createTask(store, list, text); store.flow = { kind: "task-description", taskId: task.id, listId: list.id };
    await ctx.reply("Add a short description, or tap Skip.", { reply_markup: inlineKeyboard([[inlineButton("Skip", `task:desc:skip:${task.id}`)]]) }); return;
  }
  const task = flow.taskId ? store.tasks[flow.taskId] : undefined;
  if (!task) { store.flow = undefined; await ctx.reply("That task is no longer available. Add it again from the menu."); return; }
  if (flow.kind === "task-description") { task.description = text; store.flow = { kind: "task-due", taskId: task.id, listId: list.id }; await ctx.reply("Set a due date as YYYY-MM-DD, or tap No due date.", { reply_markup: inlineKeyboard([[inlineButton("No due date", `task:due:none:${task.id}`)]]) }); return; }
  const due = parseCalendarDate(text);
  if (!due) { await ctx.reply("Use a date like 2026-08-31, or tap No due date."); return; }
  task.dueDate = due.toISOString(); task.reminderTime = due.toISOString(); store.flow = undefined;
  const env = (ctx as Ctx & { env?: ReminderEnv }).env;
  if (due.getTime() >= now().getTime()) await scheduleReminder(env, store.user.chatId, due.getTime(), `Reminder: “${task.title}” is due today.`);
  await ctx.reply(due.getTime() < now().getTime() ? "That date is in the past, so no reminder was set." : `Due date saved for ${text}.`, { reply_markup: taskActions(task.id) });
});

function taskActions(taskId: string) { return inlineKeyboard([[inlineButton("Assign", `task:assign:${taskId}`), inlineButton("Complete", `task:done:${taskId}`)], [inlineButton("Add comment", `task:comment:${taskId}`)]]); }
composer.callbackQuery(/^task:desc:skip:(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const store = data(ctx); const task = store.tasks[ctx.match[1]]; if (!task) return; store.flow = { kind: "task-due", taskId: task.id, listId: task.listId }; await ctx.editMessageText("Set a due date as YYYY-MM-DD, or tap No due date.", { reply_markup: inlineKeyboard([[inlineButton("No due date", `task:due:none:${task.id}`)]]) }); });
composer.callbackQuery(/^task:due:none:(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const store = data(ctx); const task = store.tasks[ctx.match[1]]; if (!task) { await ctx.editMessageText("That task is no longer available."); return; } store.flow = undefined; await ctx.editMessageText("Task saved with no due date.", { reply_markup: taskActions(task.id) }); });

export default composer;
