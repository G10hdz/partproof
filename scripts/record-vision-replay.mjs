// Graba demo/vision-replay.json con una llamada live por foto de demo/photos.
// Uso con Anthropic:  VISION_MODE=live ANTHROPIC_MODEL=... ANTHROPIC_API_KEY=... node --experimental-strip-types scripts/record-vision-replay.mjs
// Uso con OpenRouter: VISION_MODE=live VISION_PROVIDER=openrouter OPENROUTER_MODEL=google/gemini-3.8-flash OPENROUTER_API_KEY=... (mismo comando)
const { createVision, visionFromEnv } = await import('../src/server/vision.ts');

const deps = visionFromEnv();
if (deps.mode !== 'live') throw new Error('VISION_MODE=live es obligatorio para grabar');
const ids = await createVision(deps).recordReplay();
console.log(`grabadas ${ids.length} fotos: ${ids.join(', ')}`);
