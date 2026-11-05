import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('Resetting and seeding marketing tables...');

  // 1. Wipe legacy marketing data
  const { error: err1 } = await supabase.from('marketing_findings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wiped marketing_findings:', err1?.message || 'OK');

  const { error: err2 } = await supabase.from('marketing_scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wiped marketing_scans:', err2?.message || 'OK');

  const { error: err3 } = await supabase.from('tenant_claims_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wiped tenant_claims_ledger:', err3?.message || 'OK');

  const { error: errCampaigns } = await supabase.from('marketing_campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wiped marketing_campaigns:', errCampaigns?.message || 'OK');

  const { error: errClaims } = await supabase.from('extracted_promotional_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wiped extracted_promotional_claims:', errClaims?.message || 'OK');

  // 2. Fetch all organizations to seed rules
  const { data: orgs, error: orgsErr } = await supabase.from('organizations').select('id, name');
  if (orgsErr) {
    console.error('Failed to get orgs:', orgsErr);
    return;
  }
  console.log(`Found ${orgs?.length} organizations to seed marketing rules.`);

  // 3. Fetch ARCON and CBN instrument IDs
  const { data: arconInst } = await supabase.from('regulatory_instruments').select('id').eq('short_name', 'ARCON Code 2022').maybeSingle();
  const { data: cbnInst } = await supabase.from('regulatory_instruments').select('id').eq('short_name', 'CBN CPF 2019').maybeSingle();
  const { data: secInst } = await supabase.from('regulatory_instruments').select('id').ilike('short_name', '%SEC%').maybeSingle();
  const { data: fccpcInst } = await supabase.from('regulatory_instruments').select('id').ilike('short_name', '%FCCPC%').maybeSingle();

  // Wipe old rules
  await supabase.from('marketing_knowledge_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const standardRules = [
    {
      rule_code: 'ARCON-2022-ART24-GUARANTEE',
      title: 'Prohibition of Guaranteed Credit or Unconditional Loan Approval',
      regulator_code: 'ARCON',
      regulation_id: arconInst?.id || null,
      statutory_citation: 'ARCON Code 2022 Article 24(1)(b) & Section 54',
      verbatim_clause: 'No advertisement for financial services shall represent or imply that credit approval or loan disbursement is guaranteed without regard to customer eligibility or statutory underwriting standards.',
      prohibited_terms: ['guaranteed approval', '100% approval', 'instant guaranteed loan', 'no credit check', 'no bvn'],
      mandatory_disclosures: ['Subject to credit assessment and underwriting approval', 'Terms and conditions apply'],
      applies_to_categories: ['DIGITAL_NANO_LOAN', 'GENERAL_BRAND'],
      applies_to_channels: ['SMS_BLAST', 'SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'OUTDOOR_BILLBOARD'],
      is_custom: false,
    },
    {
      rule_code: 'CBN-CPF-2019-APR-COST',
      title: 'Mandatory APR and Total Cost of Credit Disclosure',
      regulator_code: 'CBN',
      regulation_id: cbnInst?.id || null,
      statutory_citation: 'CBN Consumer Protection Framework 2019 Section 5.2.1',
      verbatim_clause: 'Financial service providers must disclose the Annual Percentage Rate (APR), total cost of credit, all applicable fees, and tenure in all credit promotions and advertisements across all channels.',
      prohibited_terms: ['zero interest', '0% interest', 'free loan', 'no hidden fees guaranteed'],
      mandatory_disclosures: ['Annual Percentage Rate (APR)', 'Applicable monthly interest rate', 'Processing fees disclosure'],
      applies_to_categories: ['DIGITAL_NANO_LOAN'],
      applies_to_channels: ['SMS_BLAST', 'SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'EMAIL_NEWSLETTER'],
      is_custom: false,
    },
    {
      rule_code: 'SEC-RULE-322-INVESTMENT-PROMOTIONS',
      title: 'Prohibition of Guaranteed High-Yield Returns in Wealth Advertisements',
      regulator_code: 'SEC',
      regulation_id: secInst?.id || null,
      statutory_citation: 'SEC Consolidated Rules 2013 Rule 322 & ISA 2007 Section 67',
      verbatim_clause: 'Advertisements offering securities, collective investment schemes, or portfolio management shall not state or imply guaranteed capital preservation or risk-free returns. Past performance must include statutory risk warnings.',
      prohibited_terms: ['risk-free return', 'guaranteed return', 'guaranteed annual yield', 'capital 100% safe', 'backed by government'],
      mandatory_disclosures: ['Capital is at risk', 'Past performance is not indicative of future returns', 'Registered with SEC as a Fund/Portfolio Manager'],
      applies_to_categories: ['WEALTHTECH_INVEST'],
      applies_to_channels: ['SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'EMAIL_NEWSLETTER', 'OUTDOOR_BILLBOARD'],
      is_custom: false,
    },
    {
      rule_code: 'NDIC-ACT-2023-DEPOSIT-ADVERTISING',
      title: 'Mandatory Deposit Insurance Corporation Coverage Disclosures',
      regulator_code: 'NDIC',
      regulation_id: cbnInst?.id || null,
      statutory_citation: 'NDIC Act 2023 Section 21 & BOFIA 2020 Section 65',
      verbatim_clause: 'Institutions accepting public deposits must explicitly disclose their regulatory license and state that eligible deposits are insured by the Nigeria Deposit Insurance Corporation (NDIC) up to statutory limits.',
      prohibited_terms: ['unlimited insurance', '100% government guaranteed deposit', 'risk-free savings'],
      mandatory_disclosures: ['Insured by NDIC up to statutory limits', 'Licensed by the Central Bank of Nigeria (CBN)'],
      applies_to_categories: ['SAVINGS_DEPOSIT'],
      applies_to_channels: ['SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'SMS_BLAST', 'EMAIL_NEWSLETTER'],
      is_custom: false,
    },
    {
      rule_code: 'FCCPC-2022-DIGITAL-LENDING',
      title: 'FCCPC Transparent Lending Licensing & Anti-Deception Mandate',
      regulator_code: 'FCCPC',
      regulation_id: fccpcInst?.id || null,
      statutory_citation: 'FCCPC Limited Interim Regulatory Framework for Digital Lending 2022 Section 3',
      verbatim_clause: 'Digital money lenders must clearly disclose their FCCPC registration status, corporate legal entity name, and exact statutory repayment terms. Misleading claims of instantaneous approval without evaluation are prohibited.',
      prohibited_terms: ['no bvn required', 'instant loan no verification', 'guaranteed cash in 1 minute'],
      mandatory_disclosures: ['Registered with FCCPC', 'Subject to creditworthiness evaluation'],
      applies_to_categories: ['DIGITAL_NANO_LOAN'],
      applies_to_channels: ['SMS_BLAST', 'SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE'],
      is_custom: false,
    },
  ];

  for (const org of orgs || []) {
    const records = standardRules.map((r) => ({
      ...r,
      organization_id: org.id,
    }));
    const { error: insErr } = await supabase.from('marketing_knowledge_rules').insert(records);
    if (insErr) {
      console.error(`Failed to seed rules for org ${org.name}:`, insErr);
    } else {
      console.log(`Seeded ${records.length} marketing knowledge rules for org ${org.name} (${org.id})`);
    }
  }

  console.log('Hard database reset & rule seeding completed successfully.');
}

main().catch(console.error);
