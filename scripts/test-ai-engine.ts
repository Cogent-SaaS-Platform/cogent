import fs from 'fs';
import path from 'path';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnvLocal();
for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

async function testGemini() {
  const { AiEngine } = await import('../src/shared/ai-engine');
  const { z } = await import('zod');
  const engine = new AiEngine();
  console.log('Testing AiEngine structured generation...');
  const res = await engine.generateStructured({
    prompt: 'Evaluate: "Customer complaints must be resolved in 14 days" vs requirement "All complaints must be logged within 24 hours". Return status MET or NOT_MET and reason.',
    schema: z.object({
      status: z.enum(['MET', 'NOT_MET']),
      reason: z.string(),
    }),
  });
  console.log('Result:', JSON.stringify(res.data, null, 2));
}

testGemini().catch(console.error);
