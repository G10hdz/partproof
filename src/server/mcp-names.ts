// Nombres que cruzan la frontera entre el agente de Klipper y el servidor. Sin imports con alias:
// el agente se corre como script suelto y los importa de aquí.
export const REQUEST_PART_TOOL = 'request_part';
export const MCP_PATH = '/api/mcp';
export const MOONRAKER_PATH = '/api/demo/moonraker';
export const mcpTokenKey = (machineId: string) => `MCP_TOKEN_${machineId}`;
