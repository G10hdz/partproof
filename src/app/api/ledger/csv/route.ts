import { server } from '@/server/api';
import { ledgerCsv } from '@/server/ledger-csv';

export const runtime = 'nodejs';

export async function GET() {
  const [ledger, sites] = await Promise.all([server.getLedger(), server.listSites()]);
  const names = Object.fromEntries(sites.map((s) => [s.id, s.name]));
  return new Response(ledgerCsv(ledger, names), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="partproof-libro.csv"' },
  });
}
