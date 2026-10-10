// Las rutas /api/demo/* solo existen con DEMO_MODE=1; fuera de él responden 404 como si no estuvieran.
export function assertDemoMode(): Response | null {
  return process.env.DEMO_MODE === '1' ? null : new Response(null, { status: 404 });
}
