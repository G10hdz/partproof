import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { server } from '@/server/api';
import { MAX_PHOTO_BYTES, mediaTypeOf, uploadsDir } from '@/server/vision';

export const runtime = 'nodejs';

// Sube la foto de evidencia que toma el técnico. Devuelve un id generado por el servidor;
// el nombre del archivo del cliente nunca se usa como ruta.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('photo');
  const machineId = form?.get('machine_id');
  if (!(file instanceof File) || typeof machineId !== 'string') {
    return Response.json({ error: 'Faltan la foto o la máquina' }, { status: 400 });
  }
  if (!(await server.listMachines()).some((m) => m.id === machineId)) {
    return Response.json({ error: 'Máquina desconocida' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return Response.json({ error: 'La foto debe pesar entre 1 byte y 5 MB' }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  let ext: string;
  try {
    ext = mediaTypeOf(bytes) === 'image/png' ? 'png' : 'jpg';
  } catch {
    return Response.json({ error: 'Solo JPEG o PNG' }, { status: 400 });
  }
  const photoId = `cap_${machineId.toLowerCase()}_${randomUUID().slice(0, 8)}`;
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${photoId}.${ext}`), bytes);
  return Response.json({ photo_id: photoId }, { status: 201 });
}
