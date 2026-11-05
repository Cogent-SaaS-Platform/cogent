import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { HorizonSynthesisEngine } from '@/modules/radar/services/horizonSynthesisEngine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying radar_circulars in database...');

  const { data: circulars, error } = await (supabase as any)
    .from('radar_circulars')
    .select('id, circular_number, subject, doc_type, alert_type, synthesis_status')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to query circulars:', error);
    process.exit(1);
  }

  console.log(`Found ${circulars?.length || 0} total circulars in radar_circulars.\n`);

  for (const c of circulars || []) {
    console.log(`[ALERT] ${c.circular_number}: "${c.subject?.slice(0, 50)}..."`);
    console.log(`  Doc Type: ${c.doc_type || 'N/A'} | Alert Type: ${c.alert_type || 'N/A'} | Synthesis: ${c.synthesis_status || 'PENDING'}`);

    if (c.synthesis_status !== 'SYNTHESIZED') {
      console.log(`  --> Executing authentic Horizon Synthesis for ${c.id}...`);
      try {
        const result = await HorizonSynthesisEngine.synthesizeAlert({
          circularId: c.id,
          dbClient: supabase,
          forceResynthesize: true,
        });
        console.log(`  --> [SUCCESS] Synthesized! DocType: ${result.docType}, AlertType: ${result.alertType}, Severity: ${result.severityMatrix?.tier} | ${result.severityMatrix?.score}%`);
      } catch (err: any) {
        console.error(`  --> [ERROR] Synthesis failed:`, err.message || err);
      }
    } else {
      console.log(`  --> Already synthesized, skipping.`);
    }
    console.log('');
  }

  console.log('All circulars processed.');
}

main().catch(console.error);
