import { server } from '@/server/api';
import { createMcpHandler } from '@/server/mcp';

export const runtime = 'nodejs';

const handler = createMcpHandler({
  createProposal: (input) => server.createProposal(input),
  recordEvent: (event) => server.recordEvent(event),
});

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
