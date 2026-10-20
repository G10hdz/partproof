// Los datos semilla son de ejemplo y deben seguir siéndolo: dominio .example
// y teléfonos reservados o imposibles, nunca números que puedan existir.
import { describe, expect, it } from 'vitest';
import { createFakeServer } from './fake-server';
import { seedCompany, seedSites } from './seed';

// NANP reserva 555-01XX para ficción; fuera de ahí, ceros tras la clave.
const EXAMPLE_PHONE = /^\+1\d{3}55501\d{2}$|^\+52\d{2}0{8}$/;
const EXAMPLE_EMAIL = /^[^@]+@forja3d\.example$/;

describe('datos semilla de ejemplo', () => {
  it('seed usa correo .example y teléfonos imposibles', async () => {
    expect(seedCompany().billing_email).toMatch(EXAMPLE_EMAIL);
    for (const site of seedSites()) {
      expect(site.shipping_address.phone).toMatch(EXAMPLE_PHONE);
    }
  });

  it('el servidor en memoria usa los mismos valores de ejemplo', async () => {
    const server = createFakeServer();
    expect((await server.getCompany()).billing_email).toMatch(EXAMPLE_EMAIL);
    for (const site of await server.listSites()) {
      expect(site.shipping_address.phone).toMatch(EXAMPLE_PHONE);
    }
  });
});
