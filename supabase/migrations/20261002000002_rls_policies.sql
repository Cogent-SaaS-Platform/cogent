-- ==============================================================================
-- COGENT MIGRATION 20261002000002: ROW-LEVEL SECURITY & CLERK JWT INTEGRATION
-- Adheres to docs/DATA_MODEL.md v1.1 Section 11 and docs/SECURITY.md
-- ==============================================================================

-- 1. Identity Resolution Helper Functions
-- Resolves the active organization UUID by matching Clerk's org_id JWT claim
CREATE OR REPLACE FUNCTION current_org_id() 
RETURNS UUID AS $$
  SELECT id FROM organizations 
  WHERE clerk_organization_id = (auth.jwt() ->> 'org_id')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Resolves the current user UUID by matching Clerk's sub (user_id) claim
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
  SELECT id FROM users 
  WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Public / Global Tables (Read by Authenticated, Write by Quarantined Service Role)

ALTER TABLE regulatory_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE prohibited_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_circulars ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_regulatory_bodies ON regulatory_bodies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY public_read_regulatory_instruments ON regulatory_instruments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY public_read_regulatory_document_versions ON regulatory_document_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY public_read_regulatory_clauses ON regulatory_clauses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY public_read_regulatory_obligations ON regulatory_obligations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY public_read_applicability_rules ON applicability_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY public_read_statutory_penalties ON statutory_penalties
  FOR SELECT TO authenticated USING (true);

CREATE POLICY public_read_prohibited_terms ON prohibited_terms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY public_read_radar_circulars ON radar_circulars
  FOR SELECT TO authenticated USING (true);

-- 3. Tenant-Isolated Tables (Enforced via organization_id = current_org_id())

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_payment_rails ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_tenant_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_matrix_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3.1 Organization Policies
CREATE POLICY tenant_org_policy ON organizations
  FOR ALL TO authenticated 
  USING (id = current_org_id());

-- 3.2 User Policy (Users can see their own profile and peers in the same org)
CREATE POLICY user_self_policy ON users
  FOR SELECT TO authenticated 
  USING (
    clerk_user_id = (auth.jwt() ->> 'sub')
    OR id IN (
      SELECT user_id FROM organization_memberships 
      WHERE organization_id = current_org_id()
    )
  );

CREATE POLICY user_update_self ON users
  FOR UPDATE TO authenticated 
  USING (clerk_user_id = (auth.jwt() ->> 'sub'));

-- 3.3 Organization Memberships Policy
CREATE POLICY tenant_memberships_policy ON organization_memberships
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

-- 3.4 Tenant Licenses & Payment Rails Policies
CREATE POLICY tenant_licenses_policy ON tenant_licenses
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

CREATE POLICY tenant_rails_policy ON tenant_payment_rails
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

-- 3.5 AI Analysis Runs Policy
CREATE POLICY tenant_ai_runs_policy ON ai_analysis_runs
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

-- 3.6 Pillar 1: Marketing Shield Policies
CREATE POLICY tenant_marketing_scans_policy ON marketing_scans
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

CREATE POLICY tenant_marketing_findings_policy ON marketing_findings
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

-- 3.7 Pillar 2: Radar Policies
CREATE POLICY tenant_radar_impacts_policy ON radar_tenant_impacts
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

CREATE POLICY tenant_radar_actions_policy ON radar_action_items
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

-- 3.8 Pillar 3: Gap Matrix Policies
CREATE POLICY tenant_policies_policy ON policy_documents
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

CREATE POLICY tenant_policy_clauses_policy ON policy_clauses
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

CREATE POLICY tenant_gap_evaluations_policy ON gap_evaluations
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

CREATE POLICY tenant_gap_matrix_items_policy ON gap_matrix_items
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

-- 3.9 Audit Ledger & Notifications Policies
CREATE POLICY tenant_audit_logs_policy ON audit_logs
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());

CREATE POLICY tenant_notifications_policy ON notifications
  FOR ALL TO authenticated 
  USING (organization_id = current_org_id());
