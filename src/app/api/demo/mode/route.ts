import { server } from '@/server/api';

export const runtime = 'nodejs';

export async function GET() {
  if (process.env.DEMO_MODE !== '1') return new Response(null, { status: 404 });
  return Response.json(await server.getModes());
}
