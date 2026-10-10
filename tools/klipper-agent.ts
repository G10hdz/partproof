import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { MCP_PATH, MOONRAKER_PATH, REQUEST_PART_TOOL } from '../src/server/mcp-names';

interface MoonrakerState {
  machine_id: string;
  photo_id: string;
  stock: { part_type: string; qty: number; min_qty: number; hours_since_replace: number }[];
}

export async function runKlipperAgent(options = {
  baseUrl: process.env.PARTPROOF_URL ?? 'http://127.0.0.1:3000',
  machineId: process.env.MACHINE_ID ?? '',
  token: process.env.MCP_TOKEN ?? '',
}) {
  if (!options.machineId || !options.token) throw new Error('MACHINE_ID y MCP_TOKEN son obligatorios');
  const moonraker = await fetch(new URL(`${MOONRAKER_PATH}?machine_id=${encodeURIComponent(options.machineId)}`, options.baseUrl));
  if (!moonraker.ok) throw new Error('Moonraker no respondió para la máquina');
  const state = await moonraker.json() as MoonrakerState;
  const client = new Client({ name: 'partproof-klipper-agent', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_PATH, options.baseUrl), {
    requestInit: { headers: { authorization: `Bearer ${options.token}` } },
  }));
  try {
    return await Promise.all(state.stock.filter((part) => part.qty < part.min_qty).map((part) => client.callTool({
      name: REQUEST_PART_TOOL,
      arguments: {
        machine_id: state.machine_id,
        part_type: part.part_type,
        hours: part.hours_since_replace,
        photo_id: state.photo_id,
      },
    })));
  } finally {
    await client.close();
  }
}

if (process.argv[1]?.endsWith('klipper-agent.ts')) void runKlipperAgent();
