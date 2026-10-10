import { describe, expect, it } from 'vitest';
import { createFakeServer } from './fake-server';

describe('fake server', () => {
  it('lleva P1 de proposed a paid y lo registra una vez en el libro', async () => {
    const s = createFakeServer();
    expect((await s.approveProposal('pr-p1')).checkout?.status).toBe('REQUIRES_ACTION');
    expect((await s.refreshProposal('pr-p1')).checkout?.status).toBe('PROCESSING');
    const paid = await s.refreshProposal('pr-p1');
    expect(paid.status).toBe('paid');
    expect(paid.checkout?.orderId).toBeTruthy();
    await s.refreshProposal('pr-p1');
    const ledger = await s.getLedger();
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.monthly_total).toBe(420.42);
  });

  it('no aprueba propuestas rechazadas por el gate', async () => {
    const s = createFakeServer();
    await expect(s.approveProposal('pr-p2')).rejects.toThrow();
    await expect(s.approveProposal('pr-p4')).rejects.toThrow();
  });

  it('resetDemo restaura el estado inicial', async () => {
    const s = createFakeServer();
    await s.approveProposal('pr-p1');
    await s.resetDemo();
    expect((await s.getProposal('pr-p1'))?.status).toBe('proposed');
  });
});
