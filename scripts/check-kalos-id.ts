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

async function checkById() {
  const { data, error } = await supabase
    .from('policy_documents')
    .select('*')
    .eq('id', 'dff8363e-379f-493c-a351-a21af4f0a345')
    .maybeSingle();

  if (error) {
    console.error('Error:', error);
    return;
  }
  if (!data) {
    console.log('Record not found by ID');
    return;
  }

  console.log('Found Kalos:');
  console.log('Title:', data.title);
  console.log('Storage path:', data.storage_path);
  console.log('Raw text length:', data.raw_text?.length);

  // If storage path exists, check if storage bucket has it
  if (data.storage_path) {
    const { data: fileData, error: fileErr } = await supabase.storage.from('policies').download(data.storage_path);
    if (fileErr) {
      console.log('Storage download error:', fileErr.message);
    } else if (fileData) {
      const buf = Buffer.from(await fileData.arrayBuffer());
      console.log('Downloaded from storage buffer size:', buf.length);
      const { extractText } = await import('unpdf');
      const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      const { text } = await extractText(uint8);
      const parsed = Array.isArray(text) ? text.join('\n\n') : (text || '');
      console.log('Extracted text from storage file length:', parsed.length);
      console.log('Preview:', parsed.slice(0, 300));
    }
  }
}

checkById().catch(console.error);
