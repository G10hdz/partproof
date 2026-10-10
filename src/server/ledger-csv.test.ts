import { describe, expect, it } from 'vitest';
import { ledgerCsv } from './ledger-csv';

describe('ledgerCsv', () => {
  it('escapa comillas y neutraliza fórmulas', () => {
    const csv = ledgerCsv({
      currency: 'MXN', monthly_total: 420.42, monthly_budget: 6000, cost_per_hour: [],
      rows: [{
        proposal_id: 'p1', machine_id: 'P1', site_id: 'tor', part_type: 'accelerometer_cable',
        product_title: '=HYPERLINK("x") "cable"', order_id: '+ord', provider: 'reap',
        amount: { amount: 32.34, currency: 'CAD' }, amount_company: 420.42, created_at: '2026-10-10T03:00:00Z',
      }],
    });
    const [header, row] = csv.replace('\uFEFF', '').trim().split('\r\n');
    expect(header).toContain('"monto_MXN"');
    expect(row).toContain(`"'=HYPERLINK(""x"") ""cable"""`);
    expect(row).toContain(`"'+ord"`);
    expect(row).toContain('"420.42"');
  });
});
