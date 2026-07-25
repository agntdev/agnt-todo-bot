import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { createList, data } from "../todo-data.js";

registerMainMenuItem({ label: "Create list", data: "list:create", order: 10 });
const composer = new Composer<Ctx>();

composer.callbackQuery("list:create", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Choose who can use the new list.", { reply_markup: inlineKeyboard([
    [inlineButton("Personal list", "list:create:personal"), inlineButton("Shared list", "list:create:shared")],
    [inlineButton("Back to menu", "menu:main")],
  ]) });
});

composer.callbackQuery(/^list:create:(personal|shared)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const shared = ctx.match[1] === "shared";
  data(ctx).flow = { kind: "list-name", listId: shared ? "shared" : "personal" };
  await ctx.editMessageText(shared ? "Name your shared list." : "Name your personal list.", {
    reply_markup: { force_reply: true, input_field_placeholder: "For example: Launch plan" } as never,
  });
});

composer.on("message:text", async (ctx, next) => {
  const store = data(ctx);
  if (store.flow?.kind !== "list-name") return next();
  const name = ctx.message.text.trim();
  if (!name || name.length > 80) { await ctx.reply("Use a short list name, then try again."); return; }
  const list = createList(store, name, store.flow.listId === "shared"); store.flow = undefined;
  await ctx.reply(`“${list.name}” is ready.`, { reply_markup: inlineKeyboard([[inlineButton("Add a task", "task:add"), inlineButton("Open list", "task:list")]]) });
});

export default composer;
