import { describe, expect, it } from 'vitest';
import { ledgerCsv } from './ledger-csv';

const base = {
  currency: 'MXN', monthly_total: 420.42, monthly_confirmed: 420.42, monthly_committed: 0, monthly_budget: 6000, cost_per_hour: [],
};

describe('ledgerCsv', () => {
  it('escapa comillas y neutraliza fórmulas', () => {
    const csv = ledgerCsv({
      ...base,
      rows: [{
        proposal_id: 'p1', machine_id: 'P1', site_id: 'tor', part_type: 'accelerometer_cable',
        product_title: '=HYPERLINK("x") "cable"', order_id: '+ord', provider: 'reap',
        amount: { amount: 32.34, currency: 'CAD' }, amount_company: 420.42, created_at: '2026-10-10T03:00:00Z',
      }],
    }, { tor: 'Planta Toronto' });
    const [header, row] = csv.replace('﻿', '').trim().split('\r\n');
    expect(header).toContain('"monto_MXN"');
    expect(row).toContain('"Planta Toronto"');
    expect(row).not.toContain('"tor"');
    expect(row).toContain(`"'=HYPERLINK(""x"") ""cable"""`);
    expect(row).toContain(`"'+ord"`);
    expect(row).toContain('"420.42"');
  });

  it('deja el id de planta si no hay nombre', () => {
    const csv = ledgerCsv({
      ...base,
      rows: [{
        proposal_id: 'p1', machine_id: 'P1', site_id: 'gdl', part_type: 'nozzle',
        product_title: 'x', order_id: 'o', provider: 'mock',
        amount: { amount: 1, currency: 'MXN' }, amount_company: 1, created_at: '2026-10-10T03:00:00Z',
      }],
    }, {});
    expect(csv).toContain('"gdl"');
  });
});
