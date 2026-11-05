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

async function testExtract() {
  const { data } = await supabase
    .from('policy_documents')
    .select('raw_text')
    .eq('id', 'dff8363e-379f-493c-a351-a21af4f0a345')
    .single();

  if (!data?.raw_text) return;

  const buf = Buffer.from(data.raw_text, 'binary');
  console.log('Buffer length:', buf.length);
  console.log('Starts with %PDF:', buf.toString('ascii', 0, 4) === '%PDF');

  try {
    const { extractText } = await import('unpdf');
    const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const { text } = await extractText(uint8);
    const parsed = Array.isArray(text) ? text.join('\n\n') : (text || '');
    console.log('unpdf success! Parsed length:', parsed.length);
    console.log('Parsed preview:\n', parsed.slice(0, 500));

    if (parsed.length > 100) {
      console.log('Updating Kalos policy with real extracted text!');
      const { error: upErr } = await supabase
        .from('policy_documents')
        .update({ raw_text: parsed })
        .eq('id', 'dff8363e-379f-493c-a351-a21af4f0a345');
      if (upErr) console.error('Update error:', upErr);
      else console.log('Successfully healed Kalos policy in DB!');
    }
  } catch (err: any) {
    console.error('unpdf failed:', err.message);
  }
}

testExtract().catch(console.error);
