import path from 'node:path';
import { readPhoto, uploadsDir } from '@/server/vision';

export const runtime = 'nodejs';

// Sirve la foto de evidencia de una propuesta. Solo ids de archivos que ya existen en demo/photos.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { bytes, mediaType } = await readPhoto([path.join(process.cwd(), 'demo', 'photos'), uploadsDir()], id);
    return new Response(new Uint8Array(bytes), { headers: { 'content-type': mediaType, 'cache-control': 'private, max-age=300' } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
