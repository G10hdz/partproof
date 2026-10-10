// El agente de Klipper se corre como script suelto con Node, no dentro de Next ni de vitest.
// Este test lo arranca igual que en el demo y comprueba que llega a su propia validación.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

describe('tools/klipper-agent.ts', () => {
  it('arranca con node --experimental-strip-types y pide MACHINE_ID y MCP_TOKEN', () => {
    const run = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'tools/klipper-agent.ts'], {
      cwd: ROOT, env: { PATH: process.env.PATH ?? '', NODE_ENV: 'test' }, encoding: 'utf8', timeout: 20_000,
    });
    expect(run.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(run.stderr).toContain('MACHINE_ID y MCP_TOKEN son obligatorios');
    expect(run.status).not.toBe(0);
  });
});
