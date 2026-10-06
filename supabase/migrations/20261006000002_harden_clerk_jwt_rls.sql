-- ==============================================================================
-- COGENT MIGRATION 20261006000002: HARDEN CLERK JWT RLS FOR THIRD-PARTY AUTH
-- Updates current_org_id() to support both Clerk Native Third-Party Auth
-- (which passes active organization in auth.jwt()->'o'->>'id') and legacy JWT
-- templates (which pass auth.jwt()->>'org_id').
-- ==============================================================================

CREATE OR REPLACE FUNCTION current_org_id() 
RETURNS UUID AS $$
  SELECT id FROM organizations 
  WHERE clerk_organization_id = COALESCE(
    auth.jwt() ->> 'org_id',
    auth.jwt() -> 'o' ->> 'id'
  )
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Re-affirm current_user_id() mapping to Clerk sub claim
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
  SELECT id FROM users 
  WHERE clerk_user_id = (auth.jwt() ->> 'sub')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
