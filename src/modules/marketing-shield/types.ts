import { MarketingChannel, ProductCategoryCode } from '@/shared/types';

export type CampaignLifecycleStatus = 'Draft' | 'Review' | 'Revision' | 'Approved';
export type ClaimVerdict = 'COMPLIANT' | 'WARNING' | 'BLOCKING_ISSUE';
export type ClaimReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EpistemicTier = 'VERIFIED_STATUTORY_CITATION' | 'UNMAPPED_COMPLIANCE_ADVISORY';

export interface StructuredFinding {
  id: string;
  claimElement: string;
  regulatoryRule: string;
  statutoryCitation: string;
  severity: ClaimVerdict;
  complianceGap: string;
  requiredFix: string;
  suggestedRewrite: string;
  epistemicTier?: EpistemicTier;
  matchedRuleId?: string | null;
  instrumentTitle?: string;
  sectionRef?: string;
  verbatimStatutoryQuote?: string;
  sourceUrlOrPdfPath?: string;
  regulatorCode?: string;
}

export interface MarketingCampaign {
  id: string;
  organizationId: string;
  title: string;
  status: CampaignLifecycleStatus;
  productCategory: ProductCategoryCode;
  channel: MarketingChannel;
  canvasContent: string;
  attachedAssetUrl?: string | null;
  attachedAssetType?: 'IMAGE' | 'PDF' | 'URL' | null;
  createdBy: string;
  assignedReviewer: string;
  riskSummary?: string | null;
  totalFindings: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignChatMessage {
  id: string;
  campaignId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  structuredFindingsJson: StructuredFinding[];
  createdAt: string;
}

export interface ExtractedPromotionalClaim {
  id: string;
  campaignId: string;
  organizationId: string;
  code: string;
  claimText: string;
  verdict: ClaimVerdict;
  epistemicTier?: EpistemicTier;
  regulationId?: string | null;
  matchedRuleId?: string | null;
  instrumentTitle?: string;
  sectionRef?: string;
  statutoryCitation: string;
  verbatimRule: string;
  sourceUrlOrPdfPath?: string;
  regulatorCode?: string;
  aiRationale: string;
  suggestedRewrite?: string | null;
  reviewStatus: ClaimReviewStatus;
  createdAt: string;
  updatedAt: string;
  campaignTitle?: string;
}

export interface MarketingKnowledgeRule {
  id: string;
  organizationId: string;
  ruleCode: string;
  title: string;
  regulatorCode: string;
  regulationId?: string | null;
  obligationId?: string | null;
  instrumentTitle?: string;
  sectionOrClauseRef?: string;
  statutoryCitation: string;
  verbatimStatutoryText?: string;
  verbatimClause: string;
  sourceUrlOrPdfPath?: string;
  prohibitedTerms: string[];
  mandatoryDisclosures: string[];
  appliesToCategories: ProductCategoryCode[];
  appliesToChannels: MarketingChannel[];
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategoryMetadata {
  code: ProductCategoryCode;
  label: string;
  regulator: string;
  statutoryBasis: string;
  description: string;
}

export const PRODUCT_CATEGORIES_CATALOG: Record<ProductCategoryCode, ProductCategoryMetadata> = {
  DIGITAL_NANO_LOAN: {
    code: 'DIGITAL_NANO_LOAN',
    label: 'Digital Nano-Loan',
    regulator: 'FCCPC / CBN',
    statutoryBasis: 'FCCPC Digital Lending Guidelines 2022 & CBN CPF 2019',
    description: 'Short-term digital credit, BNPL, and retail nano-advances.',
  },
  PAYMENTS_WALLET: {
    code: 'PAYMENTS_WALLET',
    label: 'Payments & Digital Wallet',
    regulator: 'CBN PSMD',
    statutoryBasis: 'CBN Regulatory Framework for Mobile Money & Payment Service Banks',
    description: 'Stored-value wallets, contactless payments, QR, and peer-to-peer transfers.',
  },
  REMITTANCE_FX: {
    code: 'REMITTANCE_FX',
    label: 'Remittance & FX',
    regulator: 'CBN IMTO',
    statutoryBasis: 'CBN Guidelines for International Money Transfer Operators (IMTO) 2024',
    description: 'Cross-border remittances, diaspora inflows, and currency transfers.',
  },
  WEALTHTECH_INVEST: {
    code: 'WEALTHTECH_INVEST',
    label: 'WealthTech & Investment',
    regulator: 'SEC',
    statutoryBasis: 'SEC Consolidated Rules 2013 (Rule 39(b)) & Investments and Securities Act (ISA) 2007',
    description: 'Collective investment schemes, portfolio management, commercial papers, and digital securities.',
  },
  SAVINGS_DEPOSIT: {
    code: 'SAVINGS_DEPOSIT',
    label: 'Savings & Vault Deposit',
    regulator: 'CBN / NDIC',
    statutoryBasis: 'NDIC Act 2023 & BOFIA 2020 Deposit Insurance Protections',
    description: 'Fixed term deposits, automated target savings, and liquidity vaults.',
  },
};
