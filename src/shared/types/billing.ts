/**
 * Cogent Billing & Paystack Subscription Types
 * Fully aligned with docs/launch/PHASE_A4_BILLING_SUBSCRIPTIONS.md
 */

export type SubscriptionTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export interface TenantSubscriptionRow {
  id: string;
  organization_id: string;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  paystack_plan_code: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  marketing_scan_quota: number;
  policy_document_quota: number;
  created_at: string;
  updated_at: string;
}

export interface BillingEventRow {
  id: string;
  event_id: string;
  event_type: string;
  organization_id: string | null;
  payload: Record<string, unknown>;
  processed_at: string;
}

export interface TenantSubscriptionSummary {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isActive: boolean;
  isInGracePeriod: boolean;
  isReadOnly: boolean;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  currentPeriodEnd: string | null;
  marketingScanQuota: number;
  policyDocumentQuota: number;
  paystackSubscriptionCode: string | null;
  paystackPlanCode: string | null;
}

export interface PlanPricing {
  usdMonthly: number;
  usdAnnual: number;
  ngnMonthlyKobo: number;
  ngnAnnualKobo: number;
  ngnMonthlyFormatted: string;
  ngnAnnualFormatted: string;
}

export interface PlanLimits {
  teamSeats: number; // -1 for unlimited
  marketingScansPerMonth: number; // -1 for unlimited
  aiRewritesPerMonth: number; // -1 for unlimited
  policyDocuments: number; // -1 for unlimited
  arconDossierType: 'WATERMARKED_PDF' | 'STANDARD_PDF' | 'FULL_CRYPTOGRAPHIC_BUNDLE';
  regulatoryRadarCoverage: 'TRIAL' | 'SINGLE_LICENSE' | 'ALL_NIGERIAN_LICENSES' | 'MULTI_JURISDICTION';
  cascadeTriggers: 'PREVIEW' | 'SINGLE_RULE' | 'REAL_TIME_AUTOMATIC' | 'REAL_TIME_CUSTOM_WEBHOOKS';
  auditRetentionDays: number;
  remediationDrafting: 'PREVIEW' | 'FIVE_CLAUSES' | 'UNLIMITED' | 'UNLIMITED_CUSTOM';
}

export interface PlanMetadata {
  tier: SubscriptionTier;
  name: string;
  badge: string;
  description: string;
  paystackPlanCodeMonthly: string;
  paystackPlanCodeAnnual: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: string[];
}

export interface PaystackInitParams {
  email: string;
  amountInKobo: number;
  planCode?: string;
  callbackUrl: string;
  metadata: {
    organizationId: string;
    userId: string;
    tier: SubscriptionTier;
    billingInterval?: 'monthly' | 'annual';
    [key: string]: unknown;
  };
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      organizationId?: string;
      userId?: string;
      tier?: SubscriptionTier;
      [key: string]: unknown;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
    };
    plan: {
      id: number;
      name: string;
      plan_code: string;
      description: string | null;
      amount: number;
      interval: string;
      send_invoices: boolean;
      currency: string;
    } | null;
    subscription_code?: string;
    authorization?: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bin: string;
      bank: string;
      channel: string;
      signature: string;
      reusable: boolean;
      country_code: string;
      account_name: string | null;
    };
  };
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id?: number;
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    paid_at?: string;
    created_at?: string;
    subscription_code?: string;
    plan?: {
      plan_code: string;
      name?: string;
      amount?: number;
      interval?: string;
    };
    customer?: {
      id?: number;
      customer_code?: string;
      email?: string;
    };
    metadata?: {
      organizationId?: string;
      userId?: string;
      tier?: SubscriptionTier;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}
