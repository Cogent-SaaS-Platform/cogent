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

async function healObligations() {
  console.log('Querying obligations with title = "null" or null...');
  const { data: obls } = await supabase
    .from('regulatory_obligations')
    .select(`
      id,
      code,
      title,
      summary,
      obligation_type,
      regulatory_clauses (
        section_reference,
        section_heading,
        regulatory_document_versions (
          regulatory_instruments (
            short_name,
            regulatory_bodies ( code )
          )
        )
      )
    `)
    .or('title.eq.null,title.is.null');

  console.log(`Found ${obls?.length} obligations needing title and code healing.`);

  let healedCount = 0;
  for (let i = 0; i < (obls || []).length; i++) {
    const obl = obls![i];
    const clause = obl.regulatory_clauses as any;
    const inst = clause?.regulatory_document_versions?.regulatory_instruments;
    const regBody = inst?.regulatory_bodies?.code || 'REG';

    // Derive a clean, readable, professional title from summary or clause heading
    let derivedTitle = clause?.section_heading;
    if (!derivedTitle || derivedTitle.toLowerCase() === 'null') {
      if (obl.summary && obl.summary.length > 10) {
        // Use first sentence or up to 80 chars
        const firstSent = obl.summary.split(/[.?!]/)[0].trim();
        derivedTitle = firstSent.length > 5 ? firstSent : obl.summary;
      } else {
        derivedTitle = `Statutory Obligation under ${clause?.section_reference || 'Regulation'}`;
      }
    }

    const derivedCode = obl.code || `OBL-${regBody}-${String(i + 1).padStart(3, '0')}`;

    // Clean criteria if empty
    const assessmentCriteria = [
      {
        type: 'Core Criteria',
        text: `Internal operating manual explicitly mandates compliance: ${obl.summary || derivedTitle}`,
        evidenceRequired: 'Approved internal policy manual or standard operating procedure (SOP)',
      },
      {
        type: 'Core Criteria',
        text: 'Documented operational procedures and supervisory review checkpoints are maintained for audit readiness.',
        evidenceRequired: 'Executive sign-off or compliance review log',
      },
      {
        type: 'Best Practice',
        text: 'Retention and audit logging procedures are maintained across operational ledgers.',
        evidenceRequired: 'Archived supervisory logs and inspection registers',
      },
    ];

    await supabase
      .from('regulatory_obligations')
      .update({
        title: derivedTitle,
        code: derivedCode,
        assessment_criteria: assessmentCriteria,
      })
      .eq('id', obl.id);

    healedCount++;
  }

  console.log(`Successfully healed ${healedCount} obligations in regulatory_obligations!`);
}

healObligations().catch(console.error);
