// Alias explícitos de modelo de placa a su nombre corto de catálogo.
// Nunca por prefijo: MK3S y MK3S+ son modelos distintos.
const MODEL_ALIASES: Record<string, string> = {
  'Original Prusa MK4S': 'MK4S',
  'Original Prusa MK3S+': 'MK3S+',
  'Original Prusa MK3S': 'MK3S',
};

export function normalizeModel(model: string): string {
  const trimmed = model.trim();
  return MODEL_ALIASES[trimmed] ?? trimmed;
}
