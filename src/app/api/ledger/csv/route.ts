import { server } from '@/server/api';
import { ledgerCsv } from '@/server/ledger-csv';

export const runtime = 'nodejs';

export async function GET() {
  return new Response(ledgerCsv(await server.getLedger()), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="partproof-libro.csv"' },
  });
}
