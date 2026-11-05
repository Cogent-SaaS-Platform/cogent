import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function purgeJunkAlerts() {
  const junkSubjects = [
    'circular',
    'federal competition & consumer protection commission',
    'consumer rights & responsibilities',
    'civil society/consumer protection alliances',
    'data controllers/processors registration',
    'registered data controllers/data processors of major importance',
  ];

  console.log('Finding junk alerts...');
  const { data: circulars, error: fetchErr } = await supabase
    .from('radar_circulars')
    .select('id, circular_number, subject');

  if (fetchErr || !circulars) {
    console.error('Failed to fetch circulars:', fetchErr);
    process.exit(1);
  }

  const junkIds = circulars
    .filter((c) => junkSubjects.includes((c.subject || '').trim().toLowerCase()))
    .map((c) => c.id);

  console.log(`Found ${junkIds.length} junk records to delete.`);

  if (junkIds.length > 0) {
    // 1. Delete associated impacts
    const { error: impactErr } = await supabase
      .from('radar_tenant_impacts')
      .delete()
      .in('circular_id', junkIds);
    if (impactErr) console.warn('Impact delete error:', impactErr.message);

    // 2. Delete supersession links
    await supabase.from('circular_supersession_links').delete().in('parent_circular_id', junkIds);
    await supabase.from('circular_supersession_links').delete().in('child_circular_id', junkIds);

    // 3. Delete radar_circulars
    const { error: circErr } = await supabase
      .from('radar_circulars')
      .delete()
      .in('id', junkIds);
    if (circErr) {
      console.error('Failed to delete circulars:', circErr.message);
    } else {
      console.log(`Successfully purged ${junkIds.length} junk alerts.`);
    }
  }
}

purgeJunkAlerts().catch(console.error);
