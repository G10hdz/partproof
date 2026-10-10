// Punto único de entrada del frontend al backend. BACKEND=real usa SQLite, gate, visión y Reap;
// sin esa variable responde el servidor en memoria, para construir la UI sin red.
// Se crea en la primera llamada, no al importar: next build evalúa las rutas sin abrir la base.
import type { PartProofServer } from '@/contracts';
import { createBackend } from './backend';
import { createFakeServer } from './fake-server';

const globalForServer = globalThis as unknown as { partproofServer?: PartProofServer };

function instance(): PartProofServer {
  globalForServer.partproofServer ??= process.env.BACKEND === 'real' ? createBackend() : createFakeServer();
  return globalForServer.partproofServer;
}

export const server: PartProofServer = new Proxy({} as PartProofServer, {
  get(_target, prop) {
    const target = instance();
    const value = Reflect.get(target, prop);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
