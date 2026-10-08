'use client';

import React, { useState, useMemo } from 'react';
import {
  DenseDataTable,
  TableColumn,
  DetailInspector,
  ReferencePane,
  MultiPaneContainer,
  useInspectorStore,
  InspectorItemData,
  circularToInspectorItem,
  findingToInspectorItem,
  gapItemToInspectorItem,
} from './index';
import { RadarCircularPresentationCard } from '@/modules/radar/types';
import {
  FileText,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowRight,
  Download,
  Filter,
  CheckCircle,
  Clock,
  Building,
} from 'lucide-react';

// Canonical showcase records representative of the Nigerian RegTech domain
const SAMPLE_CIRCULARS: RadarCircularPresentationCard[] = [
  {
    id: 'cbn-psm-2026-014',
    circularNumber: 'PSM/DIR/CON/CWS/08/014',
    regulator: 'CBN',
    subject: 'Operational Guidelines for Contactless Payments in Nigeria',
    summary:
      'The Central Bank of Nigeria mandates transaction limits, offline contactless caps, and compulsory 2FA biometric/PIN validation for all contactless card acquiring and processing infrastructure.',
    publicationDate: '2026-03-01',
    effectiveDate: '2026-03-01',
    statutoryDeadline: '2026-03-15',
    daysRemaining: 11,
    businessDaysRemaining: 9,
    countdownTier: 'HIGH',
    urgencyWindow: 'URGENT_ACTION',
    priority: 'HIGH',
    enforcementRiskLevel: 'CRITICAL_SANCTION_RISK',
    lineageStatus: 'ACTIVE_LAW',
    targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'SWITCHING_AND_PROCESSING', 'COMMERCIAL_BANK'],
    affectedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'CARD_ACQUIRING_VERVE', 'NIBSS_NIP'],
    appliesUniversally: false,
    penaltyEscalationProjection: {
      baselineFineNaira: 10_000_000,
      dailyFineNaira: 2_000_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 10_000_000,
      statutoryCitation: 'BOFIA 2020 Section 57(2) & CBN Sanctions Grid',
      carriesPersonalCriminalLiability: true,
      carriesLicenseSuspensionRisk: true,
    },
    applicability: {
      isApplicable: true,
      reason:
        'Directly impacts your institution holding Payment Solution Services (PSSP) license on card acquiring rails.',
      matchedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
      matchedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
    },
    executiveBriefCco:
      'Mandatory compliance within 14 calendar days. System non-alignment triggers administrative fines up to ₦10,000,000 and possible NIBSS interbank clearing suspension.',
    actionBriefCoo:
      'Enforce cumulative POS caps and align settlement windows for contactless transactions with partner banks.',
    technicalBriefProductEng:
      'Deploy logic requiring PIN/biometric challenge on contactless acquiring charges above ₦15,000.',
    financialBriefCfo:
      'Evaluate transaction margin compression under the 0.5% interchange cap on contactless payments.',
    actionItems: [
      {
        id: 'act-1',
        targetDepartment: 'ENGINEERING_TECH',
        actionTitle: 'Enforce Contactless ₦15,000 2FA Threshold in Gateway API',
        actionDescription: 'Deploy logic requiring PIN or biometric verification on single transactions > ₦15,000.',
        suggestedDeadline: '2026-03-15',
        isCompleted: false,
      },
      {
        id: 'act-2',
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: 'Submit Board Attestation to CBN Director of PSM',
        actionDescription: 'Prepare formal executive compliance return before March 15, 2026.',
        suggestedDeadline: '2026-03-15',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'sec-fin-2026-002',
    circularNumber: 'SEC/DMR/CIR/02/2026',
    regulator: 'SEC',
    subject: 'Regulatory Framework for Digital Asset Custody & Tokenized Real-World Assets (RWA)',
    summary:
      'Securities and Exchange Commission mandates independent institutional custody, cold-storage asset ring-fencing, and daily proof-of-reserve attestation for licensed VASPs.',
    publicationDate: '2026-02-15',
    effectiveDate: '2026-03-01',
    statutoryDeadline: '2026-04-01',
    daysRemaining: 28,
    businessDaysRemaining: 21,
    countdownTier: 'MEDIUM',
    urgencyWindow: 'STANDARD_WINDOW',
    priority: 'HIGH',
    enforcementRiskLevel: 'HIGH',
    lineageStatus: 'ACTIVE_LAW',
    targetedLicenses: ['COMMERCIAL_BANK', 'SWITCHING_AND_PROCESSING'],
    affectedRails: ['NIBSS_NIP'],
    appliesUniversally: false,
    penaltyEscalationProjection: {
      baselineFineNaira: 25_000_000,
      dailyFineNaira: 500_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 25_000_000,
      statutoryCitation: 'ISA 2007 Section 303 & SEC Rules on Digital Assets',
      carriesPersonalCriminalLiability: false,
      carriesLicenseSuspensionRisk: true,
    },
    applicability: {
      isApplicable: true,
      reason: 'Impacts treasury settlement and asset custody operations.',
      matchedLicenses: ['COMMERCIAL_BANK'],
      matchedRails: ['NIBSS_NIP'],
    },
    executiveBriefCco:
      'SEC enforces cold-storage multi-sig custody standards with mandatory bi-weekly cryptographic proofs.',
    actionBriefCoo:
      'Audit third-party custody partners and confirm cold storage vault segregation.',
    technicalBriefProductEng:
      'Integrate automated Merkle tree proof-of-reserve API endpoints for auditor verification.',
    actionItems: [
      {
        id: 'act-sec-1',
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: 'File Form SEC/DA-1 Digital Custody Assessment',
        actionDescription: 'Submit audited architecture to SEC Department of Market Regulation.',
        suggestedDeadline: '2026-04-01',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'ndpc-priv-2026-008',
    circularNumber: 'NDPC/GD/DIR/01/2026',
    regulator: 'NDPC',
    subject: 'Cross-Border Financial Telemetry & NDPA 2023 Statutory Data Localization Mandate',
    summary:
      'Nigeria Data Protection Commission directive ordering all payment switches and digital banks to restrict routing of customer PII to foreign clouds without Data Protection Whitelist certification.',
    publicationDate: '2026-02-20',
    effectiveDate: '2026-03-10',
    statutoryDeadline: '2026-03-24',
    daysRemaining: 20,
    businessDaysRemaining: 15,
    countdownTier: 'HIGH',
    urgencyWindow: 'URGENT_ACTION',
    priority: 'HIGH',
    enforcementRiskLevel: 'CRITICAL_SANCTION_RISK',
    lineageStatus: 'ACTIVE_LAW',
    targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'COMMERCIAL_BANK'],
    affectedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
    appliesUniversally: true,
    penaltyEscalationProjection: {
      baselineFineNaira: 10_000_000,
      dailyFineNaira: 1_000_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 10_000_000,
      statutoryCitation: 'NDPA 2023 Section 48 & NDPC Enforcement Regulations',
      carriesPersonalCriminalLiability: true,
      carriesLicenseSuspensionRisk: false,
    },
    applicability: {
      isApplicable: true,
      reason: 'Universal application to all entities processing biometric or cardholder data.',
      matchedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'COMMERCIAL_BANK'],
      matchedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
    },
    executiveBriefCco:
      'Failure to localize payment telemetry triggers statutory fines up to 2% of annual gross revenue or ₦10,000,000.',
    actionItems: [
      {
        id: 'act-ndpc-1',
        targetDepartment: 'ENGINEERING_TECH',
        actionTitle: 'Validate AWS/Azure Local Lagos Availability Zone Routing',
        actionDescription: 'Ensure database replicas storing KYC data are pinned to Nigerian sovereign regions.',
        suggestedDeadline: '2026-03-24',
        isCompleted: false,
      },
    ],
  },
];

export function MultiPaneShowcase() {
  const inspectorItems = useMemo(
    () => SAMPLE_CIRCULARS.map((c) => circularToInspectorItem(c)),
    []
  );

  const itemIds = useMemo(() => inspectorItems.map((item) => item.id), [inspectorItems]);

  const inspector = useInspectorStore(itemIds);

  const activeItem = useMemo(() => {
    if (!inspector.inspectId) return null;
    return inspectorItems.find((item) => item.id === inspector.inspectId) || null;
  }, [inspector.inspectId, inspectorItems]);

  const columns: TableColumn<InspectorItemData>[] = [
    {
      key: 'referenceCode',
      header: 'Reference Code',
      width: '180px',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#0B0F1A]">
            {row.referenceCode}
          </span>
        </div>
      ),
    },
    {
      key: 'regulatorCode',
      header: 'Regulator',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0B0F1A] text-white">
          {row.regulatorCode || 'CBN'}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Directive Subject / Statutory Title',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 max-w-md">
          <div className="text-xs font-semibold text-[#0B0F1A] truncate">
            {row.title}
          </div>
          <div className="text-[11px] text-[#4B5565] truncate">
            {row.summary}
          </div>
        </div>
      ),
    },
    {
      key: 'suggestedDeadlineDays',
      header: 'Statutory Window',
      width: '140px',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#0B0F1A]">
          <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>{row.suggestedDeadlineDays ?? 'Open'}d remaining</span>
        </div>
      ),
    },
    {
      key: 'statutoryPenaltyNaira',
      header: 'Fine Exposure',
      width: '130px',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-bold font-mono text-[#EF4444]">
          {row.statutoryPenaltyNaira
            ? `₦${(row.statutoryPenaltyNaira / 1_000_000).toFixed(0)}M`
            : '₦0'}
        </span>
      ),
    },
    {
      key: 'statusVariant',
      header: 'Compliance Verdict',
      width: '150px',
      sortable: true,
      render: (row) => (
        <span className={`pill-status pill-${row.statusVariant}`}>
          <span className={`pill-dot pill-dot-${row.statusVariant}`} />
          {row.statusText}
        </span>
      ),
    },
  ];

  return (
    <MultiPaneContainer inspector={inspector} activeItem={activeItem}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDE3EE] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                TASK-03 Demonstration
              </span>
              <span className="text-xs text-[#8D99AE]">Zango Multi-Pane Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B0F1A]">
              Regulatory Enclave Horizon Scanning & Multi-Pane Engine
            </h1>
            <p className="text-xs sm:text-sm text-[#4B5565]">
              Dense tabular records with spatial continuity, floating rounded inspector (Layer 4), and dual-pane verbatim gazette viewer (Layer 5).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (inspectorItems.length > 0) {
                  inspector.openInspector(inspectorItems[0].id, itemIds);
                }
              }}
              className="btn-base btn-primary btn-sm gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Demo Inspector</span>
            </button>
          </div>
        </div>

        {/* Dense Data Table (Layer 1/2) */}
        <DenseDataTable
          columns={columns}
          data={inspectorItems}
          onRowClick={(row) => inspector.openInspector(row.id, itemIds)}
          selectedId={inspector.inspectId}
          searchPlaceholder="Search circulars by code, keyword, or regulator..."
          filterOptions={[
            {
              label: 'Filter Regulator',
              key: 'regulator',
              options: ['CBN', 'SEC', 'NDPC', 'ARCON', 'FCCPC'],
            },
          ]}
          batchActions={[
            {
              id: 'batch-ack',
              label: 'Acknowledge Selected',
              icon: <CheckCircle className="w-3.5 h-3.5" />,
              variant: 'primary',
              onClick: (rows) => alert(`Acknowledged ${rows.length} directives.`),
            },
            {
              id: 'batch-export',
              label: 'Export CSV',
              icon: <Download className="w-3.5 h-3.5" />,
              variant: 'secondary',
              onClick: (rows) => alert(`Exporting ${rows.length} directives to CSV.`),
            },
          ]}
        />
      </div>
    </MultiPaneContainer>
  );
}
