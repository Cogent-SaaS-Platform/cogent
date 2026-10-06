import { describe, it, expect } from 'vitest';
import {
  evaluateCircularApplicability,
  RichTenantProfileContext,
  ApplicabilityEngine
} from '@/modules/radar/services/applicabilityEngine';
import { CircularTargetingContext, TenantProfileContext } from '@/modules/radar/types';

describe('Epic 11: Relational Tenant Applicability Engine (Task 11.1 & 11.2)', () => {
  it('identifies applicable circular when tenant holds matched operating license', () => {
    const tenant: TenantProfileContext = {
      organizationId: 'org-fintech-1',
      activeLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
      activeRails: ['INTERSWITCH_WEBPAY'],
    };

    const circular: CircularTargetingContext = {
      regulator: 'CBN',
      targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'SWITCHING_AND_PROCESSING'],
      affectedRails: ['NIBSS_NIP'],
      appliesUniversally: false,
    };

    const result = evaluateCircularApplicability(tenant, circular);

    expect(result.isApplicable).toBe(true);
    expect(result.matchedLicenses).toContain('PAYMENT_SOLUTION_SERVICES_PSSP');
    expect(result.matchedRails).toHaveLength(0);
    expect(result.reason).toContain('Directly impacts your operating license profile');
    expect(result.reason).toContain('PAYMENT_SOLUTION_SERVICES_PSSP');
  });

  it('identifies applicable circular when tenant operates matched payment rail', () => {
    const tenant: TenantProfileContext = {
      organizationId: 'org-fintech-2',
      activeLicenses: ['FINANCE_COMPANY'],
      activeRails: ['NIBSS_NIP', 'DIRECT_DEBIT_ACH'],
    };

    const circular: CircularTargetingContext = {
      regulator: 'CBN',
      targetedLicenses: ['COMMERCIAL_BANK'],
      affectedRails: ['NIBSS_NIP'],
      appliesUniversally: false,
    };

    const result = evaluateCircularApplicability(tenant, circular);

    expect(result.isApplicable).toBe(true);
    expect(result.matchedLicenses).toHaveLength(0);
    expect(result.matchedRails).toContain('NIBSS_NIP');
    expect(result.reason).toContain('Directly impacts your operational payment rails');
    expect(result.reason).toContain('NIBSS NIP');
  });

  it('generates rich explanation with license numbers when both licenses and rails match', () => {
    const richTenant: RichTenantProfileContext = {
      organizationId: 'org-fintech-3',
      organizationName: 'PayApex Technologies Ltd',
      activeLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'MOBILE_MONEY_OPERATOR_MMO'],
      activeRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
      licenses: [
        {
          licenseType: 'PAYMENT_SOLUTION_SERVICES_PSSP',
          licenseNumber: 'CBN/PSD/PSSP/2023/044',
          isActive: true,
        },
      ],
      paymentRails: [
        {
          railType: 'CARD_ACQUIRING_MASTERCARD_VISA',
          isActive: true,
        },
      ],
    };

    const circular: CircularTargetingContext = {
      regulator: 'CBN',
      targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
      affectedRails: ['CARD_ACQUIRING_MASTERCARD_VISA'],
      appliesUniversally: false,
    };

    const result = evaluateCircularApplicability(richTenant, circular);

    expect(result.isApplicable).toBe(true);
    expect(result.matchedLicenses).toContain('PAYMENT_SOLUTION_SERVICES_PSSP');
    expect(result.matchedRails).toContain('CARD_ACQUIRING_MASTERCARD_VISA');
    expect(result.reason).toContain('CBN/PSD/PSSP/2023/044');
    expect(result.reason).toContain('CARD ACQUIRING MASTERCARD VISA');
  });

  it('correctly filters out non-applicable circulars to eliminate noise', () => {
    const tenant: TenantProfileContext = {
      organizationId: 'org-lender-1',
      activeLicenses: ['DIGITAL_LENDER_FCCPC_REGISTERED'],
      activeRails: ['PAYSTACK'],
    };

    const circular: CircularTargetingContext = {
      regulator: 'SEC',
      targetedLicenses: ['CRYPTO_VASP_SEC_APPROVED', 'SEC_REGISTERED_DIGITAL_SUB_BROKER'],
      affectedRails: ['NIBSS_CENTRAL_PAY'],
      appliesUniversally: false,
    };

    const result = evaluateCircularApplicability(tenant, circular);

    expect(result.isApplicable).toBe(false);
    expect(result.matchedLicenses).toHaveLength(0);
    expect(result.matchedRails).toHaveLength(0);
    expect(result.reason).toBe('Not applicable to your current operating licenses or payment rails.');
  });

  it('marks universal circulars as applicable to all entities', () => {
    const tenant: TenantProfileContext = {
      organizationId: 'org-mmo-1',
      activeLicenses: ['MOBILE_MONEY_OPERATOR_MMO'],
      activeRails: ['USSD'],
    };

    const circular: CircularTargetingContext = {
      regulator: 'CBN',
      targetedLicenses: [],
      affectedRails: [],
      appliesUniversally: true,
    };

    const result = evaluateCircularApplicability(tenant, circular);

    expect(result.isApplicable).toBe(true);
    expect(result.reason).toContain('Universal statutory mandate applying to all regulated financial entities');
  });
});
