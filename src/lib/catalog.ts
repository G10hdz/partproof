import raw from '@/data/catalog.json';
import type { CatalogItem, PartType } from './types';

export const catalog = raw as CatalogItem[];
export const findByPart = (p: PartType) => catalog.filter((c) => c.partType === p);
export const getItem = (id: string) => catalog.find((c) => c.id === id) ?? null;
