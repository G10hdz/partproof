import { timingSafeEqual } from 'node:crypto';
import { server } from '@/server/api';

export const runtime = 'nodejs';

// Disparador para un cron externo. Sin CRON_SECRET definido responde siempre 401: nunca queda abierto.
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response(null, { status: 401 });
  const ran = await server.runDueSchedules();
  return Response.json({ ran: ran.length });
}
