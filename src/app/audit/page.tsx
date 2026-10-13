'use client';

import React, { useState } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { ShieldCheck, Search, Download, CheckCircle2, Lock, FileText, Hash } from 'lucide-react';

interface MockAuditLog {
  id: string;
  action: string;
  entityType: string;
  sha256InputPrefix: string;
  sha256OutputPrefix: string;
  timestamp: string;
  status: 'VERIFIED' | 'TAMPER_LOCKED';
  operator: string;
}

const AUDIT_LOGS: MockAuditLog[] = [
  {
    id: 'aud-01',
    action: 'MARKETING_PREVET_EXECUTED',
    entityType: 'marketing_scans',
    sha256InputPrefix: '39957e3c',
    sha256OutputPrefix: 'c13dc2f8',
    timestamp: '2026-10-07 14:21:00 WAT',
    status: 'VERIFIED',
    operator: 'Autonomous AI Engine (v1.2)',
  },
  {
    id: 'aud-02',
    action: 'POLICY_CONCORDANCE_EVALUATION',
    entityType: 'policy_evaluations',
    sha256InputPrefix: 'ec9d68c1',
    sha256OutputPrefix: '776adfbd',
    timestamp: '2026-10-07 14:19:57 WAT',
    status: 'VERIFIED',
    operator: 'Chief Compliance Officer',
  },
  {
    id: 'aud-03',
    action: 'RADAR_LINEAGE_SUPERSEDED',
    entityType: 'circular_lineage',
    sha256InputPrefix: '88a14f09',
    sha256OutputPrefix: '190ef22a',
    timestamp: '2026-10-07 13:45:12 WAT',
    status: 'VERIFIED',
    operator: 'Statutory Ingestion Daemon',
  },
  {
    id: 'aud-04',
    action: 'CLAIM_LEDGER_CONFIRMATION',
    entityType: 'tenant_claims_ledger',
    sha256InputPrefix: 'b223c90a',
    sha256OutputPrefix: 'fa990021',
    timestamp: '2026-10-07 11:30:44 WAT',
    status: 'VERIFIED',
    operator: 'Head of Growth / Marketing',
  },
  {
    id: 'aud-05',
    action: 'BOARD_DEFENSE_DOSSIER_COMPILED',
    entityType: 'executive_dossiers',
    sha256InputPrefix: 'd44a19bc',
    sha256OutputPrefix: '3c8812ea',
    timestamp: '2026-10-07 09:15:02 WAT',
    status: 'VERIFIED',
    operator: 'Legal Counsel Locked',
  },
];

export default function AuditLedgerPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = AUDIT_LOGS.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.sha256InputPrefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell activePillarOverride="audit">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                AUDIT LEDGER
              </span>
              <span className="text-xs text-[#8D99AE]">CAMA 2020 & BOFIA 2020 Section 5.2</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0B0F1A]">Immutable Audit Ledger</h1>
            <p className="text-xs text-[#4B5565] mt-0.5">
              Cryptographically verified SHA-256 evidence chain for institutional board attestations and forensic regulatory defense.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-base btn-primary btn-sm gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Chain Integrity</span>
            </button>
            <button className="btn-base btn-secondary btn-sm gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Export Signed Ledger</span>
            </button>
          </div>
        </div>

        {/* 4-Metric Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cogent-metric-strip space-y-1">
            <span className="text-[11px] font-medium text-[#4B5565] uppercase tracking-wider block">
              Cryptographic State
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#10B981]">100% UNBROKEN</span>
              <Lock className="w-4 h-4 text-[#10B981]" />
            </div>
            <span className="text-[10px] text-[#8D99AE]">SHA-256 Merkle root validated</span>
          </div>

          <div className="cogent-metric-strip space-y-1">
            <span className="text-[11px] font-medium text-[#4B5565] uppercase tracking-wider block">
              Total Log Entries
            </span>
            <span className="text-lg font-bold text-[#0B0F1A] font-mono">1,482</span>
            <span className="text-[10px] text-[#8D99AE]">Zero deletions permitted</span>
          </div>

          <div className="cogent-metric-strip space-y-1">
            <span className="text-[11px] font-medium text-[#4B5565] uppercase tracking-wider block">
              Forensic Attestations
            </span>
            <span className="text-lg font-bold text-[#2A4BFF] font-mono">42 Board Packs</span>
            <span className="text-[10px] text-[#8D99AE]">CAMA 2020 certified exports</span>
          </div>

          <div className="cogent-metric-strip space-y-1">
            <span className="text-[11px] font-medium text-[#4B5565] uppercase tracking-wider block">
              Enclave Protection
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-sm font-semibold text-[#0B0F1A]">NDPA 2023 Locked</span>
            </div>
            <span className="text-[10px] text-[#8D99AE]">Row-Level Security active</span>
          </div>
        </div>

        {/* Search */}
        <div className="cogent-card p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8D99AE] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, entity type, SHA-256 prefix, or operator..."
              className="cogent-input pl-9"
            />
          </div>
        </div>

        {/* Tabular Ledger */}
        <div className="cogent-table-container">
          <table className="cogent-table">
            <thead>
              <tr>
                <th>Audit Action</th>
                <th>Target Entity</th>
                <th>Input Hash (SHA-256)</th>
                <th>Output Hash (SHA-256)</th>
                <th>Operator</th>
                <th>Timestamp (WAT)</th>
                <th className="text-right">Integrity</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="font-semibold text-xs text-[#0B0F1A] font-mono block">
                      {log.action}
                    </span>
                  </td>
                  <td className="text-xs text-[#4B5565] font-mono">{log.entityType}</td>
                  <td>
                    <div className="flex items-center gap-1 font-mono text-xs text-[#2A4BFF] bg-[#EEF2FF] px-2 py-0.5 rounded w-fit border border-[#C7D2FE]">
                      <Hash className="w-3 h-3" />
                      <span>{log.sha256InputPrefix}...</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 font-mono text-xs text-[#4B5565] bg-[#F5F6FA] px-2 py-0.5 rounded w-fit border border-[#DDE3EE]">
                      <Hash className="w-3 h-3" />
                      <span>{log.sha256OutputPrefix}...</span>
                    </div>
                  </td>
                  <td className="text-xs text-[#4B5565]">{log.operator}</td>
                  <td className="text-xs text-[#8D99AE] font-mono">{log.timestamp}</td>
                  <td className="text-right">
                    <span className="pill-status pill-healthy">
                      <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                      <span>Verified</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
