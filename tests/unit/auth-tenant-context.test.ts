import { describe, it, expect, vi } from 'vitest';
import { TenantSyncService } from '@/shared/auth/tenantSyncService';
import { getTenantContext } from '@/shared/auth/tenantContext';
import fs from 'fs';
import path from 'path';

describe('Cogent Enterprise Auth & Tenancy Subsystem', () => {
  it('verifies migration 20261006000002 hardens current_org_id with COALESCE', () => {
    const migrationPath = path.resolve(
      import.meta.dirname,
      '../../supabase/migrations/20261006000002_harden_clerk_jwt_rls.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION current_org_id()');
    expect(sql).toContain("auth.jwt() ->> 'org_id'");
    expect(sql).toContain("auth.jwt() -> 'o' ->> 'id'");
    expect(sql).toContain('COALESCE');
  });

  it('verifies migration 20261006000003 adds product_category to marketing_scans', () => {
    const migrationPath = path.resolve(
      import.meta.dirname,
      '../../supabase/migrations/20261006000003_add_product_category_to_scans.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('ALTER TABLE marketing_scans');
    expect(sql).toContain('product_category');
    expect(sql).toContain('SAVINGS_DEPOSIT');
    expect(sql).toContain('DIGITAL_NANO_LOAN');
    expect(sql).toContain('PAYMENTS_WALLET');
    expect(sql).toContain('REMITTANCE_FX');
    expect(sql).toContain('WEALTHTECH_INVEST');
  });

  it('proves getTenantContext provides valid tenant context in dev/test fallback mode', async () => {
    const ctx = await getTenantContext();
    expect(ctx).toBeDefined();
    expect(ctx.organizationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(ctx.userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(ctx.isDevFallback).toBe(true);
  });

  it('executes TenantSyncService upsert with mocked Supabase client', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: '00000000-0000-0000-0000-000000000099' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // Simulate new organization
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: '00000000-0000-0000-0000-000000000088' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'organization_memberships' || table === 'tenant_licenses' || table === 'tenant_payment_rails') {
        return {
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    const mockAdminClient = { from: mockFrom } as any;
    const syncService = new TenantSyncService(mockAdminClient);

    const result = await syncService.syncTenant({
      clerkOrgId: 'org_test_institution_123',
      orgName: 'Apex Capital Microfinance Bank',
      clerkUserId: 'user_clerk_tester_456',
      userEmail: 'cco@apexcapital.ng',
      userFullName: 'Dr. Amina Bello',
      role: 'ADMIN',
    });

    expect(result.organizationId).toBe('00000000-0000-0000-0000-000000000088');
    expect(result.userId).toBe('00000000-0000-0000-0000-000000000099');
    expect(result.isNewOrganization).toBe(true);

    // Verify user upsert was called
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockFrom).toHaveBeenCalledWith('organizations');
    expect(mockFrom).toHaveBeenCalledWith('organization_memberships');
    expect(mockFrom).toHaveBeenCalledWith('tenant_licenses');
    expect(mockFrom).toHaveBeenCalledWith('tenant_payment_rails');
  });
});
