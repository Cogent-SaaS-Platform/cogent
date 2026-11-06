-- ============================================================================
-- COGENT DATABASE MIGRATION: Forensic Purge & Reclassification
-- Target: supabase/migrations/20261106000002_library_forensic_purge_and_reclassification.sql
-- Remediates fake test stubs, non-statutory PR notices, broken FinTech fallbacks,
-- duplicate section titles, and hardcoded 3-item Mad-Libs assessment criteria.
-- ============================================================================

-- 1. PURGE FAKE TEST STUBS & NON-STATUTORY NOTICES FROM RADAR CIRCULARS
DELETE FROM radar_tenant_impacts
WHERE circular_id IN (
  SELECT id FROM radar_circulars
  WHERE LOWER(TRIM(subject)) IN (
    'directive on virtual assets 2026',
    'sec/cir/vasp/2026/009',
    'operational directive on contactless payment interchange',
    'psm/dir/con/cws/08/014',
    'suspected fraudulent activities of wayvepay',
    'sec clears seven new fintech firms for admission into the accelerated regulatory incubation programme (arip)',
    'circular',
    'federal competition & consumer protection commission'
  )
  OR subject ILIKE '%wayvepay%'
  OR subject ILIKE '%accelerated regulatory incubation programme%'
  OR subject ILIKE '%pre-shipment inspection%'
  OR subject ILIKE '%study tour%'
  OR subject ILIKE '%sri lankan%'
  OR subject ILIKE '%expression of interest%'
  OR subject ILIKE '%(eoi)%'
  OR subject ILIKE '%e-registration now available%'
);

DELETE FROM circular_supersession_links
WHERE parent_circular_id IN (
  SELECT id FROM radar_circulars
  WHERE LOWER(TRIM(subject)) IN (
    'directive on virtual assets 2026',
    'operational directive on contactless payment interchange',
    'suspected fraudulent activities of wayvepay',
    'sec clears seven new fintech firms for admission into the accelerated regulatory incubation programme (arip)'
  )
  OR subject ILIKE '%wayvepay%'
  OR subject ILIKE '%accelerated regulatory incubation programme%'
)
OR child_circular_id IN (
  SELECT id FROM radar_circulars
  WHERE LOWER(TRIM(subject)) IN (
    'directive on virtual assets 2026',
    'operational directive on contactless payment interchange',
    'suspected fraudulent activities of wayvepay',
    'sec clears seven new fintech firms for admission into the accelerated regulatory incubation programme (arip)'
  )
  OR subject ILIKE '%wayvepay%'
  OR subject ILIKE '%accelerated regulatory incubation programme%'
);

DELETE FROM radar_circulars
WHERE LOWER(TRIM(subject)) IN (
  'directive on virtual assets 2026',
  'sec/cir/vasp/2026/009',
  'operational directive on contactless payment interchange',
  'psm/dir/con/cws/08/014',
  'suspected fraudulent activities of wayvepay',
  'sec clears seven new fintech firms for admission into the accelerated regulatory incubation programme (arip)',
  'circular',
  'federal competition & consumer protection commission'
)
OR subject ILIKE '%wayvepay%'
OR subject ILIKE '%accelerated regulatory incubation programme%'
OR subject ILIKE '%pre-shipment inspection%'
OR subject ILIKE '%study tour%'
OR subject ILIKE '%sri lankan%'
OR subject ILIKE '%expression of interest%'
OR subject ILIKE '%(eoi)%'
OR subject ILIKE '%e-registration now available%';

-- 2. PURGE FAKE TEST STUBS & NON-STATUTORY NOTICES FROM REGULATORY INSTRUMENTS
-- (Cascades to versions, clauses, obligations, criteria, audit logs)
DELETE FROM regulatory_instruments
WHERE LOWER(TRIM(title)) IN (
  'directive on virtual assets 2026',
  'sec/cir/vasp/2026/009',
  'operational directive on contactless payment interchange',
  'psm/dir/con/cws/08/014',
  'suspected fraudulent activities of wayvepay',
  'sec clears seven new fintech firms for admission into the accelerated regulatory incubation programme (arip)',
  'circular',
  'federal competition & consumer protection commission'
)
OR title ILIKE '%wayvepay%'
OR title ILIKE '%accelerated regulatory incubation programme%'
OR title ILIKE '%pre-shipment inspection%'
OR title ILIKE '%study tour%'
OR title ILIKE '%sri lankan%'
OR title ILIKE '%expression of interest%'
OR title ILIKE '%(eoi)%'
OR title ILIKE '%e-registration now available%'
OR short_name ILIKE '%wayvepay%'
OR short_name ILIKE '%arip%'
OR short_name = 'DIRECTIVE ON VIRTUAL ASSETS 2026'
OR short_name = 'OPERATIONAL DIRECTIVE ON CONTACTLESS PAYMENT INTERCHANGE';

-- 3. RECLASSIFY AUTHENTIC REGULATORY INSTRUMENTS DOMAINS AND TYPES
-- Fix AML / CFT & Sanctions
UPDATE regulatory_instruments
SET domain = 'AML_CFT',
    classification = 'SANCTIONS_ORDER'
WHERE (
  title ILIKE '%sanction%' OR
  title ILIKE '%unscr%' OR
  title ILIKE '%dcb finance%' OR
  title ILIKE '%nsc%' OR
  title ILIKE '%nigsac%' OR
  title ILIKE '%aml%' OR
  title ILIKE '%cft%' OR
  title ILIKE '%money laundering%' OR
  title ILIKE '%terrorist financing%' OR
  title ILIKE '%paek chang-ho%' OR
  title ILIKE '%beneficial ownership%' OR
  title ILIKE '%financial intelligence unit%' OR
  title ILIKE '%nfiu%'
);

-- Fix SEC Capital Markets & Exposure Drafts
UPDATE regulatory_instruments
SET domain = 'CAPITAL_MARKETS',
    instrument_type = CASE WHEN title ILIKE '%proposed%' OR title ILIKE '%draft%' THEN 'EXPOSURE_DRAFT' ELSE 'SUBSIDIARY_REGULATION' END,
    classification = CASE WHEN title ILIKE '%proposed%' OR title ILIKE '%draft%' THEN 'EXPOSURE_DRAFT' ELSE 'SUBSIDIARY_REGULATION' END
WHERE (
  title ILIKE '%securities trading%' OR
  title ILIKE '%custody%' OR
  title ILIKE '%capital market%' OR
  title ILIKE '%cross-border securities%' OR
  title ILIKE '%proposed rules%' OR
  title ILIKE '%investment and securities%' OR
  title ILIKE '%collective investment%'
);

-- Fix Consumer Protection
UPDATE regulatory_instruments
SET domain = 'CONSUMER_PROTECTION',
    instrument_type = 'SUBSIDIARY_REGULATION',
    classification = 'SUBSIDIARY_REGULATION'
WHERE (
  title ILIKE '%consumer protection%' OR
  title ILIKE '%fccpc%' OR
  title ILIKE '%customer protection%' OR
  title ILIKE '%complaints management%' OR
  title ILIKE '%fair hearing%' OR
  title ILIKE '%opt-out%'
);

-- Fix Data Privacy & AI Governance
UPDATE regulatory_instruments
SET domain = 'DATA_PRIVACY_AI',
    instrument_type = 'OPERATIONAL_GUIDELINE',
    classification = 'OPERATIONAL_GUIDELINE'
WHERE (
  title ILIKE '%data protection%' OR
  title ILIKE '%ndpc%' OR
  title ILIKE '%ndpr%' OR
  title ILIKE '%privacy%' OR
  title ILIKE '%artificial intelligence%'
);

-- Fix Digital Lending & Credit Risk
UPDATE regulatory_instruments
SET domain = 'DIGITAL_LENDING',
    instrument_type = 'OPERATIONAL_GUIDELINE',
    classification = 'OPERATIONAL_GUIDELINE'
WHERE (
  title ILIKE '%digital lending%' OR
  title ILIKE '%credit risk%' OR
  title ILIKE '%loan%' OR
  title ILIKE '%lending%' OR
  title ILIKE '%credit bureau%'
);

-- 4. PURGE 100% HARDCODED MAD-LIBS ASSESSMENT CRITERIA TEMPLATE
DELETE FROM obligation_assessment_criteria
WHERE criterion_text ILIKE 'Internal operating manual explicitly mandates compliance:%'
   OR criterion_text ILIKE 'Documented operational procedures and supervisory review checkpoints are maintained for audit readiness.%'
   OR criterion_text ILIKE 'Retention and audit logging procedures are maintained across operational ledgers.%';

-- Also clear the template from regulatory_obligations JSONB if stored
UPDATE regulatory_obligations
SET assessment_criteria = '[]'::jsonb
WHERE assessment_criteria::text ILIKE '%Internal operating manual explicitly mandates compliance:%';

-- 5. SANITIZE CLAUSE HEADINGS THAT DUPLICATE SECTION REFERENCE
UPDATE regulatory_clauses
SET section_heading = 'Statutory Provisions of ' || section_reference
WHERE LOWER(TRIM(section_heading)) = LOWER(TRIM(section_reference))
   OR section_heading IS NULL
   OR TRIM(section_heading) = ''
   OR LOWER(TRIM(section_heading)) = 'null';
