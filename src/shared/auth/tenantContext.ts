/**
 * Cogent Enterprise Tenant Context Resolver
 * 
 * Central gateway for resolving tenant identity and providing an RLS-bound
 * Supabase client across all API Route Handlers and Server Actions.
 */

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, createAdminClient, createClient, Database } from '@/shared/db';
import { TenantSyncService } from './tenantSyncService';
import { logger } from '@/shared/logger';

export interface TenantContext {
  organizationId: string; // Database UUID
  userId: string;         // Database UUID
  clerkOrgId?: string;
  clerkUserId?: string;
  dbClient: SupabaseClient<Database>;
  isDevFallback: boolean;
}

export interface TenantContextOptions {
  allowDevFallback?: boolean;
  requiredRole?: string;
}

const DEFAULT_DEV_ORG_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_DEV_USER_ID = '00000000-0000-0000-0000-000000000010';

/**
 * Resolves the active tenant context for the current request.
 */
export async function getTenantContext(options?: TenantContextOptions): Promise<TenantContext> {
  const isClerkConfigured =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Live Clerk Authentication Path
  // ──────────────────────────────────────────────────────────────────────────
  if (isClerkConfigured) {
    try {
      const authObj = await auth();
      const { userId: clerkUserId, orgId: clerkOrgId, getToken } = authObj;

      if (!clerkUserId) {
        throw new Error('UNAUTHORIZED: No active Clerk user session found');
      }

      if (!clerkOrgId) {
        throw new Error('NO_ACTIVE_ORGANIZATION: User must select or create an organization');
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

      // Instantiate Supabase client carrying the Clerk JWT
      const dbClient = token ? createServerClient(token) : createAdminClient();

      return {
        organizationId: syncResult.organizationId,
        userId: syncResult.userId,
        clerkOrgId,
        clerkUserId,
        dbClient,
        isDevFallback: false,
      };
    } catch (err: any) {
      if (!options?.allowDevFallback && process.env.NODE_ENV === 'production') {
        throw err;
      }
      logger.warn({ err: err.message }, 'Clerk auth resolution failed, falling back to local tenant');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Dev / Test Fallback Path
  // ──────────────────────────────────────────────────────────────────────────
  let fallbackDbClient: SupabaseClient<Database>;
  try {
    fallbackDbClient = createAdminClient();
  } catch {
    try {
      fallbackDbClient = createClient();
    } catch {
      fallbackDbClient = null as any;
    }
  }

  return {
    organizationId: DEFAULT_DEV_ORG_ID,
    userId: DEFAULT_DEV_USER_ID,
    clerkOrgId: 'org_dev_default',
    clerkUserId: 'user_dev_default',
    dbClient: fallbackDbClient,
    isDevFallback: true,
  };
}
