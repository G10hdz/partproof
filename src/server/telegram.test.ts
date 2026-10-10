import { describe, expect, it, vi } from 'vitest';
import type { ProposalView } from '@/contracts';
import { handleUpdate, proposalMessage } from './telegram';

const cad = (amount: number) => ({ amount, currency: 'CAD' });
const base: ProposalView = {
  id: 'p1', machine_id: 'P1', site_id: 'tor', part_type: 'accelerometer_cable', status: 'proposed',
  product: null, quote: null, quote_amount_company: null, checkout: null, provider: 'reap',
  verification: { passed: false, phase_reached: 'A', checks: [] }, reason: null,
  hours_since_replace: 10, photo_id: 'plate_p1', created_at: '2026-10-10T00:00:00Z',
};
const passed: ProposalView = {
  ...base, quote_amount_company: 420.42,
  product: { product_ref: 'cable', merchant: 'digitmakers.ca', title: 'Cable', variant_id: '67588566679782', price: 21.99, currency: 'CAD', part_type: 'accelerometer_cable', compat_models: [], compat_hotends: [], ships_to: ['CA'], lead_time_days: 5 },
  verification: { passed: true, phase_reached: 'B', checks: [] },
  quote: { id: 'q', checkoutUrl: '', merchantDomain: 'digitmakers.ca', itemsSubtotal: cad(21.99), shipping: cad(6.63), tax: cad(3.72), finalAmount: cad(32.34), expiresAt: '' },
} as ProposalView;

describe('telegram', () => {
  it('ofrece aprobar solo cuando el gate pasó', () => {
    expect(proposalMessage(passed).buttons[0].map((b) => b.callback_data?.split(':').slice(0, 2).join(':'))).toEqual(['approve:p1', 'reject:p1']);
    const rejected = proposalMessage({ ...base, status: 'rejected', reason: 'la placa dice MK3S' });
    expect(rejected.text).toContain('Rechazada: la placa dice MK3S');
    expect(rejected.buttons.flat().some((b) => b.callback_data)).toBe(false);
  });

  it('ignora botones que llegan de otro chat', async () => {
    const server = { approveProposal: vi.fn(async () => passed), rejectProposal: vi.fn(), getProposal: vi.fn(async () => passed) };
    const data = proposalMessage(passed).buttons[0][0].callback_data;
    const fetchImpl = vi.fn(async () => new Response('{}')) as unknown as typeof fetch;
    const env = { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '111' };
    await handleUpdate({ callback_query: { id: 'c', data, message: { chat: { id: 999 } } } }, server, env, fetchImpl);
    expect(server.approveProposal).not.toHaveBeenCalled();
    await handleUpdate({ callback_query: { id: 'c', data, message: { chat: { id: 111 } } } }, server, env, fetchImpl);
    expect(server.approveProposal).toHaveBeenCalledWith('p1', expect.any(String));
  });

  it('no aprueba si el quote cambió desde el aviso', async () => {
    const server = { approveProposal: vi.fn(), rejectProposal: vi.fn(), getProposal: vi.fn(async () => ({ ...passed, quote: { ...passed.quote!, id: 'q2' } })) };
    const fetchImpl = vi.fn(async () => new Response('{}')) as unknown as typeof fetch;
    const data = proposalMessage(passed).buttons[0][0].callback_data;
    await handleUpdate({ callback_query: { id: 'c', data, message: { chat: { id: 111 } } } }, server, { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '111' }, fetchImpl);
    expect(server.approveProposal).not.toHaveBeenCalled();
  });
});
