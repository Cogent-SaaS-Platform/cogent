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
}

export class TenantSyncService {
  private adminClient: SupabaseClient<any>;

  constructor(adminClient?: SupabaseClient<any>) {
    this.adminClient = adminClient || (createAdminClient() as any);
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
      // 1. Sync User record
      const { data: userRow, error: userError } = await this.adminClient
        .from('users')
        .upsert(
          {
            clerk_user_id: clerkUserId,
            email: userEmail,
            full_name: userFullName,
            avatar_url: userAvatarUrl || null,
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
        .select('id')
        .eq('clerk_organization_id', clerkOrgId)
        .maybeSingle();

      let orgId: string;

      if (existingOrg) {
        orgId = existingOrg.id;
        await this.adminClient
          .from('organizations')
          .update({
            name: orgName,
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
          })
          .select('id')
          .single();

        if (orgError || !newOrg) {
          throw new Error(`Failed to insert organization: ${orgError?.message}`);
        }
        orgId = newOrg.id;
      }

      // 3. Sync Organization Membership
      await this.adminClient
        .from('organization_memberships')
        .upsert(
          {
            organization_id: orgId,
            user_id: userRow.id,
            role,
            department: 'COMPLIANCE_LEGAL',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,user_id' }
        );

      // 4. Bootstrap Baseline Licenses & Rails if brand new organization
      if (isNewOrganization) {
        await this.bootstrapTenantDefaults(orgId);
      }

      logger.info(
        {
          clerkOrgId,
          organizationId: orgId,
          clerkUserId,
          userId: userRow.id,
          isNewOrganization,
        },
        'Tenant context synchronized successfully'
      );

      return {
        organizationId: orgId,
        userId: userRow.id,
        isNewOrganization,
      };
    } catch (error: any) {
      logger.error(
        { error: error.message, clerkOrgId, clerkUserId },
        'Failed to synchronize tenant identity'
      );
      throw error;
    }
  }

  /**
   * Seeds foundational statutory licenses and payment rails for a newly registered tenant
   */
  private async bootstrapTenantDefaults(organizationId: string): Promise<void> {
    try {
      // Baseline operating license (Commercial Bank / MFB / FinTech)
      await this.adminClient.from('tenant_licenses').insert([
        {
          organization_id: organizationId,
          license_type: 'COMMERCIAL_BANK' as LicenseType,
          license_number: `CBN/BSD/APP/${new Date().getFullYear()}/001`,
          issuing_regulator: 'CBN' as RegulatorCode,
          is_active: true,
          operating_conditions: 'Standard Nigerian Banking & Financial Services License',
        },
      ]);

      // Baseline core payment rail
      await this.adminClient.from('tenant_payment_rails').insert([
        {
          organization_id: organizationId,
          rail_type: 'NIBSS_NIP' as PaymentRail,
          integration_status: 'LIVE_PRODUCTION',
          settlement_bank_code: '044',
          is_active: true,
        },
      ]);
    } catch (err) {
      logger.warn({ err, organizationId }, 'Failed to bootstrap tenant default licenses/rails');
    }
  }
}
