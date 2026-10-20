import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminClient } from '../src/shared/db';

async function main() {
  console.log('Testing User Profile & Role Persistence in Supabase...');
  const db = createAdminClient();

  // 1. Fetch Samuel James profile
  const { data: users, error: userErr } = await db
    .from('users')
    .select('id, email, full_name, job_title, department')
    .eq('email', 'scapu329@gmail.com');

  if (userErr || !users || users.length === 0) {
    console.error('Failed to find user:', userErr);
    process.exit(1);
  }

  const user = users[0];
  console.log('User Record:', user);
  if (user.job_title !== 'CSO') {
    throw new Error(`Expected job_title to be 'CSO', got: ${user.job_title}`);
  }

  // 2. Fetch Organization Membership
  const { data: memberships, error: memErr } = await db
    .from('organization_memberships')
    .select('role, department, job_title')
    .eq('user_id', user.id);

  if (memErr || !memberships || memberships.length === 0) {
    console.error('Failed to find membership:', memErr);
    process.exit(1);
  }

  console.log('Membership Record:', memberships[0]);
  if (memberships[0].job_title !== 'CSO') {
    throw new Error(`Expected membership job_title to be 'CSO', got: ${memberships[0].job_title}`);
  }

  console.log('✓ SUCCESS: User profile and role persistence verified cleanly in Supabase!');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
