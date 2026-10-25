/**
 * Cogent Enterprise Tenant Context Resolver
 * 
 * Central gateway for resolving tenant identity, providing an RLS-bound
 * Supabase client across all API Route Handlers and Server Actions, and
 * evaluating subscription lifecycle status and feature entitlements.
 * Adheres strictly to docs/launch/PHASE_A2_IDENTITY_SECURITY.md and PHASE_A4_BILLING_SUBSCRIPTIONS.md
 */

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, createAdminClient, createClient, Database } from '@/shared/db';
import { TenantSyncService } from './tenantSyncService';
import { logger } from '@/shared/logger';
import { UnauthorizedError, ForbiddenError, ConfigurationError } from '@/shared/errors';
import { TenantSubscriptionSummary, SubscriptionTier } from '@/shared/types';
import { EntitlementEngine } from '@/shared/billing';

export type UserOrgRole = 'org:admin' | 'org:compliance_officer' | 'org:viewer' | string;

export interface TenantContext {
  organizationId: string; // Database UUID
  userId: string;         // Database UUID
  clerkOrgId?: string;
  clerkUserId?: string;
  userOrgRole?: UserOrgRole;
  dbClient: SupabaseClient<Database>;
  isDevFallback: boolean;
  subscription: TenantSubscriptionSummary;
  isSubscriptionActive: boolean; // Convenience flag: true when active, trialing, or in grace period
}

export interface TenantContextOptions {
  allowDevFallback?: boolean;
  requiredRole?: UserOrgRole;
}

export const DEFAULT_DEV_ORG_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_DEV_USER_ID = '00000000-0000-0000-0000-000000000010';

/**
 * Server-side RBAC helper enforcing organization role claims.
 */
export async function requireRole(
  context: TenantContext,
  allowedRoles: UserOrgRole[]
): Promise<void> {
  const userRole = context.userOrgRole;
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new ForbiddenError(
      `User role '${userRole || 'unassigned'}' is not authorized. Required: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Resolves subscription summary for a given organization.
 */
async function resolveOrganizationSubscription(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<TenantSubscriptionSummary> {
  try {
    const { data: subData, error: subError } = await client
      .from('tenant_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (subError) {
      logger.warn(
        { error: subError.message, organizationId },
        'Database query error fetching tenant subscription, defaulting to trial'
      );
    }

    if (subData) {
      return EntitlementEngine.computeSummary({
        tier: subData.tier as SubscriptionTier,
        status: subData.status,
        trialEndsAt: subData.trial_ends_at,
        gracePeriodEndsAt: subData.grace_period_ends_at,
        currentPeriodEnd: subData.current_period_end,
        marketingScanQuota: subData.marketing_scan_quota,
        policyDocumentQuota: subData.policy_document_quota,
        paystackSubscriptionCode: subData.paystack_subscription_code,
        paystackPlanCode: subData.paystack_plan_code,
      });
    }

    return EntitlementEngine.computeSummary({
      tier: 'STARTER',
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.warn(
      { error: error.message, organizationId },
      'Unexpected error resolving tenant subscription, returning default trial'
    );
    return EntitlementEngine.computeSummary({
      tier: 'STARTER',
      status: 'trialing',
    });
  }
}

/**
 * Resolves the active tenant context for the current request.
 * Hardened for production: zero fallbacks when running in production.
 */
export async function getTenantContext(options?: TenantContextOptions): Promise<TenantContext> {
  const isClerkConfigured =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY);

  // In production, Clerk authentication infrastructure MUST be present
  if (process.env.NODE_ENV === 'production' && !isClerkConfigured) {
    throw new ConfigurationError('Production environment requires active Clerk authentication configuration');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Live Clerk Authentication Path
  // ──────────────────────────────────────────────────────────────────────────
  if (isClerkConfigured) {
    try {
      const authObj = await auth();
      const { userId: clerkUserId, orgId: clerkOrgId, orgRole, getToken } = authObj;

      if (!clerkUserId) {
        throw new UnauthorizedError('UNAUTHORIZED: No active Clerk user session found');
      }

      if (!clerkOrgId) {
        throw new ForbiddenError('NO_ACTIVE_ORGANIZATION: User must select or create an organization');
      }

      // Fetch user details for JIT sync
      const user = await currentUser();
      const userEmail =
        user?.emailAddresses?.[0]?.emailAddress || `${clerkUserId}@placeholder.cogent.internal`;
      const userFullName =
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Compliance Officer';
      const userAvatarUrl = user?.imageUrl;

      // Fetch organization details for JIT sync
      let orgName = 'Institutional Tenant';
      let orgSlug: string | undefined;

      try {
        const client = await clerkClient();
        const org = await client.organizations.getOrganization({ organizationId: clerkOrgId });
        if (org) {
          orgName = org.name;
          orgSlug = org.slug || undefined;
        }
      } catch {
        // Fallback to placeholder name if Clerk API organization fetch fails
      }

      // JIT sync with Supabase tables
      const syncService = new TenantSyncService();
      const syncResult = await syncService.syncTenant({
        clerkOrgId,
        orgName,
        orgSlug,
        clerkUserId,
        userEmail,
        userFullName,
        userAvatarUrl,
      });

      // Obtain JWT session token carrying Clerk claims
      const token = await getToken();

      if (!token && process.env.NODE_ENV === 'production') {
        throw new UnauthorizedError('UNAUTHORIZED: Failed to acquire Clerk JWT token for Supabase');
      }

      // Instantiate Supabase client carrying the Clerk JWT
      const dbClient = token ? createServerClient(token) : createAdminClient();

      // Resolve subscription summary
      const subscription = await resolveOrganizationSubscription(dbClient, syncResult.organizationId);

      const context: TenantContext = {
        organizationId: syncResult.organizationId,
        userId: syncResult.userId,
        clerkOrgId,
        clerkUserId,
        userOrgRole: orgRole || undefined,
        dbClient,
        isDevFallback: false,
        subscription,
        isSubscriptionActive: subscription.isActive,
      };

      if (options?.requiredRole) {
        await requireRole(context, [options.requiredRole]);
      }

      return context;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError || err instanceof ForbiddenError || err instanceof ConfigurationError) {
        if (!options?.allowDevFallback || process.env.NODE_ENV === 'production') {
          throw err;
        }
      }
      if (process.env.NODE_ENV === 'production' || options?.allowDevFallback === false) {
        throw new UnauthorizedError(
          `UNAUTHORIZED: Authentication session resolution failed - ${err instanceof Error ? err.message : String(err)}`
        );
      }
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn({ err: error.message }, 'Clerk auth resolution failed in non-production, falling back to local dev tenant');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Dev / Test Fallback Path
  // ──────────────────────────────────────────────────────────────────────────
  // Strictly forbid dev fallback in production mode
  if (process.env.NODE_ENV === 'production') {
    throw new UnauthorizedError('UNAUTHORIZED: No active Clerk session in production environment');
  }

  // Strictly forbid dev fallback outside development and test environments
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    throw new UnauthorizedError('UNAUTHORIZED: Dev fallback is strictly prohibited outside development and test');
  }

  // Strictly forbid dev fallback if explicitly disallowed by caller
  if (options?.allowDevFallback === false) {
    throw new UnauthorizedError('UNAUTHORIZED: Dev fallback disabled for this request');
  }

  let fallbackDbClient: SupabaseClient<Database>;
  try {
    fallbackDbClient = createAdminClient();
  } catch {
    try {
      fallbackDbClient = createClient();
    } catch {
      fallbackDbClient = null as unknown as SupabaseClient<Database>;
    }
  }

  // In development and test fallback, configure active PRO subscription with full capabilities
  const devSubscription: TenantSubscriptionSummary = EntitlementEngine.computeSummary({
    tier: 'PRO',
    status: 'active',
    marketingScanQuota: -1,
    policyDocumentQuota: -1,
  });

  const context: TenantContext = {
    organizationId: DEFAULT_DEV_ORG_ID,
    userId: DEFAULT_DEV_USER_ID,
    clerkOrgId: 'org_dev_default',
    clerkUserId: 'user_dev_default',
    userOrgRole: 'org:admin',
    dbClient: fallbackDbClient,
    isDevFallback: true,
    subscription: devSubscription,
    isSubscriptionActive: devSubscription.isActive,
  };

  if (options?.requiredRole) {
    await requireRole(context, [options.requiredRole]);
  }

  return context;
}
