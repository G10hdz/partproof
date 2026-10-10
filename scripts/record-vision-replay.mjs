// Graba demo/vision-replay.json con una llamada live por foto de demo/photos.
// Uso: VISION_MODE=live ANTHROPIC_MODEL=... ANTHROPIC_API_KEY=... node --experimental-strip-types scripts/record-vision-replay.mjs
const { createVision, visionFromEnv } = await import('../src/server/vision.ts');

const deps = visionFromEnv();
if (deps.mode !== 'live') throw new Error('VISION_MODE=live es obligatorio para grabar');
const ids = await createVision(deps).recordReplay();
console.log(`grabadas ${ids.length} fotos: ${ids.join(', ')}`);
