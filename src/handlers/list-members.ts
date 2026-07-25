import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { currentList, data, type Role } from "../todo-data.js";

registerMainMenuItem({ label: "Manage members", data: "list:members", order: 50 });
const composer = new Composer<Ctx>();

composer.callbackQuery("list:members", async (ctx) => {
  await ctx.answerCallbackQuery();
  const list = currentList(data(ctx));
  if (list.ownerId !== data(ctx).user.chatId) { await ctx.editMessageText("Only the list owner can manage members."); return; }
  if (!list.shared) { await ctx.editMessageText("This is a personal list. Create a shared list to invite teammates.", { reply_markup: inlineKeyboard([[inlineButton("Create shared list", "list:create")], [inlineButton("Back to menu", "menu:main")]]) }); return; }
  await ctx.editMessageText(`Members in “${list.name}”`, { reply_markup: inlineKeyboard([...list.members.map((m) => [inlineButton(`${m.name} · ${m.role}`, `member:view:${list.id}:${m.id}`)]), [inlineButton("Share invite", "list:share")], [inlineButton("Back to menu", "menu:main")]]) });
});

composer.callbackQuery(/^member:view:([^:]+):(\d+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const store = data(ctx); const list = store.lists[ctx.match[1]]; const member = list?.members.find((m) => m.id === Number(ctx.match[2])); if (!list || !member || list.ownerId !== store.user.chatId) { await ctx.editMessageText("That member is no longer available."); return; } if (member.role === "owner") { await ctx.editMessageText("You own this list.", { reply_markup: inlineKeyboard([[inlineButton("Back to members", "list:members")]]) }); return; } await ctx.editMessageText(`Manage ${member.name}.`, { reply_markup: inlineKeyboard([[inlineButton("Make admin", `member:role:${list.id}:${member.id}:admin`), inlineButton("Read-only", `member:role:${list.id}:${member.id}:read-only`)], [inlineButton("Remove member", `member:remove:${list.id}:${member.id}`)], [inlineButton("Back to members", "list:members")]]) }); });
composer.callbackQuery(/^member:role:([^:]+):(\d+):(admin|read-only)$/, async (ctx) => { await ctx.answerCallbackQuery(); const store = data(ctx); const list = store.lists[ctx.match[1]]; const member = list?.members.find((m) => m.id === Number(ctx.match[2])); if (!list || !member || list.ownerId !== store.user.chatId) { await ctx.editMessageText("Only the list owner can change roles."); return; } member.role = ctx.match[3] as Role; await ctx.editMessageText(`${member.name} is now ${member.role}.`, { reply_markup: inlineKeyboard([[inlineButton("Back to members", "list:members")]]) }); });
composer.callbackQuery(/^member:remove:([^:]+):(\d+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const store = data(ctx); const list = store.lists[ctx.match[1]]; if (!list || list.ownerId !== store.user.chatId) { await ctx.editMessageText("Only the list owner can remove members."); return; } const member = list.members.find((m) => m.id === Number(ctx.match[2])); if (!member || member.role === "owner") { await ctx.editMessageText("That member can’t be removed here."); return; } list.members = list.members.filter((m) => m.id !== member.id); await ctx.editMessageText(`${member.name} was removed from the list.`, { reply_markup: inlineKeyboard([[inlineButton("Back to members", "list:members")]]) }); });

export default composer;
