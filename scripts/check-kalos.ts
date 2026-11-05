import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkKalos() {
  const { data: kalos } = await supabase
    .from('policy_documents')
    .select('*')
    .ilike('title', '%Kalos%')
    .maybeSingle();

  if (kalos) {
    console.log('Kalos record found:');
    console.log(`- ID: ${kalos.id}`);
    console.log(`- Title: ${kalos.title}`);
    console.log(`- Storage Path: ${kalos.storage_path}`);
    console.log(`- Raw text length: ${kalos.raw_text?.length}`);
    console.log(`- Raw text start: ${kalos.raw_text?.slice(0, 100)}`);

    // Let's check if the raw text is actually binary pdf data
    const isBinary = kalos.raw_text?.startsWith('%PDF');
    console.log(`- Starts with %PDF: ${isBinary}`);

    if (isBinary) {
      // Try to parse using unpdf
      try {
        const { extractText } = await import('unpdf');
        const buf = Buffer.from(kalos.raw_text, 'latin1');
        const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const { text } = await extractText(uint8);
        const parsed = Array.isArray(text) ? text.join('\n\n') : (text || '');
        console.log(`- unpdf parsed text length: ${parsed.length}`);
        console.log(`- unpdf parsed preview: ${parsed.slice(0, 300)}`);
      } catch (err: any) {
        console.error('unpdf error on raw_text latin1:', err.message);
      }
    }
  } else {
    console.log('Kalos policy not found');
  }
}

checkKalos().catch(console.error);
