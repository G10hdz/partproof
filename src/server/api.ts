// Punto único de entrada del frontend al backend. BACKEND=real usa SQLite, gate, visión y Reap;
// sin esa variable responde el servidor en memoria, para construir la UI sin red.
import type { PartProofServer } from '@/contracts';
import { createBackend } from './backend';
import { createFakeServer } from './fake-server';

const globalForServer = globalThis as unknown as { partproofServer?: PartProofServer };

export const server: PartProofServer =
  globalForServer.partproofServer ?? (process.env.BACKEND === 'real' ? createBackend() : createFakeServer());
globalForServer.partproofServer = server;
