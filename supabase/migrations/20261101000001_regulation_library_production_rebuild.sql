-- ============================================================================
-- COGENT DATABASE MIGRATION: Regulation Library & Obligations Production Rebuild
-- Target: supabase/migrations/20261101000001_regulation_library_production_rebuild.sql
-- ============================================================================

-- 1. PURGE CORRUPTED RECORDS AND NON-STATUTORY SCRAPES
DELETE FROM radar_tenant_impacts
WHERE circular_id IN (
  SELECT id FROM radar_circulars 
  WHERE LOWER(TRIM(subject)) IN (
    'circular',
    'federal competition & consumer protection commission',
    'consumer rights & responsibilities',
    'civil society/consumer protection alliances',
    'data controllers/processors registration',
    'registered data controllers/data processors of major importance',
    'advancing global data governance: ndpc hosts sri lankan delegation on 2-day study tour',
    'full electronic registration (e-registration) now available on the eportal',
    'invitation for expression of interest (eoi) from qualified event management/organisation firms for the planning and hosting of the 2027 iosco/amerc meeting'
  ) OR subject ILIKE 'securities and exchange commission (sec) nigeria%'
);

DELETE FROM circular_supersession_links
WHERE parent_circular_id IN (
  SELECT id FROM radar_circulars 
  WHERE LOWER(TRIM(subject)) IN (
    'circular',
    'federal competition & consumer protection commission',
    'consumer rights & responsibilities',
    'civil society/consumer protection alliances',
    'data controllers/processors registration',
    'registered data controllers/data processors of major importance',
    'advancing global data governance: ndpc hosts sri lankan delegation on 2-day study tour',
    'full electronic registration (e-registration) now available on the eportal',
    'invitation for expression of interest (eoi) from qualified event management/organisation firms for the planning and hosting of the 2027 iosco/amerc meeting'
  ) OR subject ILIKE 'securities and exchange commission (sec) nigeria%'
) OR child_circular_id IN (
  SELECT id FROM radar_circulars 
  WHERE LOWER(TRIM(subject)) IN (
    'circular',
    'federal competition & consumer protection commission',
    'consumer rights & responsibilities',
    'civil society/consumer protection alliances',
    'data controllers/processors registration',
    'registered data controllers/data processors of major importance',
    'advancing global data governance: ndpc hosts sri lankan delegation on 2-day study tour',
    'full electronic registration (e-registration) now available on the eportal',
    'invitation for expression of interest (eoi) from qualified event management/organisation firms for the planning and hosting of the 2027 iosco/amerc meeting'
  ) OR subject ILIKE 'securities and exchange commission (sec) nigeria%'
);

DELETE FROM radar_circulars
WHERE LOWER(TRIM(subject)) IN (
  'circular',
  'federal competition & consumer protection commission',
  'consumer rights & responsibilities',
  'civil society/consumer protection alliances',
  'data controllers/processors registration',
  'registered data controllers/data processors of major importance',
  'advancing global data governance: ndpc hosts sri lankan delegation on 2-day study tour',
  'full electronic registration (e-registration) now available on the eportal',
  'invitation for expression of interest (eoi) from qualified event management/organisation firms for the planning and hosting of the 2027 iosco/amerc meeting'
) OR subject ILIKE 'securities and exchange commission (sec) nigeria%';

-- Delete corrupted regulatory_instruments and cascading versions/clauses/obligations
DELETE FROM regulatory_instruments
WHERE LOWER(TRIM(title)) IN (
  'federal competition & consumer protection commission',
  'consumer rights & responsibilities',
  'civil society/consumer protection alliances',
  'data controllers/processors registration',
  'registered data controllers/data processors of major importance',
  'advancing global data governance: ndpc hosts sri lankan delegation on 2-day study tour',
  'full electronic registration (e-registration) now available on the eportal',
  'invitation for expression of interest (eoi) from qualified event management/organisation firms for the planning and hosting of the 2027 iosco/amerc meeting'
) OR title ILIKE 'securities and exchange commission (sec) nigeria%'
  OR title ILIKE '%sri lankan%'
  OR title ILIKE '%study tour%';

-- 2. ENHANCE REGULATORY_INSTRUMENTS DOMAIN MODEL
ALTER TABLE regulatory_instruments
  ADD COLUMN IF NOT EXISTS overview TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS key_requirement_areas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS domain VARCHAR(64) DEFAULT 'FINTECH_PAYMENTS',
  ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(32) DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS classification VARCHAR(64) DEFAULT 'SUBSIDIARY_REGULATION',
  ADD COLUMN IF NOT EXISTS is_binding BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner VARCHAR(128) DEFAULT 'Chief Compliance Officer',
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_logs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS captured_text TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS entry_into_force_date DATE,
  ADD COLUMN IF NOT EXISTS publication_date DATE;

-- 3. ENHANCE REGULATORY_CLAUSES (SECTIONS)
ALTER TABLE regulatory_clauses
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 4. ENHANCE REGULATORY_OBLIGATIONS
ALTER TABLE regulatory_obligations
  ADD COLUMN IF NOT EXISTS code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS rule_type VARCHAR(64) DEFAULT 'Prescriptive',
  ADD COLUMN IF NOT EXISTS policy_applicability VARCHAR(64) DEFAULT 'Policy Applicable',
  ADD COLUMN IF NOT EXISTS assessment_criteria JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_description TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(64) DEFAULT 'Pending Review',
  ADD COLUMN IF NOT EXISTS is_relevant BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS section_or_page_ref VARCHAR(128);

-- 5. RELATIONAL ASSESSMENT CRITERIA TABLE
CREATE TABLE IF NOT EXISTS obligation_assessment_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES regulatory_obligations(id) ON DELETE CASCADE,
  criterion_type VARCHAR(32) NOT NULL DEFAULT 'Core Criteria',
  criterion_text TEXT NOT NULL,
  evidence_required TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obl_criteria_obligation_id ON obligation_assessment_criteria(obligation_id);

-- 6. AUDIT LOGS TABLE FOR REGULATORY INSTRUMENTS
CREATE TABLE IF NOT EXISTS instrument_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES regulatory_instruments(id) ON DELETE CASCADE,
  action VARCHAR(128) NOT NULL,
  performed_by VARCHAR(128) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_audit_logs_inst_id ON instrument_audit_logs(instrument_id);
