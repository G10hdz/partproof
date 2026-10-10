import * as z from 'zod/v4';
import { server } from '@/server/api';

export const runtime = 'nodejs';

const input = z.object({ machine_id: z.enum(['P1', 'P2', 'P3', 'P4']), hours: z.number().finite().nonnegative() }).strict();

export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== '1') return new Response(null, { status: 404 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Entrada inválida' }, { status: 400 });
  await server.advanceHours(parsed.data.machine_id, parsed.data.hours);
  return Response.json({ ok: true });
}
