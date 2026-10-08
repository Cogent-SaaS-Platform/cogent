/**
 * Cogent Enterprise Paystack API Client
 * Production-ready client for subscription initialization, customer creation,
 * and transaction verification.
 * Adheres strictly to docs/launch/PHASE_A4_BILLING_SUBSCRIPTIONS.md
 */

import { logger } from '@/shared/logger';
import { ConfigurationError, AppError } from '@/shared/errors';
import {
  PaystackInitParams,
  PaystackInitResponse,
  PaystackVerifyResponse,
  SubscriptionTier,
  PlanMetadata,
} from '@/shared/types';

export const COGENT_PLANS: Record<SubscriptionTier, PlanMetadata> = {
  STARTER: {
    tier: 'STARTER',
    name: 'Cogent Starter Tier',
    badge: 'Seed & Early Fintechs',
    description: 'Essential marketing pre-vetting and single-license regulatory radar monitoring.',
    paystackPlanCodeMonthly: process.env.PAYSTACK_PLAN_STARTER_MONTHLY || 'PLN_cogent_starter_monthly',
    paystackPlanCodeAnnual: process.env.PAYSTACK_PLAN_STARTER_ANNUAL || 'PLN_cogent_starter_annual',
    pricing: {
      usdMonthly: 199,
      usdAnnual: 1990,
      ngnMonthlyKobo: 30000000, // ₦300,000.00
      ngnAnnualKobo: 300000000, // ₦3,000,000.00
      ngnMonthlyFormatted: '₦300,000',
      ngnAnnualFormatted: '₦3,000,000',
    },
    limits: {
      teamSeats: 3,
      marketingScansPerMonth: 50,
      aiRewritesPerMonth: 25,
      policyDocuments: 3,
      arconDossierType: 'STANDARD_PDF',
      regulatoryRadarCoverage: 'SINGLE_LICENSE',
      cascadeTriggers: 'SINGLE_RULE',
      auditRetentionDays: 90,
      remediationDrafting: 'FIVE_CLAUSES',
    },
    features: [
      'Up to 50 marketing pre-vetting scans / month',
      '25 AI conversion-preserving statutory rewrites',
      'ARCON Standard Pre-Clearance PDF Dossier',
      'Regulatory Radar for 1 core license profile',
      'Up to 3 policy documents analyzed in Gap Matrix',
      'Up to 3 team members with role-based access',
      '90-day cryptographic audit log retention',
      'Standard email support (48h SLA)',
    ],
  },
  PRO: {
    tier: 'PRO',
    name: 'Cogent Pro Tier',
    badge: 'MFBs, PSSPs & Growth Scale',
    description: 'Unlimited marketing scans, multi-role executive briefs, and real-time circular cascade.',
    paystackPlanCodeMonthly: process.env.PAYSTACK_PLAN_PRO_MONTHLY || 'PLN_cogent_pro_monthly',
    paystackPlanCodeAnnual: process.env.PAYSTACK_PLAN_PRO_ANNUAL || 'PLN_cogent_pro_annual',
    pricing: {
      usdMonthly: 549,
      usdAnnual: 5490,
      ngnMonthlyKobo: 85000000, // ₦850,000.00
      ngnAnnualKobo: 850000000, // ₦8,500,000.00
      ngnMonthlyFormatted: '₦850,000',
      ngnAnnualFormatted: '₦8,500,000',
    },
    limits: {
      teamSeats: 10,
      marketingScansPerMonth: -1, // Unlimited
      aiRewritesPerMonth: -1, // Unlimited
      policyDocuments: 15,
      arconDossierType: 'FULL_CRYPTOGRAPHIC_BUNDLE',
      regulatoryRadarCoverage: 'ALL_NIGERIAN_LICENSES',
      cascadeTriggers: 'REAL_TIME_AUTOMATIC',
      auditRetentionDays: 365,
      remediationDrafting: 'UNLIMITED',
    },
    features: [
      'Unlimited marketing pre-vetting scans',
      'Unlimited AI compliant rewrites',
      'Full cryptographic ARCON pre-clearance ZIP bundles',
      'Comprehensive Radar across all Nigerian financial regulators',
      'Executive briefs for CCO, COO, CFO & Engineering leads',
      'Real-time automated compliance cascade alerts',
      'Up to 15 corporate policies in 5-W Gap Matrix',
      'Unlimited clause remediation drafting',
      'Up to 10 team members with granular RBAC',
      '1-year tamper-evident audit log retention',
      'Priority support (12h SLA)',
    ],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Cogent Enterprise Tier',
    badge: 'Commercial Banks & Super-Fintechs',
    description: 'Unlimited institutional defense, bespoke statutory baselines, and dedicated legal SLA.',
    paystackPlanCodeMonthly: process.env.PAYSTACK_PLAN_ENTERPRISE_MONTHLY || 'PLN_cogent_enterprise_monthly',
    paystackPlanCodeAnnual: process.env.PAYSTACK_PLAN_ENTERPRISE_ANNUAL || 'PLN_cogent_enterprise_annual',
    pricing: {
      usdMonthly: 1999,
      usdAnnual: 19990,
      ngnMonthlyKobo: 300000000, // ₦3,000,000.00
      ngnAnnualKobo: 3000000000, // ₦30,000,000.00
      ngnMonthlyFormatted: '₦3,000,000',
      ngnAnnualFormatted: '₦30,000,000',
    },
    limits: {
      teamSeats: -1, // Unlimited
      marketingScansPerMonth: -1,
      aiRewritesPerMonth: -1,
      policyDocuments: -1,
      arconDossierType: 'FULL_CRYPTOGRAPHIC_BUNDLE',
      regulatoryRadarCoverage: 'MULTI_JURISDICTION',
      cascadeTriggers: 'REAL_TIME_CUSTOM_WEBHOOKS',
      auditRetentionDays: 2555, // 7-year BOFIA standard
      remediationDrafting: 'UNLIMITED_CUSTOM',
    },
    features: [
      'Unlimited usage across all 3 Cogent Pillars',
      'Unlimited corporate policy uploads & Gap Matrix assessments',
      'Bank Examiner Audit Defense Pack with SHA-256 evidence chain',
      'Multi-entity & holding company license architectures',
      'Custom statutory baseline ingestion and bespoke rules',
      'Custom webhook integration for existing GRC / SIEM tools',
      '7-year BOFIA 2020 compliant audit log retention',
      'Unlimited user seats with Enterprise SAML / SSO',
      'Dedicated compliance engineer & <2h executive SLA',
    ],
  },
};

export class PaystackClient {
  private secretKeyOverride?: string;
  private readonly baseUrl: string = 'https://api.paystack.co';

  constructor(secretKey?: string) {
    if (secretKey) {
      this.secretKeyOverride = secretKey;
    }
  }

  private getSecretKey(): string {
    const key = this.secretKeyOverride || process.env.PAYSTACK_SECRET_KEY || '';
    if (!key && process.env.NODE_ENV === 'production') {
      throw new ConfigurationError('PAYSTACK_SECRET_KEY is mandatory in production environment');
    }
    return key;
  }


  /**
   * Initializes a subscription payment session with Paystack.
   * Returns authorization_url to redirect the user to Paystack Checkout.
   */
  public async initializeSubscription(params: PaystackInitParams): Promise<PaystackInitResponse> {
    const correlationId = `paystack_init_${Date.now()}_${params.metadata.organizationId}`;
    logger.info(
      {
        correlationId,
        email: params.email,
        amountInKobo: params.amountInKobo,
        planCode: params.planCode,
        organizationId: params.metadata.organizationId,
        tier: params.metadata.tier,
      },
      'Initializing Paystack subscription checkout'
    );

    try {
      const payload: Record<string, unknown> = {
        email: params.email,
        amount: params.amountInKobo,
        callback_url: params.callbackUrl,
        metadata: {
          ...params.metadata,
          correlationId,
          source: 'cogent_billing_engine',
        },
      };

      if (params.planCode) {
        payload.plan = params.planCode;
      }

      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getSecretKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(
          { status: response.status, errorBody, correlationId },
          'Paystack transaction initialization HTTP error'
        );
        throw new AppError({
          message: `Paystack initialization failed with HTTP ${response.status}`,
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 502,
          details: { errorBody, status: response.status },
        });
      }

      const data: PaystackInitResponse = await response.json();

      if (!data.status) {
        logger.error({ data, correlationId }, 'Paystack returned failure status on initialization');
        throw new AppError({
          message: data.message || 'Paystack initialization failed',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 400,
        });
      }

      logger.info(
        { correlationId, reference: data.data.reference },
        'Paystack checkout session successfully generated'
      );

      return data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(
        { error: error.message, stack: error.stack, correlationId },
        'Uncaught error during Paystack subscription initialization'
      );
      throw error;
    }
  }

  /**
   * Cryptographically verifies a completed transaction reference directly against Paystack.
   */
  public async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    logger.info({ reference }, 'Verifying Paystack transaction reference');

    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.getSecretKey()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(
          { status: response.status, errorBody, reference },
          'Paystack transaction verification HTTP error'
        );
        throw new AppError({
          message: `Paystack verification failed with HTTP ${response.status}`,
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 502,
          details: { reference, errorBody },
        });
      }

      const data: PaystackVerifyResponse = await response.json();
      return data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({ error: error.message, reference }, 'Paystack transaction verification error');
      throw error;
    }
  }

  /**
   * Retrieves subscription details by subscription code.
   */
  public async fetchSubscription(subscriptionCode: string): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscription/${encodeURIComponent(subscriptionCode)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.getSecretKey()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new AppError({
          message: `Paystack fetch subscription failed with HTTP ${response.status}`,
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 502,
          details: { subscriptionCode, errorBody },
        });
      }

      const result = (await response.json()) as Record<string, unknown>;
      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(
        { error: error.message, subscriptionCode },
        'Failed to fetch Paystack subscription details'
      );
      throw error;
    }
  }

  /**
   * Disables an active recurring subscription.
   */
  public async disableSubscription(params: {
    code: string;
    token: string;
  }): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/subscription/disable`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getSecretKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new AppError({
          message: `Paystack disable subscription failed with HTTP ${response.status}`,
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 502,
          details: { params, errorBody },
        });
      }

      const result = (await response.json()) as Record<string, unknown>;
      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(
        { error: error.message, subscriptionCode: params.code },
        'Failed to disable Paystack subscription'
      );
      throw error;
    }
  }

  /**
   * Resolves plan configuration and billing metadata for a given tier.
   */
  public getPlanMetadata(tier: SubscriptionTier): PlanMetadata {
    const plan = COGENT_PLANS[tier];
    if (!plan) {
      throw new AppError({
        message: `Unknown subscription tier: ${tier}`,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }
    return plan;
  }
}

export const paystackClient = new PaystackClient();
