import { server } from '@/server/api';

export const runtime = 'nodejs';

export async function POST() {
  if (process.env.DEMO_MODE !== '1') return new Response(null, { status: 404 });
  await server.resetDemo();
  return Response.json({ ok: true });
}
