-- ==============================================================================
-- COGENT MIGRATION 20261006000007: HARDEN RADAR NOTIFICATIONS RLS
-- Adheres to Phase A2 Security Hardening & Zero Cross-Tenant Leakage
-- Drops overly permissive public/admin policy on radar_notifications to strictly
-- enforce tenant-isolated access via organization_id = current_org_id().
-- ==============================================================================

DROP POLICY IF EXISTS admin_manage_radar_notifications ON radar_notifications;

-- Re-assert strict tenant isolation policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'radar_notifications' AND policyname = 'tenant_radar_notifications_policy'
  ) THEN
    CREATE POLICY tenant_radar_notifications_policy ON radar_notifications
      FOR ALL TO authenticated
      USING (organization_id = current_org_id())
      WITH CHECK (organization_id = current_org_id());
  END IF;
END $$;
