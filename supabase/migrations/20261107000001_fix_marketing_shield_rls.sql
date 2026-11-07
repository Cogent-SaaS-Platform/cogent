-- ==============================================================================
-- COGENT MIGRATION 20261107000001: FIX MARKETING SHIELD ROW-LEVEL SECURITY POLICIES
-- Aligns marketing tables with Clerk JWT authentication (current_org_id / current_user_id)
-- Replaces erroneous auth.uid() checks with tenant-isolated current_org_id()
-- ==============================================================================

DO $$ BEGIN
  -- 1. marketing_campaigns
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

  -- 2. campaign_chat_messages
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

  -- 3. extracted_promotional_claims
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

  -- 4. marketing_knowledge_rules
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
