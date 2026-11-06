/**
 * Cogent Enterprise Identity & Tenancy Sync Service
 * Bridges Clerk Organizations & Users with Supabase PostgreSQL tables.
 * 
 * Ensures that whenever a Clerk user accesses the platform with an active
 * organization, their corresponding tenant records exist in:
 * - `organizations` (with clerk_organization_id)
 * - `users` (with clerk_user_id)
 * - `organization_memberships` (binding user to organization)
 * - `tenant_licenses` (bootstraps baseline financial licenses if empty)
 * - `tenant_payment_rails` (bootstraps baseline operational rails if empty)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, Database } from '@/shared/db';
import { OrgRole, RegulatorCode, LicenseType, PaymentRail } from '@/shared/types';
import { logger } from '@/shared/logger';
import { isFounderAdminEmail } from '@/lib/plans';

export interface SyncTenantParams {
  clerkOrgId: string;
  orgName: string;
  orgSlug?: string;
  clerkUserId: string;
  userEmail: string;
  userFullName: string;
  userAvatarUrl?: string;
  role?: OrgRole;
}

export interface SyncTenantResult {
  organizationId: string;
  userId: string;
  isNewOrganization: boolean;
  isInternalDemoOrAdmin: boolean;
}

export class TenantSyncService {
  private adminClient: SupabaseClient<Database>;

  constructor(adminClient?: SupabaseClient<Database>) {
    this.adminClient = adminClient || createAdminClient();
  }

  /**
   * Performs Just-In-Time (JIT) provisioning/synchronization between Clerk and Supabase.
   */
  public async syncTenant(params: SyncTenantParams): Promise<SyncTenantResult> {
    const {
      clerkOrgId,
      orgName,
      orgSlug,
      clerkUserId,
      userEmail,
      userFullName,
      userAvatarUrl,
      role = 'ADMIN',
    } = params;

    const safeSlug =
      orgSlug ||
      orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      `org-${clerkOrgId.slice(-8)}`;

    try {
      const isFounderAdmin = isFounderAdminEmail(userEmail);

      // 1. Sync User record
      const { data: userRow, error: userError } = await this.adminClient
        .from('users')
        .upsert(
          {
            clerk_user_id: clerkUserId,
            email: userEmail,
            full_name: userFullName,
            avatar_url: userAvatarUrl || null,
            ...(isFounderAdmin ? { is_internal_demo_or_admin: true } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'clerk_user_id' }
        )
        .select('id')
        .single();

      if (userError || !userRow) {
        throw new Error(`Failed to upsert user record: ${userError?.message}`);
      }

      // 2. Sync Organization record
      let isNewOrganization = false;
      const { data: existingOrg } = await this.adminClient
        .from('organizations')
        .select('id, created_at, is_internal_demo_or_admin')
        .eq('clerk_organization_id', clerkOrgId)
        .maybeSingle();

      const isEffectiveFounderAdmin = isFounderAdmin || Boolean(existingOrg?.is_internal_demo_or_admin);
      let orgId: string;

      if (existingOrg) {
        orgId = existingOrg.id;
        await this.adminClient
          .from('organizations')
          .update({
            name: orgName,
            ...(isEffectiveFounderAdmin ? { is_internal_demo_or_admin: true } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);
      } else {
        isNewOrganization = true;
        const { data: newOrg, error: orgError } = await this.adminClient
          .from('organizations')
          .insert({
            clerk_organization_id: clerkOrgId,
            name: orgName,
            slug: safeSlug,
            is_internal_demo_or_admin: isEffectiveFounderAdmin,
          })
          .select('id')
          .single();

        if (orgError || !newOrg) {
          throw new Error(`Failed to insert organization: ${orgError?.message}`);
        }
        orgId = newOrg.id;
      }

      // 3. Sync Organization Membership (preserve existing department & job title if configured)
      const { data: existingMembership } = await (this.adminClient.from('organization_memberships') as any)
        .select('department, job_title')
        .eq('organization_id', orgId)
        .eq('user_id', userRow.id)
        .maybeSingle();

      await (this.adminClient.from('organization_memberships') as any)
        .upsert(
          {
            organization_id: orgId,
            user_id: userRow.id,
            role,
            department: existingMembership?.department || 'EXECUTIVE_LEADERSHIP',
            job_title: existingMembership?.job_title || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,user_id' }
        );

      // 4. Ensure tenant subscription exists (anchored to org created_at or unlocked for Founder Admin)
      await this.ensureTenantSubscription(orgId, existingOrg?.created_at, isEffectiveFounderAdmin);

      logger.info(
        {
          clerkOrgId,
          organizationId: orgId,
          clerkUserId,
          userId: userRow.id,
          isNewOrganization,
          isInternalDemoOrAdmin: isEffectiveFounderAdmin,
        },
        'Tenant context synchronized successfully'
      );

      return {
        organizationId: orgId,
        userId: userRow.id,
        isNewOrganization,
        isInternalDemoOrAdmin: isEffectiveFounderAdmin,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        { error: message, clerkOrgId, clerkUserId },
        'Failed to synchronize tenant identity'
      );
      throw error;
    }
  }

  /**
   * Ensures an active institutional subscription is provisioned, anchored to org registration date.
   * If tenant is internal demo or founder super-admin, unlocks unlimited ENTERPRISE entitlements.
   */
  private async ensureTenantSubscription(
    organizationId: string,
    orgCreatedAt?: string,
    isFounderAdmin = false
  ): Promise<void> {
    try {
      const { data: existing } = await this.adminClient
        .from('tenant_subscriptions')
        .select('id, tier, status')
        .eq('organization_id', organizationId)
        .maybeSingle();

      const createdAt = orgCreatedAt ? new Date(orgCreatedAt) : new Date();

      if (isFounderAdmin) {
        // Automatically unlock ENTERPRISE with UNLIMITED quotas and zero trial lockouts
        if (!existing || existing.status === 'trialing' || existing.tier !== 'ENTERPRISE') {
          await (this.adminClient.from('tenant_subscriptions') as any).upsert(
            {
              organization_id: organizationId,
              tier: 'ENTERPRISE',
              status: 'active',
              trial_ends_at: null,
              current_period_start: createdAt.toISOString(),
              current_period_end: new Date(Date.now() + 3650 * 86400000).toISOString(),
              marketing_scan_quota: -1,
              policy_document_quota: -1,
              is_internal_demo_or_admin: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'organization_id' }
          );
        }
        return;
      }

      if (existing) return;

      const trialEndsAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await this.adminClient.from('tenant_subscriptions').insert([
        {
          organization_id: organizationId,
          tier: 'STARTER',
          status: 'trialing',
          trial_ends_at: trialEndsAt,
          current_period_start: createdAt.toISOString(),
          current_period_end: trialEndsAt,
          marketing_scan_quota: 10,
          policy_document_quota: 1,
          is_internal_demo_or_admin: false,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ error: message, organizationId }, 'Failed to bootstrap tenant default subscriptions');
    }
  }
}
