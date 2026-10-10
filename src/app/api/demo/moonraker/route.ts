import { server } from '@/server/api';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (process.env.DEMO_MODE !== '1') return new Response(null, { status: 404 });
  const machineId = new URL(request.url).searchParams.get('machine_id');
  const machine = (await server.listMachines()).find((candidate) => candidate.id === machineId);
  if (!machine) return Response.json({ error: 'Máquina no encontrada' }, { status: 404 });
  const stock = (await server.listStock()).filter((item) => item.machine_id === machine.id);
  return Response.json({
    machine_id: machine.id,
    hours_total: machine.hours_total,
    photo_id: `plate_${machine.id.toLowerCase()}`,
    stock: stock.map(({ part_type, qty, min_qty, hours_since_replace }) => ({ part_type, qty, min_qty, hours_since_replace })),
  });
}
