import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => vi.unstubAllEnvs());
const call = (auth?: string) =>
  POST(new Request('http://x/api/cron/schedules', { method: 'POST', headers: auth ? { authorization: auth } : {} }));

describe('POST /api/cron/schedules', () => {
  it('sin CRON_SECRET siempre responde 401, incluso con cabecera', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer ')).status).toBe(401);
  });
  it('rechaza un secreto incorrecto', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret');
    expect((await call('Bearer otro')).status).toBe(401);
    expect((await call()).status).toBe(401);
  });
  it('con el secreto correcto ejecuta y responde cuántas corrió', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret');
    const res = await call('Bearer s3cret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ran: 0 });
  });
});
