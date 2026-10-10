import type { VisionResult } from '../types';

export async function analyzeImage(bytes: Buffer, mediaType: string): Promise<VisionResult> {
  throw new Error('not implemented: A4');
}

export function getVisionMode(): 'live' | 'replay' {
  throw new Error('not implemented: A4');
}
