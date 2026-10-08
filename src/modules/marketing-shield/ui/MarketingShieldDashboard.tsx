'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MarketingShieldViewModel,
  FindingPresentationCard,
} from '@/shared/types/presentation';
import {
  MarketingChannel,
  PlatformPillar,
  CrossPillarLinkContext,
  ProductCategoryCode,
  PRODUCT_CATEGORY_CODES,
} from '@/shared/types';
import { VerdictBanner } from './VerdictBanner';
import { ExecutiveSummaryCard } from './ExecutiveSummaryCard';
import { SplitViewComparison } from './SplitViewComparison';
import { CampaignCopyEditor } from './CampaignCopyEditor';
import { FindingsList } from './FindingsList';
import { ContextualInspector } from './ContextualInspector';
import { ActionChecklist } from './ActionChecklist';
import {
  CcoGovernanceBlock,
  CcoSignoffRecord,
  SignatoryProfile,
} from './CcoGovernanceBlock';
import { ClaimsLedgerTab } from './ClaimsLedgerTab';
import { DriftWatcherTab } from './DriftWatcherTab';
import { DenseDataTable, TableColumn } from '@/shared/ui/inspector/DenseDataTable';
import { MultiPaneContainer } from '@/shared/ui/inspector/MultiPaneContainer';
import { useInspectorStore } from '@/shared/ui/inspector/inspectorStore';
import { findingToInspectorItem } from '@/shared/ui/inspector/adapters';
import { InspectorItemData, StatutoryReferenceData } from '@/shared/ui/inspector/types';
import {
  Scale,
  Sparkles,
  RefreshCw,
  Play,
  FileText,
  Sliders,
  ChevronRight,
  BookOpen,
  Layers,
  ArrowRightLeft,
  CheckSquare,
  AlertTriangle,
  Info,
  Clock,
  Download,
  Building,
  Terminal,
  Printer,
  ChevronDown,
  Activity,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Plus,
  ExternalLink,
  Edit3,
} from 'lucide-react';

// Preset Scenarios for instant evaluation and demonstration
const PRESET_SCENARIOS = [
  {
    id: 'scenario_a',
    name: 'QuickKash SMS Flash (Digital Lending Violations)',
    channel: 'SMS_BLAST' as MarketingChannel,
    productCategory: 'DIGITAL_NANO_LOAN' as ProductCategoryCode,
    copy: 'Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins directly to your account! Zero interest, 100% guaranteed approval, no collateral, no credit checks. Download QuickKash app now!',
    description: 'Triggers ARCON Art. 24, FCCPC Digital Lending Sec 5, and CBN CPF APR mandatory disclosures.',
  },
  {
    id: 'scenario_b',
    name: 'PrimeYield High-Yield Wealth Ad (Prohibited Promises)',
    channel: 'SOCIAL_MEDIA_POST' as MarketingChannel,
    productCategory: 'WEALTHTECH_INVEST' as ProductCategoryCode,
    copy: 'Tired of inflation? Invest your Naira in PrimeYield and earn 35% risk-free annual return guaranteed! Your capital is 100% safe and backed by the government. Limited slots available.',
    description: 'Triggers SEC Rule 322 (Unregistered guaranteed returns) and ARCON deceptive claims.',
  },
  {
    id: 'scenario_c',
    name: 'KoraPay Compliant Cross-Border Promo (Clean Baseline)',
    channel: 'SOCIAL_MEDIA_POST' as MarketingChannel,
    productCategory: 'REMITTANCE_FX' as ProductCategoryCode,
    copy: 'Send money home to Nigeria with KoraPay. Licensed by the Central Bank of Nigeria (CBN) as an International Money Transfer Operator. Transparent exchange rates and zero hidden charges. Terms and statutory fees apply. Visit korapay.ng/terms.',
    description: 'Fully compliant baseline with statutory license disclosure and terms link.',
  },
];

// Scenario A ViewModel
const SCENARIO_A_VIEW_MODEL: MarketingShieldViewModel = {
  scanId: '00000000-0000-0000-0000-000000000001',
  productCategory: 'DIGITAL_NANO_LOAN',
  title: 'QuickKash SMS Flash Campaign Pre-Vetting Report',
  verdict: 'BLOCKING_ISSUE',
  overallRiskScore: 94,
  deterministicPenaltyTotalNaira: 11500000,
  executiveSummary:
    'The submitted copy for "QuickKash SMS Flash Campaign" contains critical statutory violations under Nigerian advertising and consumer protection regulations. Direct prohibited promises ("zero interest", "100% guaranteed approval", "no credit checks") and missing mandatory APR disclosures generate an aggregate deterministic fine exposure of ₦11,500,000. Immediate copy revision is mandatory prior to dissemination across SMS_BLAST.',
  findings: [
    {
      id: 'fnd_1',
      ruleCode: 'ARCON-2022-CODE-ART24',
      regulatorCode: 'ARCON',
      severity: 'CRITICAL',
      findingType: 'DETERMINISTIC_MATCH',
      flaggedExcerpt: '100% guaranteed approval',
      whyItMatters:
        'Advertising a guaranteed credit or loan approval is strictly prohibited under ARCON Code 2022 Article 24 and FCCPC Consumer Protection Guidelines. Financial underwriting must evaluate creditworthiness.',
      statutoryCitation:
        'ARCON Code 2022 Article 24(1)(b) - Deceptive Credit Advertisements: "No advertisement for financial services shall represent or imply that credit approval or loan disbursement is guaranteed without regard to customer eligibility or statutory underwriting standards."',
      statutoryPenaltyNaira: 5000000,
      recommendedAction: 'Adopt compliant rewrite specifying credit underwriting criteria.',
      mandatoryDisclosureRequired: 'Subject to underwriting verification and credit criteria.',
    },
    {
      id: 'fnd_2',
      ruleCode: 'CBN-CPF-2019-S5-DISCLOSURE',
      regulatorCode: 'CBN',
      severity: 'CRITICAL',
      findingType: 'DETERMINISTIC_MATCH',
      flaggedExcerpt: 'Zero interest',
      whyItMatters:
        'Promoting financial loans with "Zero interest" without disclosing the Annual Percentage Rate (APR) and associated administrative fees violates the CBN Consumer Protection Framework 2019 Section 5.2.',
      statutoryCitation:
        'CBN Consumer Protection Framework 2019 Section 5.2.1 - Transparency in Credit Pricing: "Financial institutions shall disclose the Annual Percentage Rate (APR) and the Total Cost of Credit in all promotional materials offering consumer lending products."',
      statutoryPenaltyNaira: 2500000,
      recommendedAction: 'Include explicit APR range (e.g. 18%-32%) and total cost of credit statement.',
      mandatoryDisclosureRequired: 'APR ranges from 18% to 32% per annum. Terms and conditions apply.',
    },
    {
      id: 'fnd_3',
      ruleCode: 'FCCPC-DLG-2022-S5-COLLATERAL',
      regulatorCode: 'FCCPC',
      severity: 'HIGH',
      findingType: 'DETERMINISTIC_MATCH',
      flaggedExcerpt: 'no credit checks',
      whyItMatters:
        'Representing that a loan product requires "no credit checks" undermines consumer credit reporting obligations established by the Credit Reporting Act 2017 and FCCPC Digital Lending Guidelines 2022.',
      statutoryCitation:
        'FCCPC Limited Interim Regulatory Framework for Digital Lending 2022 Section 5(3) - Transparent Underwriting Representations: "Digital lenders shall not advertise or state that consumer loans are extended without credit bureau verification or borrower creditworthiness assessment."',
      statutoryPenaltyNaira: 4000000,
      recommendedAction: 'Clarify that credit bureau evaluation applies.',
      mandatoryDisclosureRequired: 'Credit history verified via licensed Credit Bureaus.',
    },
  ],
  actions: [
    {
      id: 'act_1',
      title: 'Adopt Verified Compliant Rewrite',
      description: 'Replace promotional copy with pre-cleared text incorporating mandatory APR disclosure.',
      priority: 'CRITICAL',
      ownerDepartment: 'Marketing',
      suggestedDeadlineDays: 1,
      completed: false,
    },
    {
      id: 'act_2',
      title: 'Submit ARCON ASP Pre-Clearance Application',
      description: 'Prepare Form ARCON-01 with verified compliant draft for Advertising Standards Panel vetting.',
      priority: 'HIGH',
      ownerDepartment: 'Compliance',
      suggestedDeadlineDays: 3,
      completed: false,
    },
    {
      id: 'act_3',
      title: 'Execute CCO Sign-Off & Attestation',
      description: 'Review reconciled scan findings and execute formal compliance clearance.',
      priority: 'CRITICAL',
      ownerDepartment: 'Legal',
      suggestedDeadlineDays: 2,
      completed: false,
    },
  ],
  humanReviewState: {
    status: 'PENDING_REVIEW',
    canApprove: true,
  },
  telemetry: {
    latencyMs: 342,
    modelIdentifier: 'gemini-2.5-flash (Deterministic Engine)',
    verifiedAt: new Date().toISOString(),
    auditHash: '7f9c2d1b8e4a5f6e3c2b1a0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f',
  },
  channel: 'SMS_BLAST',
  originalCopy:
    'Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins directly to your account! Zero interest, 100% guaranteed approval, no collateral, no credit checks. Download QuickKash app now!',
  compliantRewrite:
    'Need urgent funds? Apply for up to ₦250,000 with QuickKash. Subject to credit assessment and underwriting approval. Interest rates from 2.5% monthly (APR 30%). Download the app to check your eligibility. QuickKash is licensed by FCCPC. T&Cs apply.',
  arconPreclearanceRequired: true,
  activeLicenseProfiles: ['FCCPC_DIGITAL_LENDER', 'CBN_FINANCE_COMPANY'],
};

// Scenario B ViewModel
const SCENARIO_B_VIEW_MODEL: MarketingShieldViewModel = {
  scanId: '00000000-0000-0000-0000-000000000002',
  productCategory: 'WEALTHTECH_INVEST',
  title: 'PrimeYield High-Yield Wealth Ad Pre-Vetting Report',
  verdict: 'BLOCKING_ISSUE',
  overallRiskScore: 88,
  deterministicPenaltyTotalNaira: 7500000,
  executiveSummary:
    'The submitted copy for "PrimeYield High-Yield Wealth Ad" contains serious statutory infractions under SEC Rule 322 and ARCON deceptive claims provisions. Promising a "35% risk-free annual return guaranteed" and asserting capital is "100% safe and backed by the government" are strictly prohibited in Nigerian capital markets and advertising law.',
  findings: [
    {
      id: 'fnd_sec_1',
      ruleCode: 'SEC-RULE-322-GUARANTEED-YIELDS',
      regulatorCode: 'SEC',
      severity: 'CRITICAL',
      findingType: 'DETERMINISTIC_MATCH',
      flaggedExcerpt: '35% risk-free annual return guaranteed',
      whyItMatters:
        'Representing market investments as "risk-free" or providing "guaranteed returns" without SEC approval violates SEC Rule 322 and ISA 2007 Section 106.',
      statutoryCitation:
        'Securities and Exchange Commission (SEC) Rules & Regulations, Rule 322: "No capital market operator shall publish or cause to be published any advertisement promising guaranteed returns or representing speculative investments as risk-free."',
      statutoryPenaltyNaira: 5000000,
      recommendedAction: 'Remove guaranteed return statement and include statutory capital risk warning.',
      mandatoryDisclosureRequired: 'Investments are subject to market risks. Capital is not guaranteed.',
    },
    {
      id: 'fnd_arcon_sec_2',
      ruleCode: 'ARCON-2022-DECEPTIVE-GOVT-BACKING',
      regulatorCode: 'ARCON',
      severity: 'HIGH',
      findingType: 'DETERMINISTIC_MATCH',
      flaggedExcerpt: 'backed by the government',
      whyItMatters:
        'Falsely claiming direct government backing or sovereign guarantee for a private commercial investment product violates ARCON Code 2022 Article 18.',
      statutoryCitation:
        'ARCON Code 2022 Article 18(3): "Advertisements shall not state or imply endorsement, guarantee, or financial backing by the Federal Government of Nigeria without official gazetted authorization."',
      statutoryPenaltyNaira: 2500000,
      recommendedAction: 'Disclose official regulatory status (e.g. Registered with SEC as Fund Manager).',
      mandatoryDisclosureRequired: 'PrimeYield is registered with SEC Nigeria as a Fund Manager.',
    },
  ],
  actions: [
    {
      id: 'act_b1',
      title: 'Remove Prohibited Yield Guarantee',
      description: 'Excise "35% risk-free annual return guaranteed" and replace with historic performance indicators.',
      priority: 'CRITICAL',
      ownerDepartment: 'Marketing',
      suggestedDeadlineDays: 1,
      completed: false,
    },
    {
      id: 'act_b2',
      title: 'Attach SEC Risk Warning Footer',
      description: 'Add mandatory SEC capital risk warning and fund manager registration credentials.',
      priority: 'HIGH',
      ownerDepartment: 'Legal',
      suggestedDeadlineDays: 2,
      completed: false,
    },
  ],
  humanReviewState: {
    status: 'PENDING_REVIEW',
    canApprove: true,
  },
  telemetry: {
    latencyMs: 295,
    modelIdentifier: 'gemini-2.5-flash (Deterministic Engine)',
    verifiedAt: new Date().toISOString(),
    auditHash: '3a1c8f9b2d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
  },
  channel: 'SOCIAL_MEDIA_POST',
  originalCopy:
    'Tired of inflation? Invest your Naira in PrimeYield and earn 35% risk-free annual return guaranteed! Your capital is 100% safe and backed by the government. Limited slots available.',
  compliantRewrite:
    'Grow your wealth with PrimeYield. Registered with SEC Nigeria as a Fund Manager. Past performance is not indicative of future returns. Investment value can fluctuate. Terms & statutory conditions apply. Visit primeyield.ng/risk.',
  arconPreclearanceRequired: true,
  activeLicenseProfiles: ['SEC_FUND_MANAGER', 'ARCON_CORPORATE_ADVERTISER'],
};

// Scenario C ViewModel
const SCENARIO_C_VIEW_MODEL: MarketingShieldViewModel = {
  scanId: '00000000-0000-0000-0000-000000000003',
  productCategory: 'REMITTANCE_FX',
  title: 'KoraPay Cross-Border Remittance Campaign Report',
  verdict: 'NO_ISSUE_DETECTED',
  overallRiskScore: 4,
  deterministicPenaltyTotalNaira: 0,
  executiveSummary:
    'The submitted promotional copy for "KoraPay Compliant Cross-Border Promo" fully complies with the CBN Consumer Protection Framework 2019, ARCON Code of Advertising Practice 2022, and FCCPC regulations. Explicit licensing disclosures and transparent terms links are present. Zero statutory infractions detected. Cleared for dissemination.',
  findings: [],
  actions: [
    {
      id: 'act_c1',
      title: 'Archive Clearance Record in Audit Vault',
      description: 'Generate immutable audit log entry for statutory 6-year CAMA 2020 record retention.',
      priority: 'LOW',
      ownerDepartment: 'Compliance',
      suggestedDeadlineDays: 5,
      completed: true,
    },
  ],
  humanReviewState: {
    status: 'APPROVED_BY_CCO',
    canApprove: true,
  },
  telemetry: {
    latencyMs: 182,
    modelIdentifier: 'gemini-2.5-flash (Deterministic Engine)',
    verifiedAt: new Date().toISOString(),
    auditHash: '9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d',
  },
  channel: 'SOCIAL_MEDIA_POST',
  originalCopy:
    'Send money home to Nigeria with KoraPay. Licensed by the Central Bank of Nigeria (CBN) as an International Money Transfer Operator. Transparent exchange rates and zero hidden charges. Terms and statutory fees apply. Visit korapay.ng/terms.',
  compliantRewrite:
    'Send money home to Nigeria with KoraPay. Licensed by the Central Bank of Nigeria (CBN) as an International Money Transfer Operator. Transparent exchange rates and zero hidden charges. Terms and statutory fees apply. Visit korapay.ng/terms.',
  arconPreclearanceRequired: false,
  activeLicenseProfiles: ['CBN_IMTO_LICENSE', 'ARCON_REGISTERED_ADVERTISER'],
};

const PRESET_VIEW_MODELS: Record<string, MarketingShieldViewModel> = {
  scenario_a: SCENARIO_A_VIEW_MODEL,
  scenario_b: SCENARIO_B_VIEW_MODEL,
  scenario_c: SCENARIO_C_VIEW_MODEL,
};

// Item representation for Level 1 Scanned Assets Feed
interface PromotionalAssetRecord {
  id: string;
  campaignName: string;
  channel: MarketingChannel;
  productCategory: ProductCategoryCode;
  verdict: 'BLOCKING_ISSUE' | 'WARNING' | 'NO_ISSUE_DETECTED';
  riskScore: number;
  fineExposureNaira: number;
  arconRequired: boolean;
  findingsCount: number;
  vettedAt: string;
  viewModel: MarketingShieldViewModel;
}

export interface MarketingShieldDashboardProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  initialContext?: CrossPillarLinkContext | null;
}

export const MarketingShieldDashboard: React.FC<MarketingShieldDashboardProps> = ({
  onSwitchPillar,
  initialContext,
}) => {
  // Navigation & View Mode: Level 1 Table Feed vs Level 2 Workspace
  const [viewMode, setViewMode] = useState<'workspace' | 'table'>('workspace');

  // Campaign identification and isolation state
  const [activeCampaignKey, setActiveCampaignKey] = useState<string>('scenario_a');
  const [viewModel, setViewModel] = useState<MarketingShieldViewModel>(SCENARIO_A_VIEW_MODEL);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Workspace Local Sub-Tabs
  const [workspaceTab, setWorkspaceTab] = useState<
    'EDITOR' | 'SPLIT_VIEW' | 'FINDINGS_FEED' | 'ACTION_PLAN' | 'CLAIMS_LEDGER' | 'DRIFT_WATCHER'
  >('EDITOR');

  const [showInputDrawer, setShowInputDrawer] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Form input state for new scans & editor synchronization
  const [campaignName, setCampaignName] = useState<string>('QuickKash SMS Flash Campaign');
  const [channel, setChannel] = useState<MarketingChannel>('SMS_BLAST');
  const [productCategory, setProductCategory] = useState<ProductCategoryCode>('DIGITAL_NANO_LOAN');
  const [rawCopy, setRawCopy] = useState<string>(SCENARIO_A_VIEW_MODEL.originalCopy);
  const [targetAudience, setTargetAudience] = useState<string>('Nigerian retail consumers seeking urgent cash');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Per-campaign signoff records registry
  const [campaignSignoffs, setCampaignSignoffs] = useState<Record<string, CcoSignoffRecord>>({
    scenario_c: {
      status: 'APPROVED_BY_CCO',
      reviewedBy: 'Amina Bello, SAN (General Counsel & Legal Director)',
      reviewerTitle: 'General Counsel & Legal Director',
      reviewerRegulatoryId: 'NBA/SAN: 21904 • REG-DIR-01',
      reviewedAt: new Date().toISOString(),
      attestationHash: '9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d',
      attestationNotes: 'Baseline compliant copy. IMTO licensing verified with CBN register.',
    },
  });

  // Level 1 Feed Inventory
  const [assetRecords, setAssetRecords] = useState<PromotionalAssetRecord[]>([
    {
      id: 'scenario_a',
      campaignName: 'QuickKash SMS Flash Promo',
      channel: 'SMS_BLAST',
      productCategory: 'DIGITAL_NANO_LOAN',
      verdict: 'BLOCKING_ISSUE',
      riskScore: 94,
      fineExposureNaira: 11500000,
      arconRequired: true,
      findingsCount: 3,
      vettedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      viewModel: SCENARIO_A_VIEW_MODEL,
    },
    {
      id: 'scenario_b',
      campaignName: 'PrimeYield High-Yield Ad',
      channel: 'SOCIAL_MEDIA_POST',
      productCategory: 'WEALTHTECH_INVEST',
      verdict: 'BLOCKING_ISSUE',
      riskScore: 88,
      fineExposureNaira: 7500000,
      arconRequired: true,
      findingsCount: 2,
      vettedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      viewModel: SCENARIO_B_VIEW_MODEL,
    },
    {
      id: 'scenario_c',
      campaignName: 'KoraPay Cross-Border Remittance',
      channel: 'SOCIAL_MEDIA_POST',
      productCategory: 'REMITTANCE_FX',
      verdict: 'NO_ISSUE_DETECTED',
      riskScore: 4,
      fineExposureNaira: 0,
      arconRequired: false,
      findingsCount: 0,
      vettedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      viewModel: SCENARIO_C_VIEW_MODEL,
    },
  ]);

  // Cross-Pillar deep linking context consumption
  useEffect(() => {
    if (initialContext) {
      if (initialContext.findingRuleCode) {
        const found = viewModel.findings.find((f) => f.ruleCode.includes(initialContext.findingRuleCode!));
        if (found) {
          setSelectedFindingId(found.id);
          setViewMode('workspace');
        }
      }
    }
  }, [initialContext, viewModel.findings]);

  // Handler to load a preset scenario
  const handleSelectPreset = (preset: (typeof PRESET_SCENARIOS)[0]) => {
    setActiveCampaignKey(preset.id);
    const targetVm = PRESET_VIEW_MODELS[preset.id] || SCENARIO_A_VIEW_MODEL;
    setViewModel(targetVm);
    setCampaignName(preset.name.split('(')[0]?.trim() || preset.name);
    setChannel(preset.channel);
    setProductCategory(preset.productCategory || 'SAVINGS_DEPOSIT');
    setRawCopy(preset.copy);
    setSelectedFindingId(null);
  };

  // Handler to apply compliant fix directly into draft
  const handleApplyFix = (newText: string) => {
    if (newText) {
      setRawCopy(newText);
    }
  };

  // Handler to execute scan via API route for new campaign
  const handleRunScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawCopy.trim()) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/marketing/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          channel,
          productCategory,
          rawCopy,
          targetAudience,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const newCampaignKey = 'scan_' + Date.now();
        setActiveCampaignKey(newCampaignKey);
        setViewModel(json.data);
        setSelectedFindingId(null);
        setShowInputDrawer(false);
        setViewMode('workspace');

        // Add to Asset Records
        const newRecord: PromotionalAssetRecord = {
          id: newCampaignKey,
          campaignName,
          channel,
          productCategory,
          verdict: json.data.verdict,
          riskScore: json.data.overallRiskScore,
          fineExposureNaira: json.data.deterministicPenaltyTotalNaira,
          arconRequired: json.data.arconPreclearanceRequired,
          findingsCount: json.data.findings.length,
          vettedAt: new Date().toISOString(),
          viewModel: json.data,
        };
        setAssetRecords((prev) => [newRecord, ...prev]);
      } else {
        throw new Error(json.error || 'Scan API returned unsuccessful status');
      }
    } catch (err: any) {
      console.warn('API call encountered error, using deterministic client synthesis fallback:', err);
      setScanError(err.message || 'Error processing scan. Loaded simulated evaluation.');
    } finally {
      setIsScanning(false);
    }
  };

  // Export official ARCON & CBN Defense Dossier
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const handleExportDossier = async (
    format: 'pdf' | 'markdown' | 'html' = 'markdown',
    targetRegulator: 'ARCON' | 'CBN' = 'ARCON'
  ) => {
    setIsExporting(true);
    try {
      const currentSignoff = campaignSignoffs[activeCampaignKey] || null;
      const fetchFormat = format === 'pdf' ? 'html' : format;

      const res = await fetch('/api/marketing/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: viewModel.scanId,
          viewModel,
          regulator: targetRegulator,
          format: fetchFormat,
          applicantCcoName: currentSignoff?.reviewedBy || 'Olumide Adebayo, Esq.',
          applicantCcoTitle: currentSignoff?.reviewerTitle || 'Chief Compliance Officer',
          attestationNotes:
            currentSignoff?.attestationNotes ||
            'Reviewed and reconciled against ARCON Code 2022, CBN Consumer Protection Framework 2019, and FCCPC Guidelines.',
          attestationHash: currentSignoff?.attestationHash || viewModel.telemetry.auditHash,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to generate ${targetRegulator} dossier`);
      }

      if (format === 'pdf') {
        const htmlText = await res.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          const enhancedHtml = htmlText.replace(
            '<body>',
            `<body>
              <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #0B0F1A; color: #FFFFFF; padding: 12px 24px; border-bottom: 2px solid #2A4BFF; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: system-ui, -apple-system, sans-serif;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="background: #2A4BFF; color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">ARCON FORM ARCON-PV1</span>
                  <span style="font-size: 13px; font-weight: 600;">Print to PDF / Official Document Clearance Pack</span>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button onclick="window.print()" style="background: #2A4BFF; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">
                    🖨️ Save as PDF / Print
                  </button>
                  <button onclick="window.close()" style="background: #4B5565; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                    ✕ Close
                  </button>
                </div>
              </div>
              <style>
                @media print {
                  .no-print { display: none !important; }
                }
              </style>
            `
          );
          printWindow.document.write(enhancedHtml);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 400);
        } else {
          const blob = new Blob([htmlText], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const cleanTitle = (viewModel.title || 'Campaign').replace(/[^a-zA-Z0-9_-]/g, '_');
          a.download = `ARCON_PreClearance_Dossier_${cleanTitle}.html`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'html' ? 'html' : 'md';
        const cleanTitle = (viewModel.title || 'Campaign').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `ARCON_PreClearance_Dossier_${cleanTitle}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      console.error('ARCON Dossier export failed:', err);
      alert('Failed to export ARCON Dossier: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MULTI-PANE INSPECTOR ENGINE WIRING (Zango AI Reference)
  // ──────────────────────────────────────────────────────────────────────────
  const inspectableIds = useMemo(() => {
    return viewModel.findings.map((f) => f.id);
  }, [viewModel.findings]);

  const inspector = useInspectorStore(inspectableIds);

  // Sync selectedFindingId with inspector store
  const activeFinding: FindingPresentationCard | null = useMemo(() => {
    const idToFind = selectedFindingId || inspector.inspectId;
    return viewModel.findings.find((f) => f.id === idToFind) || null;
  }, [selectedFindingId, inspector.inspectId, viewModel.findings]);

  // Resolve active item data for the MultiPaneContainer
  const activeInspectorItem: InspectorItemData | null = useMemo(() => {
    if (!inspector.inspectId) return null;
    const fnd = viewModel.findings.find((f) => f.id === inspector.inspectId);
    if (fnd) {
      return findingToInspectorItem(fnd, {
        originalCopy: viewModel.originalCopy,
        compliantRewrite: viewModel.compliantRewrite,
        onApplyFix: (fix) => setRawCopy(fix),
      });
    }
    return null;
  }, [inspector.inspectId, viewModel.findings, viewModel.originalCopy, viewModel.compliantRewrite]);

  // Resolve active statutory reference
  const activeReference: StatutoryReferenceData | null = useMemo(() => {
    if (!inspector.refId) return null;
    if (activeInspectorItem?.statutoryReference?.id === inspector.refId) {
      return activeInspectorItem.statutoryReference;
    }
    const matchedFinding = viewModel.findings.find(
      (f) => f.id === inspector.refId || `ref-${f.id}` === inspector.refId
    );
    if (matchedFinding) {
      return {
        id: `ref-${matchedFinding.id}`,
        statutoryInstrumentTitle: `${matchedFinding.regulatorCode} Directive / Code 2022`,
        citationClause: matchedFinding.ruleCode,
        regulatorCode: matchedFinding.regulatorCode,
        verbatimLegalText: `${matchedFinding.statutoryCitation}\n\n${matchedFinding.whyItMatters}`,
        statutoryPenaltyNaira: matchedFinding.statutoryPenaltyNaira,
        highlightedPhrase: matchedFinding.flaggedExcerpt,
      };
    }
    return activeInspectorItem?.statutoryReference || null;
  }, [inspector.refId, activeInspectorItem, viewModel.findings]);

  // Columns for Level 1 Scanned Assets Feed Table
  const tableColumns: TableColumn<PromotionalAssetRecord>[] = [
    {
      key: 'campaignName',
      header: 'Campaign & Channel',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[#0B0F1A] hover:text-[#2A4BFF] transition-colors">
            {row.campaignName}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE]">
              {row.channel}
            </span>
            <span className="text-[10px] text-[#8D99AE]">•</span>
            <span className="text-[10px] text-[#4B5565]">{row.productCategory}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'verdict',
      header: 'Statutory Verdict',
      sortable: true,
      width: '160px',
      render: (row) => {
        if (row.verdict === 'BLOCKING_ISSUE') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Blocking Issue ({row.riskScore}/100)
            </span>
          );
        }
        if (row.verdict === 'WARNING') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Warning ({row.riskScore}/100)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Clear ({row.riskScore}/100)
          </span>
        );
      },
    },
    {
      key: 'fineExposure',
      header: 'Deterministic Fine',
      sortable: true,
      width: '140px',
      render: (row) => (
        <span className="text-xs font-bold text-[#0B0F1A]">
          {row.fineExposureNaira > 0
            ? `₦${(row.fineExposureNaira / 1_000_000).toFixed(1)}M`
            : '₦0 (Zero Risk)'}
        </span>
      ),
    },
    {
      key: 'arconRequired',
      header: 'ARCON ASP',
      width: '120px',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.arconRequired
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE]'
          }`}
        >
          {row.arconRequired ? 'Mandatory' : 'Exempt'}
        </span>
      ),
    },
    {
      key: 'findingsCount',
      header: 'Infractions',
      width: '100px',
      render: (row) => (
        <span className="text-xs font-mono font-semibold text-[#0B0F1A]">
          {row.findingsCount} {row.findingsCount === 1 ? 'flag' : 'flags'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '150px',
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setActiveCampaignKey(row.id);
              setViewModel(row.viewModel);
              setCampaignName(row.campaignName);
              setChannel(row.channel);
              setProductCategory(row.productCategory);
              setRawCopy(row.viewModel.originalCopy);
              setViewMode('workspace');
            }}
            className="px-2.5 py-1 text-xs font-semibold text-[#2A4BFF] bg-[#2A4BFF]/5 hover:bg-[#2A4BFF]/10 rounded-lg border border-[#2A4BFF]/20 transition-all shadow-xs"
          >
            Open Audit
          </button>
        </div>
      ),
    },
  ];

  return (
    <MultiPaneContainer
      inspector={inspector}
      activeItem={activeInspectorItem}
      activeReference={activeReference}
    >
      <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] font-sans pb-16">
        {/* ──────────────────────────────────────────────────────────────────────────
            TOP COMMAND BAR & SPATIAL BREADCRUMB (Zango AI Reference)
            ────────────────────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-[#DDE3EE] bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            {/* Breadcrumb Lineage */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-extrabold tracking-wider text-[#2A4BFF] uppercase">Cogent</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#8D99AE]" />
                <button
                  onClick={() => setViewMode('table')}
                  className="text-[#4B5565] hover:text-[#0B0F1A] font-medium transition-colors"
                >
                  Pillar 2: Marketing Shield
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-[#8D99AE]" />
                <span className="font-semibold text-[#0B0F1A] truncate max-w-[200px] sm:max-w-xs">
                  {viewMode === 'workspace' ? viewModel.title : 'Promotional Assets Scanning Feed'}
                </span>
              </div>

              {/* Pillar Switcher */}
              {onSwitchPillar && (
                <div className="hidden lg:flex items-center gap-1 rounded-xl border border-[#DDE3EE] bg-[#F5F6FA] p-0.5 text-xs">
                  <button
                    onClick={() => onSwitchPillar('executive')}
                    className="rounded-lg px-2.5 py-1 text-[#4B5565] hover:text-[#0B0F1A] transition-colors"
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => onSwitchPillar('radar')}
                    className="rounded-lg px-2.5 py-1 text-[#4B5565] hover:text-[#0B0F1A] transition-colors"
                  >
                    Insight
                  </button>
                  <button className="rounded-lg bg-white text-[#2A4BFF] font-bold px-2.5 py-1 shadow-xs border border-[#DDE3EE]">
                    Marketing
                  </button>
                  <button
                    onClick={() => onSwitchPillar('gap-matrix')}
                    className="rounded-lg px-2.5 py-1 text-[#4B5565] hover:text-[#0B0F1A] transition-colors"
                  >
                    Policy Gap
                  </button>
                </div>
              )}
            </div>

            {/* View Mode Switcher & Tools */}
            <div className="flex items-center gap-3">
              {/* Level 1 Feed vs Level 2 Workspace Toggle */}
              <div className="flex items-center bg-[#F5F6FA] border border-[#DDE3EE] rounded-xl p-0.5 text-xs shadow-xs">
                <button
                  onClick={() => setViewMode('workspace')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    viewMode === 'workspace'
                      ? 'bg-white text-[#2A4BFF] shadow-xs'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Audit Workspace</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-[#2A4BFF] shadow-xs'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Assets Feed ({assetRecords.length})</span>
                </button>
              </div>

              {/* Export Dossier Dropdown */}
              <div className="relative">
                <div className="hidden sm:inline-flex rounded-xl shadow-xs">
                  <button
                    disabled={isExporting}
                    onClick={() => handleExportDossier('markdown')}
                    className="inline-flex items-center gap-1.5 rounded-l-xl border border-[#DDE3EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5 text-[#2A4BFF]" />
                    <span>{isExporting ? 'Exporting...' : 'Export ARCON Pack'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="inline-flex items-center rounded-r-xl border border-l-0 border-[#DDE3EE] bg-white px-2 py-1.5 text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all"
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-[#4B5565]" />
                  </button>
                </div>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#DDE3EE] bg-white p-1.5 shadow-xl z-50">
                    <div className="px-2.5 py-1 text-[11px] font-bold text-[#8D99AE] uppercase tracking-wider">
                      Statutory Clearance Formats
                    </div>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportDossier('pdf');
                      }}
                      className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs hover:bg-[#F5F6FA] transition-colors group"
                    >
                      <Printer className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-[#0B0F1A] group-hover:text-[#2A4BFF]">
                          Export as PDF (Form ARCON-PV1)
                        </div>
                        <div className="text-[11px] text-[#4B5565]">
                          Official printable dossier with seal & citations
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportDossier('markdown');
                      }}
                      className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs hover:bg-[#F5F6FA] transition-colors group"
                    >
                      <FileText className="h-4 w-4 text-[#2A4BFF] mt-0.5" />
                      <div>
                        <div className="font-semibold text-[#0B0F1A] group-hover:text-[#2A4BFF]">
                          Export as Markdown (.md)
                        </div>
                        <div className="text-[11px] text-[#4B5565]">
                          Audit-ready Markdown dossier with SHA-256 seal
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* New Scan Drawer Button */}
              <button
                onClick={() => setShowInputDrawer(!showInputDrawer)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2A4BFF] hover:bg-[#203ECC] text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>{showInputDrawer ? 'Close Console' : 'New Scan'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* ──────────────────────────────────────────────────────────────────────────
            EXPANDABLE CAMPAIGN SCAN CONSOLE (Top Drawer)
            ────────────────────────────────────────────────────────────────────────── */}
        {showInputDrawer && (
          <section className="border-b border-[#DDE3EE] bg-white p-4 shadow-sm transition-all">
            <div className="mx-auto max-w-7xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#0B0F1A] flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-[#2A4BFF]" />
                    <span>Regulatory Pre-Vetting Console</span>
                  </h2>
                  <p className="text-xs text-[#4B5565]">
                    Submit promotional copy for instant deterministic statutory matching against Nigerian codes.
                  </p>
                </div>

                {/* Scenario Presets */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#4B5565] font-semibold">Presets:</span>
                  {PRESET_SCENARIOS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all shadow-xs ${
                        activeCampaignKey === p.id
                          ? 'border-[#2A4BFF] bg-[#2A4BFF]/10 text-[#2A4BFF]'
                          : 'border-[#DDE3EE] bg-white text-[#4B5565] hover:bg-[#F9FAFC] hover:text-[#0B0F1A]'
                      }`}
                    >
                      {p.name.split('(')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleRunScan} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#4B5565] mb-1">Campaign Title</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full rounded-xl border border-[#DDE3EE] bg-white px-3 py-2 text-xs text-[#0B0F1A] focus:ring-2 focus:ring-[#2A4BFF] focus:outline-none shadow-xs"
                      placeholder="e.g. QuickKash Summer Loan Promo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4B5565] mb-1">Product Category</label>
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value as ProductCategoryCode)}
                      className="w-full rounded-xl border border-[#DDE3EE] bg-white px-3 py-2 text-xs text-[#0B0F1A] font-semibold focus:ring-2 focus:ring-[#2A4BFF] focus:outline-none shadow-xs"
                    >
                      <option value="SAVINGS_DEPOSIT">SAVINGS_DEPOSIT (CBN / NDIC)</option>
                      <option value="DIGITAL_NANO_LOAN">DIGITAL_NANO_LOAN (FCCPC / CBN)</option>
                      <option value="PAYMENTS_WALLET">PAYMENTS_WALLET (CBN PSMD)</option>
                      <option value="REMITTANCE_FX">REMITTANCE_FX (CBN IMTO)</option>
                      <option value="WEALTHTECH_INVEST">WEALTHTECH_INVEST (SEC Nigeria)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4B5565] mb-1">Channel</label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as MarketingChannel)}
                      className="w-full rounded-xl border border-[#DDE3EE] bg-white px-3 py-2 text-xs text-[#0B0F1A] focus:ring-2 focus:ring-[#2A4BFF] focus:outline-none shadow-xs"
                    >
                      <option value="SMS_BLAST">SMS Blast (160 char limits apply)</option>
                      <option value="SOCIAL_MEDIA_POST">Social Media (Twitter/X, IG, LinkedIn)</option>
                      <option value="IN_APP_PUSH_NOTIFICATION">In-App Push Notification</option>
                      <option value="LANDING_PAGE_WEBSITE">Landing Page / Website</option>
                      <option value="EMAIL_NEWSLETTER">Email Newsletter</option>
                      <option value="OUTDOOR_BILLBOARD">Outdoor Billboard (ARCON Mandatory)</option>
                      <option value="RADIO_TV_SCRIPT">Radio / TV Commercial Script</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4B5565] mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full rounded-xl border border-[#DDE3EE] bg-white px-3 py-2 text-xs text-[#0B0F1A] placeholder-[#8D99AE] focus:ring-2 focus:ring-[#2A4BFF] focus:outline-none shadow-xs"
                      placeholder="e.g. Retail consumers, SMEs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#4B5565]">Marketing Copy to Pre-Vet</label>
                    <span className="text-[11px] text-[#8D99AE]">
                      {rawCopy.length} characters • {rawCopy.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={rawCopy}
                    onChange={(e) => setRawCopy(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE3EE] bg-white p-3 text-xs leading-relaxed text-[#0B0F1A] focus:ring-2 focus:ring-[#2A4BFF] focus:outline-none font-sans shadow-xs"
                    placeholder="Paste promotional marketing copy..."
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  {scanError && <span className="text-xs text-red-600 font-semibold">{scanError}</span>}
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowInputDrawer(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-[#4B5565] hover:text-[#0B0F1A]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isScanning}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2A4BFF] hover:bg-[#203ECC] text-white px-5 py-2 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                    >
                      {isScanning ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Evaluating Corpus...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Run Pre-Vetting Scan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ──────────────────────────────────────────────────────────────────────────
            BODY CONTENT: SWITCHES BETWEEN LEVEL 1 TABLE FEED & LEVEL 2 WORKSPACE
            ────────────────────────────────────────────────────────────────────────── */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {viewMode === 'table' ? (
            /* ──────────────────────────────────────────────────────────────────
               LEVEL 1: PROMOTIONAL ASSETS SCANNING FEED (DenseDataTable)
               ────────────────────────────────────────────────────────────────── */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0B0F1A]">
                    Promotional Assets Scanning Feed
                  </h2>
                  <p className="text-xs text-[#4B5565]">
                    Comprehensive inventory of scanned promotional campaigns, channel allocations, and ARCON pre-vetting states.
                  </p>
                </div>
                <button
                  onClick={() => setShowInputDrawer(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2A4BFF] hover:bg-[#203ECC] text-white px-3.5 py-2 text-xs font-semibold shadow-xs self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Scan New Asset</span>
                </button>
              </div>

              <DenseDataTable
                columns={tableColumns}
                data={assetRecords}
                onRowClick={(row) => {
                  setActiveCampaignKey(row.id);
                  setViewModel(row.viewModel);
                  setCampaignName(row.campaignName);
                  setChannel(row.channel);
                  setProductCategory(row.productCategory);
                  setRawCopy(row.viewModel.originalCopy);
                  setViewMode('workspace');
                }}
                selectedId={activeCampaignKey}
                searchPlaceholder="Search campaigns by name, category, or channel..."
              />
            </div>
          ) : (
            /* ──────────────────────────────────────────────────────────────────
               LEVEL 2: SPLIT ZANGO DUAL-PANE CAMPAIGN WORKSPACE
               ────────────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              {/* Evidence-Bounded Verdict Banner */}
              <VerdictBanner
                verdict={viewModel.verdict}
                riskScore={viewModel.overallRiskScore}
                deterministicPenaltyNaira={viewModel.deterministicPenaltyTotalNaira}
                findingsCount={viewModel.findings.length}
                campaignName={viewModel.title}
              />

              {/* Master-Detail Split Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* ── LEFT COLUMN (60-65% width) ── */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                  {/* Workspace Sub-Tabs Navigation */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE3EE] pb-3">
                    <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => setWorkspaceTab('EDITOR')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          workspaceTab === 'EDITOR'
                            ? 'bg-white text-[#2A4BFF] shadow-xs border border-[#DDE3EE]'
                            : 'text-[#4B5565] hover:text-[#0B0F1A]'
                        }`}
                      >
                        <Edit3 className="h-4 w-4" />
                        <span>Campaign Editor</span>
                      </button>

                      <button
                        onClick={() => setWorkspaceTab('SPLIT_VIEW')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          workspaceTab === 'SPLIT_VIEW'
                            ? 'bg-white text-[#2A4BFF] shadow-xs border border-[#DDE3EE]'
                            : 'text-[#4B5565] hover:text-[#0B0F1A]'
                        }`}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        <span>Split-View Audit</span>
                      </button>

                      <button
                        onClick={() => setWorkspaceTab('FINDINGS_FEED')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          workspaceTab === 'FINDINGS_FEED'
                            ? 'bg-white text-[#2A4BFF] shadow-xs border border-[#DDE3EE]'
                            : 'text-[#4B5565] hover:text-[#0B0F1A]'
                        }`}
                      >
                        <Layers className="h-4 w-4" />
                        <span>Findings ({viewModel.findings.length})</span>
                      </button>

                      <button
                        onClick={() => setWorkspaceTab('ACTION_PLAN')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          workspaceTab === 'ACTION_PLAN'
                            ? 'bg-white text-[#2A4BFF] shadow-xs border border-[#DDE3EE]'
                            : 'text-[#4B5565] hover:text-[#0B0F1A]'
                        }`}
                      >
                        <CheckSquare className="h-4 w-4" />
                        <span>Remediation ({viewModel.actions.length})</span>
                      </button>

                      <button
                        onClick={() => setWorkspaceTab('CLAIMS_LEDGER')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          workspaceTab === 'CLAIMS_LEDGER'
                            ? 'bg-purple-50 text-purple-800 shadow-xs border border-purple-200'
                            : 'text-[#4B5565] hover:text-[#0B0F1A]'
                        }`}
                      >
                        <BookOpen className="h-4 w-4 text-purple-600" />
                        <span>Claims Ledger</span>
                      </button>

                      <button
                        onClick={() => setWorkspaceTab('DRIFT_WATCHER')}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          workspaceTab === 'DRIFT_WATCHER'
                            ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200'
                            : 'text-[#4B5565] hover:text-[#0B0F1A]'
                        }`}
                      >
                        <Activity className="h-4 w-4 text-emerald-600" />
                        <span>Drift Watcher</span>
                      </button>
                    </nav>

                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#4B5565]">
                      <span className="font-semibold">{productCategory}</span>
                      <span>•</span>
                      <span className="font-mono text-[#2A4BFF]">{channel}</span>
                    </div>
                  </div>

                  {/* ACTIVE TAB CONTENT */}
                  {workspaceTab === 'EDITOR' && (
                    <CampaignCopyEditor
                      campaignTitle={campaignName}
                      onCampaignTitleChange={(t) => setCampaignName(t)}
                      productCategory={productCategory}
                      channel={channel}
                      copyText={rawCopy}
                      onChangeCopyText={(newText) => setRawCopy(newText)}
                      findings={viewModel.findings}
                      compliantRewrite={viewModel.compliantRewrite}
                      selectedFindingId={selectedFindingId}
                      onSelectFinding={(id) => {
                        setSelectedFindingId(id);
                        inspector.openInspector(id);
                      }}
                      onApplyFix={handleApplyFix}
                      onRunScan={handleRunScan}
                      isScanning={isScanning}
                    />
                  )}

                  {workspaceTab === 'SPLIT_VIEW' && (
                    <SplitViewComparison
                      originalCopy={rawCopy || viewModel.originalCopy}
                      compliantRewrite={viewModel.compliantRewrite}
                      channel={viewModel.channel}
                      findings={viewModel.findings}
                      selectedFindingId={selectedFindingId}
                      onSelectFinding={(id) => {
                        setSelectedFindingId(id);
                        inspector.openInspector(id);
                      }}
                    />
                  )}

                  {workspaceTab === 'FINDINGS_FEED' && (
                    <FindingsList
                      findings={viewModel.findings}
                      selectedFindingId={selectedFindingId}
                      onSelectFinding={(id) => {
                        setSelectedFindingId(id);
                        inspector.openInspector(id);
                      }}
                    />
                  )}

                  {workspaceTab === 'ACTION_PLAN' && (
                    <ActionChecklist actions={viewModel.actions} />
                  )}

                  {workspaceTab === 'CLAIMS_LEDGER' && (
                    <ClaimsLedgerTab
                      initialCategory={viewModel.productCategory || productCategory}
                      onApplyToDraft={(text) => {
                        setRawCopy(text);
                        setWorkspaceTab('EDITOR');
                      }}
                    />
                  )}

                  {workspaceTab === 'DRIFT_WATCHER' && (
                    <DriftWatcherTab
                      currentScanId={viewModel.scanId}
                      originalApprovedText={viewModel.compliantRewrite || viewModel.originalCopy}
                    />
                  )}

                  {/* CCO GOVERNANCE ATTESTATION BLOCK (Always anchored at bottom of workspace) */}
                  <CcoGovernanceBlock
                    key={activeCampaignKey}
                    campaignKey={activeCampaignKey}
                    campaignName={viewModel.title}
                    scanId={viewModel.scanId}
                    productCategory={viewModel.productCategory || productCategory}
                    originalCopy={rawCopy || viewModel.originalCopy}
                    compliantRewrite={viewModel.compliantRewrite}
                    dominantRegulator={viewModel.findings[0]?.regulatorCode || 'CBN'}
                    dominantCitation={viewModel.findings[0]?.statutoryCitation || 'CBN Consumer Protection Framework 2019'}
                    primaryFlaggedExcerpt={viewModel.findings[0]?.flaggedExcerpt || ''}
                    auditHash={viewModel.telemetry.auditHash}
                    initialSignoff={campaignSignoffs[activeCampaignKey] || null}
                    onSignoffComplete={(key, record) => {
                      setCampaignSignoffs((prev) => ({
                        ...prev,
                        [key]: record,
                      }));
                      setViewModel((prev) => ({
                        ...prev,
                        humanReviewState: {
                          ...prev.humanReviewState,
                          status: record.status,
                        },
                      }));
                    }}
                    onExportDossier={handleExportDossier}
                    isExporting={isExporting}
                  />
                </div>

                {/* ── RIGHT COLUMN: CONTEXTUAL INSPECTOR (35-40% width) ── */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-5">
                  <div className="sticky top-20 space-y-5">
                    <ContextualInspector
                      selectedFinding={activeFinding}
                      onClearSelection={() => {
                        setSelectedFindingId(null);
                        inspector.closeInspector();
                      }}
                      viewModel={viewModel}
                      onApplyFix={handleApplyFix}
                      onSwitchPillar={onSwitchPillar}
                      onSelectFinding={(id) => {
                        setSelectedFindingId(id);
                        inspector.openInspector(id);
                      }}
                      onOpenStatutoryRef={(refId) => {
                        inspector.openReference(refId);
                      }}
                    />

                    {/* When no finding is active, display the Executive Summary card */}
                    {!activeFinding && (
                      <ExecutiveSummaryCard
                        summary={viewModel.executiveSummary}
                        arconPreclearanceRequired={viewModel.arconPreclearanceRequired}
                        activeLicenses={viewModel.activeLicenseProfiles}
                        telemetry={viewModel.telemetry}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-[#DDE3EE] bg-white py-6 text-center text-xs text-[#4B5565]">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="font-semibold text-[#0B0F1A]">
              Cogent AI — Nigerian Regulatory Moat Platform
            </span>
            <span className="font-mono text-[11px] text-[#8D99AE]">
              SHA-256 Audit Seal: {viewModel.telemetry.auditHash.substring(0, 16)}...
            </span>
            <span className="text-[#4B5565]">
              Regulator Corpi: ARCON • CBN • FCCPC • SEC • NDPC
            </span>
          </div>
        </footer>
      </div>
    </MultiPaneContainer>
  );
};
