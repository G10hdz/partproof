import { server } from '@/server/api';
import { handleUpdate } from '@/server/telegram';

export const runtime = 'nodejs';

// Webhook del bot. Telegram manda el secreto configurado en setWebhook; sin él la ruta no existe.
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response(null, { status: 404 });
  }
  const update = await request.json().catch(() => null);
  if (update) await handleUpdate(update, server).catch(() => {});
  return Response.json({ ok: true });
}
