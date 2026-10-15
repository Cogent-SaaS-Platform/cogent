import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { LicenseType, PaymentRail, RegulatorCode } from '@/shared/types';
import { logger } from '@/shared/logger';
import {
  TenantProfileContext,
  CircularTargetingContext,
  ApplicabilityResult,
} from '../types';

export interface RichTenantLicense {
  licenseType: LicenseType;
  licenseNumber?: string | null;
  issuingRegulator?: RegulatorCode;
  isActive: boolean;
}

export interface RichTenantPaymentRail {
  railType: PaymentRail;
  integrationStatus?: string;
  settlementBankCode?: string | null;
  isActive: boolean;
}

export interface RichTenantProfileContext extends TenantProfileContext {
  organizationName?: string;
  licenses?: RichTenantLicense[];
  paymentRails?: RichTenantPaymentRail[];
}

/**
 * Deterministic Relational Tenant Applicability Engine (Epic 11)
 * Matches circular targeting against tenant licenses & payment rails with zero hallucinations.
 */
export class ApplicabilityEngine {
  private dbClient: SupabaseClient<Database>;

  constructor(options: { dbClient: SupabaseClient<Database> } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('ApplicabilityEngine requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;
  }

  /**
   * Pure deterministic matching of circular against tenant licenses & rails (Task 11.1 & 11.2)
   */
  public static evaluatePure(
    tenant: TenantProfileContext | RichTenantProfileContext,
    circular: CircularTargetingContext
  ): ApplicabilityResult {
    // 1. Universal Mandate Check
    if (circular.appliesUniversally) {
      return {
        isApplicable: true,
        reason:
          'Universal statutory mandate applying to all regulated financial entities in Nigeria.',
        matchedLicenses: tenant.activeLicenses,
        matchedRails: tenant.activeRails,
      };
    }

    const targetedLicenses = circular.targetedLicenses || (circular as any).targetedLicenseTypes || [];
    const affectedRails = circular.affectedRails || (circular as any).affectedPaymentRails || [];

    // 2. Relational License Matching
    const matchedLicenses = (tenant.activeLicenses || []).filter((lic) =>
      targetedLicenses.includes(lic)
    );

    // 3. Relational Payment Rail Matching
    const matchedRails = (tenant.activeRails || []).filter((rail) =>
      affectedRails.includes(rail)
    );

    const isApplicable = matchedLicenses.length > 0 || matchedRails.length > 0;

    // 4. Generate Plain-English Explanation with exact references (Task 11.2)
    const richTenant = tenant as RichTenantProfileContext;
    const reason = ApplicabilityEngine.buildExplanationReason(
      isApplicable,
      matchedLicenses,
      matchedRails,
      richTenant.licenses,
      richTenant.paymentRails
    );

    return {
      isApplicable,
      reason,
      matchedLicenses,
      matchedRails,
    };
  }

  public evaluateApplicability(
    tenant: TenantProfileContext | RichTenantProfileContext,
    circular: CircularTargetingContext
  ): ApplicabilityResult {
    return ApplicabilityEngine.evaluatePure(tenant, circular);
  }

  /**
   * Builds high-clarity human-readable explanation referencing exact licenses & rails
   */
  private static buildExplanationReason(
    isApplicable: boolean,
    matchedLicenses: LicenseType[],
    matchedRails: PaymentRail[],
    tenantLicenses?: RichTenantLicense[],
    tenantRails?: RichTenantPaymentRail[]
  ): string {
    if (!isApplicable) {
      return 'Not applicable to your current operating licenses or payment rails.';
    }

    // Format licenses with official license numbers if available
    const formattedLicenses = matchedLicenses.map((lic) => {
      const match = tenantLicenses?.find((l) => l.licenseType === lic && l.licenseNumber);
      return match?.licenseNumber ? `${lic} (${match.licenseNumber})` : lic;
    });

    const formattedRails = matchedRails.map((rail) => {
      return rail.replace(/_/g, ' ');
    });

    if (matchedLicenses.length > 0 && matchedRails.length > 0) {
      return `Directly impacts your organization because you hold: [ ${formattedLicenses.join(
        ', '
      )} ] operating [ ${formattedRails.join(', ')} ] rails.`;
    }

    if (matchedLicenses.length > 0) {
      return `Directly impacts your operating license profile: [ ${formattedLicenses.join(', ')} ].`;
    }

    return `Directly impacts your operational payment rails: [ ${formattedRails.join(', ')} ].`;
  }

  /**
   * Fetches active licenses and rails for an organization from Supabase
   */
  public async fetchTenantProfile(
    organizationId: string
  ): Promise<RichTenantProfileContext | null> {
    if (!this.dbClient) return null;

    try {
      const client = this.dbClient;

      // 1. Fetch organization details
      const { data: orgData } = await client
        .from('organizations')
        .select('id, name')
        .eq('id', organizationId)
        .single();

      // 2. Fetch tenant licenses
      const { data: licensesData } = await client
        .from('tenant_licenses')
        .select('license_type, license_number, issuing_regulator, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // 3. Fetch tenant payment rails
      const { data: railsData } = await client
        .from('tenant_payment_rails')
        .select('rail_type, integration_status, settlement_bank_code, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      const licenses: RichTenantLicense[] = (licensesData || []).map((l) => ({
        licenseType: l.license_type,
        licenseNumber: l.license_number,
        issuingRegulator: l.issuing_regulator,
        isActive: l.is_active,
      }));

      const paymentRails: RichTenantPaymentRail[] = (railsData || []).map((r) => ({
        railType: r.rail_type,
        integrationStatus: r.integration_status,
        settlementBankCode: r.settlement_bank_code,
        isActive: r.is_active,
      }));

      return {
        organizationId,
        organizationName: orgData?.name || 'FinTech Organization',
        activeLicenses: licenses.map((l) => l.licenseType),
        activeRails: paymentRails.map((r) => r.railType),
        licenses,
        paymentRails,
      };
    } catch (err) {
      logger.warn({ err, organizationId }, 'Failed to fetch tenant profile from database');
      return null;
    }
  }

  /**
   * Evaluates and records applicability in `radar_tenant_impacts`
   */
  public async evaluateAndPersist(
    organizationId: string,
    circularId: string,
    circularTargeting: CircularTargetingContext
  ): Promise<ApplicabilityResult | null> {
    const profile = await this.fetchTenantProfile(organizationId);
    if (!profile) return null;

    const result = this.evaluateApplicability(profile, circularTargeting);

    if (this.dbClient) {
      try {
        const client = this.dbClient;
        await client.from('radar_tenant_impacts').upsert(
          {
            organization_id: organizationId,
            circular_id: circularId,
            is_applicable: result.isApplicable,
            applicability_reason: result.reason,
            executive_brief_cco: 'Pending synthesis',
            action_brief_coo: 'Pending synthesis',
            technical_brief_product_eng: 'Pending synthesis',
            financial_brief_cfo: 'Pending synthesis',
            status: result.isApplicable ? 'APPLICABLE' : 'FILTERED_OUT',
          },
          { onConflict: 'organization_id,circular_id' }
        );
      } catch (dbErr) {
        logger.warn({ dbErr }, 'Failed to upsert radar_tenant_impacts');
      }
    }

    return result;
  }
}

export function evaluateCircularApplicability(
  tenant: TenantProfileContext | RichTenantProfileContext,
  circular: CircularTargetingContext
): ApplicabilityResult {
  return ApplicabilityEngine.evaluatePure(tenant, circular);
}
