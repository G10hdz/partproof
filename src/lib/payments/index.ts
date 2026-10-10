import type { PaymentProvider } from '../types';

export function getProvider(): PaymentProvider {
  throw new Error('not implemented: A3');
}

export function getProviderMode(): 'mock' | 'reap' {
  throw new Error('not implemented: A3');
}
