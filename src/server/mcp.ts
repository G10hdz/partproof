import { createHash, timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import * as z from 'zod/v4';
import { PART_TYPES, type EventView, type RequestPartInput, type RequestPartResult } from '@/contracts';
import { MCP_PATH, mcpTokenKey, REQUEST_PART_TOOL } from './mcp-names';
import { seedMachines } from './seed';

// Las máquinas que pueden autenticarse son las del seed: agregar una ahí la habilita aquí.
const machines = seedMachines().map((m) => m.id) as [string, ...string[]];

export const RequestPartInputSchema = z.object({
  machine_id: z.enum(machines),
  part_type: z.enum(PART_TYPES),
  hours: z.number().finite().nonnegative(),
  photo_id: z.string().trim().min(1),
  note: z.string().max(1000).optional(),
}).strict();

export interface McpDeps {
  createProposal(input: RequestPartInput): Promise<RequestPartResult>;
  recordEvent(event: Omit<EventView, 'id' | 'created_at'>): Promise<void>;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();

function authenticatedMachine(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length);
  if (!token) return null;

  const matched = machines.filter((machine) => {
    const configured = process.env[mcpTokenKey(machine)];
    if (!configured) return false;
    const suppliedHash = sha256(token);
    const configuredHash = sha256(configured);
    return timingSafeEqual(suppliedHash, configuredHash);
  });

  return matched.length === 1 ? matched[0] : null;
}

export function createMcpHandler(deps: McpDeps) {
  return async (request: Request): Promise<Response> => {
    const machine = authenticatedMachine(request);
    if (!machine) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    const server = new McpServer({ name: 'partproof-mcp', version: '1.0.0' });
    server.registerTool(REQUEST_PART_TOOL, {
      description: 'Solicita una propuesta de refacción para la máquina autenticada.',
      inputSchema: RequestPartInputSchema,
    }, async (input) => {
      if (input.machine_id !== machine) {
        return { isError: true, content: [{ type: 'text', text: 'La máquina autenticada no coincide con la solicitud.' }] };
      }

      try {
        const proposal = await deps.createProposal({
          machine_id: input.machine_id,
          part_type: input.part_type,
          hours_since_replace: input.hours,
          photo_id: input.photo_id,
        });
        await deps.recordEvent({
          machine_id: machine,
          source: 'klipper',
          payload: { tool: REQUEST_PART_TOOL, note: input.note ?? null, result: proposal.status },
        });
        return { content: [{ type: 'text', text: JSON.stringify(proposal) }] };
      } catch (err) {
        // La causa queda en el registro del operador; a la máquina solo le llega el error genérico.
        await deps.recordEvent({
          machine_id: machine,
          source: 'klipper',
          payload: { tool: REQUEST_PART_TOOL, note: input.note ?? null, result: 'error', detail: err instanceof Error ? err.message : 'error' },
        }).catch(() => undefined);
        return { isError: true, content: [{ type: 'text', text: 'No se pudo crear la propuesta.' }] };
      }
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  };
}

export type McpHandler = ReturnType<typeof createMcpHandler>;

// Llamada JSON-RPC a request_part dentro del proceso, con el token de la máquina: pasa por la misma
// autenticación y el mismo schema que una llamada externa. La usan la ruta de demo y el aviso de stock bajo.
export async function callRequestPart(handler: McpHandler, token: string, args: unknown): Promise<{ isError: boolean; text: string }> {
  const response = await handler(new Request(`http://127.0.0.1${MCP_PATH}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: REQUEST_PART_TOOL, arguments: args } }),
  }));
  const body = await response.json().catch(() => null) as
    | { result?: { isError?: boolean; content?: { text?: string }[] }; error?: { message?: string } }
    | null;
  if (!response.ok || !body?.result) return { isError: true, text: body?.error?.message ?? `MCP respondió ${response.status}` };
  return { isError: body.result.isError === true, text: body.result.content?.[0]?.text ?? '' };
}
