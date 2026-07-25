import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem, urlButton } from "../toolkit/index.js";
import { currentList, data, shortInvite } from "../todo-data.js";

registerMainMenuItem({ label: "Share list", data: "list:share", order: 40 });
const composer = new Composer<Ctx>();

composer.callbackQuery("list:share", async (ctx) => {
  await ctx.answerCallbackQuery();
  const list = currentList(data(ctx));
  if (!list.shared) { await ctx.editMessageText("Make a shared list first, then invite teammates to it.", { reply_markup: inlineKeyboard([[inlineButton("Create shared list", "list:create")], [inlineButton("Back to menu", "menu:main")]]) }); return; }
  const code = shortInvite(list);
  const username = ctx.me.username;
  const url = username ? `https://t.me/${username}?start=${code}` : undefined;
  await ctx.editMessageText("Share this invite. Teammates ask to join, and you approve each request.", { reply_markup: inlineKeyboard([
    ...(url ? [[urlButton("Open invite link", url)]] : []),
    [inlineButton("Invite by handle", "list:share:handle")], [inlineButton("Back to menu", "menu:main")],
  ]) });
});

composer.callbackQuery("list:share:handle", async (ctx) => { await ctx.answerCallbackQuery(); data(ctx).flow = { kind: "invite-handle", listId: currentList(data(ctx)).id }; await ctx.editMessageText("Send the teammate’s @handle. They still need to open the invite link themselves.", { reply_markup: { force_reply: true, input_field_placeholder: "@teammate" } as never }); });
composer.on("message:text", async (ctx, next) => { const store = data(ctx); if (store.flow?.kind !== "invite-handle" || !store.flow.listId) return next(); const handle = ctx.message.text.trim(); if (!/^@[A-Za-z0-9_]{5,32}$/.test(handle)) { await ctx.reply("Send a Telegram handle like @teammate."); return; } const list = store.lists[store.flow.listId]; store.flow = undefined; await ctx.reply(`Ask ${handle} to open your invite link. Telegram only lets them opt in after they start the bot.`, { reply_markup: inlineKeyboard([[inlineButton("Share list", "list:share")]]) }); });

composer.callbackQuery(/^join:req:(\d+):(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const store = data(ctx); const owner = Number(ctx.match[1]); const listId = ctx.match[2]; const safeName = encodeURIComponent(store.user.name).slice(0, 24); await ctx.editMessageText("Your join request is ready for the owner to approve."); try { await ctx.api.sendMessage(owner, `${store.user.name} wants to join your shared list.`, { reply_markup: inlineKeyboard([[inlineButton("Approve", `join:approve:${listId}:${store.user.chatId}:${safeName}`), inlineButton("Reject", `join:reject:${listId}:${store.user.chatId}:${safeName}`)]]) }); } catch { await ctx.reply("The owner can’t receive requests right now. Ask them to open TodoFlow first."); } });
composer.callbackQuery(/^join:(approve|reject):([^:]+):(\d+):(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const store = data(ctx); const list = store.lists[ctx.match[2]]; const requester = Number(ctx.match[3]); const name = decodeURIComponent(ctx.match[4]); if (!list || list.ownerId !== store.user.chatId) { await ctx.editMessageText("Only the list owner can decide this request."); return; } if (ctx.match[1] === "reject") { await ctx.editMessageText("Join request declined."); try { await ctx.api.sendMessage(requester, "Your request to join was declined."); } catch {} return; } if (!list.members.some((m) => m.id === requester)) list.members.push({ id: requester, name, role: "member", chatId: requester }); await ctx.editMessageText("Join request approved. The new member can now work from their shared list."); try { await ctx.api.sendMessage(requester, `Your request was approved. Open TodoFlow and choose your shared list.`, { reply_markup: inlineKeyboard([[inlineButton("Open my tasks", "task:list")]]) }); } catch {} });

export default composer;
