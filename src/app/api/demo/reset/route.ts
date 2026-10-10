import { assertDemoMode } from '@/server/demo';
import { server } from '@/server/api';

export const runtime = 'nodejs';

export async function POST() {
  const off = assertDemoMode();
  if (off) return off;
  await server.resetDemo();
  return Response.json({ ok: true });
}
