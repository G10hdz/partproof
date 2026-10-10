import { assertDemoMode } from '@/server/demo';
import { server } from '@/server/api';

export const runtime = 'nodejs';

export async function GET() {
  const off = assertDemoMode();
  if (off) return off;
  return Response.json(await server.getModes());
}
