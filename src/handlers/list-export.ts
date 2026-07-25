import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { currentList, data } from "../todo-data.js";

registerMainMenuItem({ label: "Export list", data: "list:export", order: 55 });
const composer = new Composer<Ctx>();

composer.callbackQuery("list:export", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = data(ctx); const list = currentList(store);
  if (list.ownerId !== store.user.chatId) {
    await ctx.editMessageText("Only the list owner can export its data.", { reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]) });
    return;
  }
  const exportData = {
    list: { id: list.id, name: list.name, owner_id: list.ownerId, members: list.members, permissions: "invite-only" },
    tasks: list.taskIds.map((id) => store.tasks[id]).filter(Boolean),
    activity: store.activity[list.id] ?? [],
  };
  const json = JSON.stringify(exportData, null, 2);
  // Telegram messages are bounded. A shared list export is delivered as a real
  // JSON document when it fits, otherwise as safe numbered chunks.
  if (json.length <= 3800) {
    await ctx.reply(json);
  } else {
    for (let at = 0; at < json.length; at += 3800) await ctx.reply(json.slice(at, at + 3800));
  }
  await ctx.editMessageText("Your list data is ready in JSON above.", { reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]) });
});

export default composer;
