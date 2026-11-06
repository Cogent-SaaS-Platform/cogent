import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateObligationCriteria, sanitizeSectionHeading } from '../src/modules/regulatory/utils/statutoryUtils';

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
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function healObligations() {
  console.log('Querying obligations with title = "null" or null or holding hardcoded template criteria...');
  const { data: obls } = await supabase
    .from('regulatory_obligations')
    .select(`
      id,
      code,
      title,
      summary,
      obligation_type,
      verbatim_quote,
      assessment_criteria,
      regulatory_clauses (
        section_reference,
        section_heading,
        clause_text,
        regulatory_document_versions (
          regulatory_instruments (
            title,
            short_name,
            regulatory_bodies ( code )
          )
        )
      )
    `);

  console.log(`Found ${obls?.length} obligations to examine for title, code, and genuine criteria.`);

  let healedCount = 0;
  for (let i = 0; i < (obls || []).length; i++) {
    const obl = obls![i];
    const clause = obl.regulatory_clauses as any;
    const inst = clause?.regulatory_document_versions?.regulatory_instruments;
    const regBody = inst?.regulatory_bodies?.code || 'REG';

    const cleanSectionHeading = sanitizeSectionHeading(clause?.section_reference || 'Section 1.0', clause?.section_heading);

    // Derive a clean, readable, professional title from summary or clause heading
    let derivedTitle = obl.title;
    if (!derivedTitle || derivedTitle.toLowerCase() === 'null' || derivedTitle.toLowerCase() === 'directive') {
      if (cleanSectionHeading && !cleanSectionHeading.startsWith('Statutory Provisions')) {
        derivedTitle = cleanSectionHeading;
      } else if (obl.summary && obl.summary.length > 10) {
        const firstSent = obl.summary.split(/[.?!]/)[0].trim();
        derivedTitle = firstSent.length < 80 ? firstSent : `${firstSent.slice(0, 77)}...`;
      } else {
        derivedTitle = `Statutory Compliance Duty under ${clause?.section_reference || 'Regulation'}`;
      }
    }

    const derivedCode = obl.code || `OBL-${regBody}-${String(i + 1).padStart(3, '0')}`;

    // Check if criteria has the fake template or is empty
    const currentCriteria = Array.isArray(obl.assessment_criteria) ? obl.assessment_criteria : [];
    const hasFakeTemplate = currentCriteria.some((c: any) =>
      typeof c?.text === 'string' && (
        c.text.includes('Internal operating manual explicitly mandates compliance:') ||
        c.text.includes('Documented operational procedures and supervisory review checkpoints') ||
        c.text.includes('Retention and audit logging procedures are maintained across operational ledgers')
      )
    );

    let assessmentCriteria = currentCriteria;
    if (currentCriteria.length === 0 || hasFakeTemplate) {
      const generated = generateObligationCriteria({
        title: derivedTitle,
        summary: obl.summary,
        verbatimQuote: obl.verbatim_quote || clause?.clause_text,
        regulator: regBody,
        ruleType: obl.obligation_type,
      });

      assessmentCriteria = generated.map((c, idx) => ({
        id: `crit-${obl.id}-${idx + 1}`,
        type: c.type,
        text: c.text,
        evidenceRequired: c.evidenceRequired,
        isMandatory: c.isMandatory ?? true,
      }));
    }

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

  console.log(`Successfully healed ${healedCount} obligations in regulatory_obligations with genuine criteria!`);
}

healObligations().catch(console.error);
