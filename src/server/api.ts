// Punto único de entrada del frontend al backend. Hoy es la implementación en memoria;
// el backend real reemplaza esta línea sin cambiar la interfaz.
import type { PartProofServer } from '@/contracts';
import { createFakeServer } from './fake-server';

const globalForServer = globalThis as unknown as { partproofServer?: PartProofServer };

export const server: PartProofServer = globalForServer.partproofServer ?? createFakeServer();
globalForServer.partproofServer = server;
