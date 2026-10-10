import { server } from '@/server/api';
import { callRequestPart, createMcpHandler } from '@/server/mcp';
import { mcpTokenKey } from '@/server/mcp-names';

export const runtime = 'nodejs';

// Envía por MCP una solicitud con una nota maliciosa de ejemplo; la nota queda en el registro y no llega al gate.
export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== '1') return new Response(null, { status: 404 });
  const body = await request.json().catch(() => null);
  const machineId = typeof body?.machine_id === 'string' ? body.machine_id : '';
  const token = process.env[mcpTokenKey(machineId)];
  if (!token) return Response.json({ error: 'Token de demo no configurado' }, { status: 503 });
  const handler = createMcpHandler({
    createProposal: (input) => server.createProposal(input),
    recordEvent: (event) => server.recordEvent(event),
  });
  const result = await callRequestPart(handler, token, body);
  return Response.json(result, { status: result.isError ? 400 : 200 });
}
