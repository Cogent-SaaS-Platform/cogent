'use client';

import React from 'react';
import { RegulatorCode } from '@/shared/types';

export type StatusVariant = 'healthy' | 'watch' | 'critical' | 'neutral' | 'info';

export interface InspectorMetric {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: StatusVariant;
  changeIndicator?: 'up' | 'down' | 'neutral';
}

export interface AssessmentCriterion {
  id: string;
  title: string;
  description: string;
  status: 'MET' | 'PARTIAL' | 'NOT_MET';
  type: 'CORE_CRITERIA' | 'BEST_PRACTICE' | 'STATUTORY_MANDATE';
  aiReason?: string;
  statutoryClauseRef?: string;
}

export interface StatutoryReferenceData {
  id: string;
  statutoryInstrumentTitle: string;
  citationClause: string;
  regulatorCode: RegulatorCode;
  gazettePageNumber?: number;
  statutoryPenaltyNaira?: number;
  dailyFineNaira?: number;
  verbatimLegalText: string;
  highlightedPhrase?: string;
  officialGazetteUrl?: string;
  effectiveDate?: string;
  amendsInstrument?: string;
}

export interface InspectorCustomSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: StatusVariant;
  defaultOpen?: boolean;
  content: React.ReactNode;
}

export interface InspectorAction {
  id: string;
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

export interface InspectorAuditMetadata {
  sha256Hash: string;
  timestamp: string;
  verifiedBy: string;
  immutableRef: string;
}

export interface InspectorItemData {
  id: string;
  referenceCode: string;
  title: string;
  subtitle?: string;
  statusText: string;
  statusVariant: StatusVariant;
  strictnessType?: 'Prescriptive' | 'Proscriptive' | 'Principles-Based' | 'Disclosure';
  summary: string;
  metrics: InspectorMetric[];
  criteria?: AssessmentCriterion[];
  riskAnalysis?: string;
  departmentOwners?: string[];
  suggestedDeadlineDays?: number;
  statutoryDeadline?: string;
  statutoryPenaltyNaira?: number;
  regulatorCode?: RegulatorCode;
  statutoryReference?: StatutoryReferenceData;
  customSections?: InspectorCustomSection[];
  actions?: InspectorAction[];
  auditMetadata?: InspectorAuditMetadata;
  tags?: string[];
}
