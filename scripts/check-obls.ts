import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
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
      process.env[key] = val;
    }
  }
}

import { createAdminClient } from '../src/shared/db';

async function main() {
  const db = createAdminClient();
  const { data: obls } = await db.from('regulatory_obligations').select('id, code, title, assessment_criteria').limit(5);
  console.log('Sample obligations from DB:');
  console.log(JSON.stringify(obls, null, 2));

  // Also check the specific evaluation items for 7cd94581-4d47-4b65-bea4-02c63612e291
  const { data: items } = await db.from('gap_matrix_items').select('id, regulatory_clause_id, obligation_id, what_happened, what_to_know, statutory_penalty_naira, compliance_status').eq('evaluation_id', '7cd94581-4d47-4b65-bea4-02c63612e291');
  console.log('Items for evaluation 7cd94581-4d47-4b65-bea4-02c63612e291:');
  console.log(JSON.stringify(items?.slice(0, 2), null, 2));
}

main().catch(console.error);
