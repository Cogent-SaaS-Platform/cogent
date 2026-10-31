-- ==============================================================================
-- COGENT MIGRATION 20261031000002: TEAM DELEGATION & MULTI-TENANT ASSIGNMENT
-- Supports Step 4: Dynamic Team Delegation, Organization Members & Statutory Roles
-- ==============================================================================

-- 1. Ensure organization_memberships has job_title
ALTER TABLE organization_memberships
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

-- 2. Enhance radar_tenant_impacts with dual-mode assignment & workflow state
ALTER TABLE radar_tenant_impacts
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS target_department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS assignment_notes TEXT,
  ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'Pending Review',
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- 3. Enhance radar_action_items with role assignment & timestamps
ALTER TABLE radar_action_items
  ADD COLUMN IF NOT EXISTS assigned_role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Compound indexes for high-performance tenant delegation queries
CREATE INDEX IF NOT EXISTS idx_radar_impacts_assigned_user
  ON radar_tenant_impacts(organization_id, assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_radar_impacts_assigned_role
  ON radar_tenant_impacts(organization_id, assigned_role);

CREATE INDEX IF NOT EXISTS idx_radar_impacts_workflow
  ON radar_tenant_impacts(organization_id, workflow_status);

CREATE INDEX IF NOT EXISTS idx_radar_action_items_assigned
  ON radar_action_items(organization_id, assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_radar_action_items_role
  ON radar_action_items(organization_id, assigned_role);
