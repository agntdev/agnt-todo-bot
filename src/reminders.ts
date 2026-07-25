/** Worker-only reminder bridge. Node deployments still save reminder metadata;
 * Worker deployments route it to the toolkit Durable Object alarm. */
export interface ReminderEnv {
  CHAT_DO?: { idFromName(name: string): unknown; get(id: unknown): { fetch(input: string, init: { method: string; body: string }): Promise<Response> } };
}

export async function scheduleReminder(env: ReminderEnv | undefined, chatId: number, at: number, text: string): Promise<void> {
  if (!env?.CHAT_DO) return;
  try {
    const stub = env.CHAT_DO.get(env.CHAT_DO.idFromName(`chat:${chatId}`));
    await stub.fetch("https://do/remind", { method: "POST", body: JSON.stringify({ at, chatId, text }) });
  } catch {
    // Scheduling is best-effort; task creation remains durable even if an alarm cannot be armed.
  }
}
