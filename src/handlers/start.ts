import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard } from "../toolkit/index.js";
import { data, shortInvite } from "../todo-data.js";
import { now } from "../time.js";

// The /start handler renders the bot's MAIN MENU — the primary way users operate
// a button-first bot. A feature adds its own button by calling
// `registerMainMenuItem(...)` in its own `src/handlers/<slug>.ts`; this handler
// renders whatever is registered (plus a Help button), so you do NOT edit this
// file to add a feature. Send ONE message — no placeholder line above the menu.
const composer = new Composer<Ctx>();

const WELCOME = "Welcome to TodoFlow. Create a list, add a task, or share work with your team.";

composer.command("start", async (ctx) => {
  const store = data(ctx);
  const payload = ctx.match?.trim();
  if (payload?.startsWith("join_")) {
    const [, ownerText, listId, expiryText] = payload.split("_");
    const expiry = Number(expiryText);
    if (!ownerText || !listId || !Number.isFinite(expiry) || expiry < now().getTime()) {
      await ctx.reply("That invite has expired. Ask the list owner for a fresh link.");
      return;
    }
    // The invitee has explicitly started the bot. Keep a pending request in their
    // durable record; the owner approves only after Telegram permits contact.
    store.flow = { kind: "invite-handle", listId };
    await ctx.reply("You’re ready to join. Send this request to the list owner to approve it.", {
      reply_markup: { inline_keyboard: [[{ text: "Request to join", callback_data: `join:req:${ownerText}:${listId}` }]] },
    });
    return;
  }
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

// "Back to menu" — re-render the main menu in place from any sub-view.
composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
