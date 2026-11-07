-- ==============================================================================
-- COGENT MIGRATION 20261102000002: MARKETING SHIELD PRODUCTION REBUILD
-- Ref Zango 04:53 Hub, Drata GPT Chat, and Aurora Live Canvas Architecture
-- ==============================================================================

-- 1. HARD DATABASE RESET: Wipe legacy mock scans, findings & fake claims
TRUNCATE TABLE marketing_findings CASCADE;
TRUNCATE TABLE marketing_scans CASCADE;
TRUNCATE TABLE tenant_claims_ledger CASCADE;

-- 2. CAMPAIGNS WORKSPACE TABLE
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_REVIEW', 'REVISION', 'APPROVED')),
  product_category VARCHAR(64) NOT NULL DEFAULT 'DIGITAL_NANO_LOAN',
  channel VARCHAR(64) NOT NULL DEFAULT 'SOCIAL_MEDIA_POST',
  canvas_content TEXT NOT NULL DEFAULT '',
  attached_asset_url TEXT,
  attached_asset_type VARCHAR(32), -- 'IMAGE', 'PDF', 'URL'
  created_by TEXT DEFAULT 'Authorized Marketer',
  assigned_reviewer TEXT DEFAULT 'Chief Compliance Officer',
  risk_summary TEXT,
  total_findings INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CAMPAIGN COPILOT CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS campaign_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
  content TEXT NOT NULL,
  structured_findings_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. EXTRACTED PROMOTIONAL CLAIMS REGISTRY
CREATE TABLE IF NOT EXISTS extracted_promotional_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  claim_text TEXT NOT NULL,
  verdict VARCHAR(32) NOT NULL DEFAULT 'COMPLIANT' CHECK (verdict IN ('COMPLIANT', 'WARNING', 'BLOCKING_ISSUE')),
  regulation_id UUID REFERENCES regulatory_instruments(id) ON DELETE SET NULL,
  statutory_citation TEXT NOT NULL,
  verbatim_rule TEXT NOT NULL,
  ai_rationale TEXT NOT NULL,
  suggested_rewrite TEXT,
  review_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. MARKETING KNOWLEDGE RULES TABLE (REGULATION LIBRARY & CUSTOM RULES)
CREATE TABLE IF NOT EXISTS marketing_knowledge_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_code VARCHAR(64) NOT NULL,
  title TEXT NOT NULL,
  regulator_code VARCHAR(32) NOT NULL,
  regulation_id UUID REFERENCES regulatory_instruments(id) ON DELETE SET NULL,
  statutory_citation TEXT NOT NULL,
  verbatim_clause TEXT NOT NULL,
  prohibited_terms TEXT[] DEFAULT '{}',
  mandatory_disclosures TEXT[] DEFAULT '{}',
  applies_to_categories TEXT[] DEFAULT '{}',
  applies_to_channels TEXT[] DEFAULT '{}',
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_org_status ON marketing_campaigns(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_chat_campaign ON campaign_chat_messages(campaign_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_mkt_claims_campaign ON extracted_promotional_claims(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mkt_claims_org ON extracted_promotional_claims(organization_id, review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_rules_org ON marketing_knowledge_rules(organization_id, regulator_code);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_promotional_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_knowledge_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS marketing_campaigns_tenant_policy ON marketing_campaigns;
  CREATE POLICY marketing_campaigns_tenant_policy ON marketing_campaigns
    FOR ALL TO authenticated
    USING (
      organization_id = (select public.current_org_id()) 
      OR organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = (select public.current_user_id())
      )
    )
    WITH CHECK (
      organization_id = (select public.current_org_id()) 
      OR organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = (select public.current_user_id())
      )
    );

  DROP POLICY IF EXISTS campaign_chat_tenant_policy ON campaign_chat_messages;
  CREATE POLICY campaign_chat_tenant_policy ON campaign_chat_messages
    FOR ALL TO authenticated
    USING (
      campaign_id IN (
        SELECT id FROM marketing_campaigns 
        WHERE organization_id = (select public.current_org_id()) 
           OR organization_id IN (
             SELECT organization_id FROM organization_memberships 
             WHERE user_id = (select public.current_user_id())
           )
      )
    )
    WITH CHECK (
      campaign_id IN (
        SELECT id FROM marketing_campaigns 
        WHERE organization_id = (select public.current_org_id()) 
           OR organization_id IN (
             SELECT organization_id FROM organization_memberships 
             WHERE user_id = (select public.current_user_id())
           )
      )
    );

  DROP POLICY IF EXISTS extracted_claims_tenant_policy ON extracted_promotional_claims;
  CREATE POLICY extracted_claims_tenant_policy ON extracted_promotional_claims
    FOR ALL TO authenticated
    USING (
      organization_id = (select public.current_org_id()) 
      OR organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = (select public.current_user_id())
      )
    )
    WITH CHECK (
      organization_id = (select public.current_org_id()) 
      OR organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = (select public.current_user_id())
      )
    );

  DROP POLICY IF EXISTS marketing_rules_tenant_policy ON marketing_knowledge_rules;
  CREATE POLICY marketing_rules_tenant_policy ON marketing_knowledge_rules
    FOR ALL TO authenticated
    USING (
      is_custom = false
      OR organization_id = (select public.current_org_id()) 
      OR organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = (select public.current_user_id())
      )
    )
    WITH CHECK (
      organization_id = (select public.current_org_id()) 
      OR organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = (select public.current_user_id())
      )
    );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 8. SEED STATUTORY KNOWLEDGE RULES FOR NIGERIAN FINANCIAL INSTITUTIONS
INSERT INTO marketing_knowledge_rules (
  organization_id,
  rule_code,
  title,
  regulator_code,
  regulation_id,
  statutory_citation,
  verbatim_clause,
  prohibited_terms,
  mandatory_disclosures,
  applies_to_categories,
  applies_to_channels,
  is_custom
)
SELECT 
  o.id,
  'ARCON-2022-SEC54-GUARANTEE',
  'Prohibition of Guaranteed Credit or Unconditional Loan Approval',
  'ARCON',
  (SELECT id FROM regulatory_instruments WHERE short_name = 'ARCON Code 2022' LIMIT 1),
  'ARCON Act 2022 Section 54 & ASP Vetting Standards',
  'No advertisement for financial services shall represent or imply that credit approval or loan disbursement is guaranteed without regard to customer eligibility or statutory underwriting standards.',
  ARRAY['guaranteed approval', '100% approval', 'instant guaranteed loan', 'no credit check', 'no bvn'],
  ARRAY['Subject to credit assessment and underwriting approval', 'Terms and conditions apply'],
  ARRAY['DIGITAL_NANO_LOAN', 'GENERAL_BRAND'],
  ARRAY['SMS_BLAST', 'SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'OUTDOOR_BILLBOARD'],
  false
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO marketing_knowledge_rules (
  organization_id,
  rule_code,
  title,
  regulator_code,
  regulation_id,
  statutory_citation,
  verbatim_clause,
  prohibited_terms,
  mandatory_disclosures,
  applies_to_categories,
  applies_to_channels,
  is_custom
)
SELECT 
  o.id,
  'CBN-CPF-2019-APR-COST',
  'Mandatory APR and Total Cost of Credit Disclosure',
  'CBN',
  (SELECT id FROM regulatory_instruments WHERE short_name = 'CBN CPF 2019' LIMIT 1),
  'CBN Consumer Protection Framework 2019 Section 5.2.1',
  'Financial service providers must disclose the Annual Percentage Rate (APR), total cost of credit, all applicable fees, and tenure in all credit promotions and advertisements across all channels.',
  ARRAY['zero interest', '0% interest', 'free loan', 'no hidden fees guaranteed'],
  ARRAY['Annual Percentage Rate (APR)', 'Applicable monthly interest rate', 'Processing fees disclosure'],
  ARRAY['DIGITAL_NANO_LOAN'],
  ARRAY['SMS_BLAST', 'SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'EMAIL_NEWSLETTER'],
  false
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO marketing_knowledge_rules (
  organization_id,
  rule_code,
  title,
  regulator_code,
  regulation_id,
  statutory_citation,
  verbatim_clause,
  prohibited_terms,
  mandatory_disclosures,
  applies_to_categories,
  applies_to_channels,
  is_custom
)
SELECT 
  o.id,
  'SEC-RULE-39B-INVESTMENT-PROMOTIONS',
  'Prohibition of Guaranteed High-Yield Returns in Wealth Advertisements',
  'SEC',
  (SELECT id FROM regulatory_instruments WHERE short_name LIKE '%SEC Consolidated Rules%' LIMIT 1),
  'SEC Consolidated Rules 2013 Rule 39(b) & ISA 2007 Section 67',
  'Advertisements offering securities, collective investment schemes, or portfolio management shall not state or imply guaranteed capital preservation or risk-free returns. Past performance must include statutory risk warnings.',
  ARRAY['risk-free return', 'guaranteed return', 'guaranteed annual yield', 'capital 100% safe', 'backed by government'],
  ARRAY['Capital is at risk', 'Past performance is not indicative of future returns', 'Registered with SEC as a Fund/Portfolio Manager'],
  ARRAY['WEALTHTECH_INVEST'],
  ARRAY['SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'EMAIL_NEWSLETTER', 'OUTDOOR_BILLBOARD'],
  false
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO marketing_knowledge_rules (
  organization_id,
  rule_code,
  title,
  regulator_code,
  regulation_id,
  statutory_citation,
  verbatim_clause,
  prohibited_terms,
  mandatory_disclosures,
  applies_to_categories,
  applies_to_channels,
  is_custom
)
SELECT 
  o.id,
  'NDIC-ACT-2023-DEPOSIT-ADVERTISING',
  'Mandatory Deposit Insurance Corporation Coverage Disclosures',
  'NDIC',
  (SELECT id FROM regulatory_instruments WHERE short_name = 'CBN CPF 2019' LIMIT 1),
  'NDIC Act 2023 Section 21 & BOFIA 2020 Section 65',
  'Institutions accepting public deposits must explicitly disclose their regulatory license and state that eligible deposits are insured by the Nigeria Deposit Insurance Corporation (NDIC) up to statutory limits.',
  ARRAY['unlimited insurance', '100% government guaranteed deposit', 'risk-free savings'],
  ARRAY['Insured by NDIC up to statutory limits', 'Licensed by the Central Bank of Nigeria (CBN)'],
  ARRAY['SAVINGS_DEPOSIT'],
  ARRAY['SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'SMS_BLAST', 'EMAIL_NEWSLETTER'],
  false
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO marketing_knowledge_rules (
  organization_id,
  rule_code,
  title,
  regulator_code,
  regulation_id,
  statutory_citation,
  verbatim_clause,
  prohibited_terms,
  mandatory_disclosures,
  applies_to_categories,
  applies_to_channels,
  is_custom
)
SELECT 
  o.id,
  'FCCPC-2022-DIGITAL-LENDING',
  'FCCPC Transparent Lending Licensing & Anti-Deception Mandate',
  'FCCPC',
  (SELECT id FROM regulatory_instruments WHERE short_name LIKE '%FCCPC Lending%' LIMIT 1),
  'FCCPC Limited Interim Regulatory Framework for Digital Lending 2022 Section 3',
  'Digital money lenders must clearly disclose their FCCPC registration status, corporate legal entity name, and exact statutory repayment terms. Misleading claims of instantaneous approval without evaluation are prohibited.',
  ARRAY['no bvn required', 'instant loan no verification', 'guaranteed cash in 1 minute'],
  ARRAY['Registered with FCCPC', 'Subject to creditworthiness evaluation'],
  ARRAY['DIGITAL_NANO_LOAN'],
  ARRAY['SMS_BLAST', 'SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE'],
  false
FROM organizations o
ON CONFLICT DO NOTHING;
