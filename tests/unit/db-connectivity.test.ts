import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(import.meta.dirname, '../../.env.local');
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

describe('Live Supabase Connectivity & Schema Validation', () => {
  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

  it(
    'connects to Supabase and queries regulatory_bodies',
    async () => {
      expect(supabaseUrl).toBeDefined();
      expect(serviceRoleKey).toBeDefined();

      if (supabaseUrl?.includes('ci-test.supabase.co') || process.env.CI === 'true') {
        expect(supabaseUrl).toBeDefined();
        return;
      }

      const client = createClient(supabaseUrl!, serviceRoleKey!, {
        auth: { persistSession: false },
      });

      const { data, error } = await client
        .from('regulatory_bodies')
        .select('*')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    },
    120000
  );
});
