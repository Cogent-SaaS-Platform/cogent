-- ==============================================================================
-- COGENT MIGRATION 20261006000003: ADD PRODUCT CATEGORY TO MARKETING SCANS
-- Enables product taxonomy filtering for marketing scans, claims ledger, and drift
-- ==============================================================================

ALTER TABLE marketing_scans
  ADD COLUMN IF NOT EXISTS product_category VARCHAR(64) NOT NULL DEFAULT 'SAVINGS_DEPOSIT';

ALTER TABLE marketing_scans
  DROP CONSTRAINT IF EXISTS marketing_scans_product_category_chk;

ALTER TABLE marketing_scans
  ADD CONSTRAINT marketing_scans_product_category_chk CHECK (
    product_category IN (
      'SAVINGS_DEPOSIT',
      'DIGITAL_NANO_LOAN',
      'PAYMENTS_WALLET',
      'REMITTANCE_FX',
      'WEALTHTECH_INVEST'
    )
  );

CREATE INDEX IF NOT EXISTS idx_marketing_scans_org_product
  ON marketing_scans(organization_id, product_category);
