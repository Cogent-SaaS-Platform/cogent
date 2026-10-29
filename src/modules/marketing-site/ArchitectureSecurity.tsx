import React from 'react';
import { Lock, FileText, Scale, Check } from 'lucide-react';

interface SecurityFeature {
  title: string;
  code: string;
  description: string;
  spec: string;
}

const securitySpecs: SecurityFeature[] = [
  {
    title: 'Immutable Audit Ledger',
    code: 'CAMA_2020_BOFIA_SEC_5.2',
    description: 'Every marketing scan, circular ingestion, and policy concordance review is cryptographically sealed.',
    spec: 'SHA-256 cryptographic chaining with tamper-evident audit receipts for bank examiners.',
  },
  {
    title: 'Tenant Isolation Architecture',
    code: 'POSTGRES_RLS_ENFORCED',
    description: 'Strict logical and cryptographic data separation between institutional tenants.',
    spec: 'Multi-tenant PostgreSQL 16 Row-Level Security bound to authenticated JWT organization claims.',
  },
  {
    title: 'Edge Gateway Defense & Rate Limits',
    code: 'EDGE_GATEWAY_UPSTASH',
    description: 'Distributed rate limiting and bot mitigation at the edge proxy layer.',
    spec: 'Strict quota enforcement (60 req/min standard, 10 req/min analysis) with fail-open resiliency.',
  },
  {
    title: 'Zero Re-Training Data Sovereignty',
    code: 'NDPA_2023_SOVEREIGN_ENCLAVE',
    description: 'Statutory compliance data, draft ad copy, and internal SOPs remain sovereign.',
    spec: 'Zero model retention or weights training on institutional customer documents.',
  },
];

export function ArchitectureSecurity() {
  return (
    <section id="architecture" className="py-20 bg-slate-50/50 border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block mb-2">
            ENTERPRISE ASSURANCE
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Bank-Grade Sovereign Architecture & Cryptographic Auditability
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Constructed for the scrutiny of internal audit committees, external counsels, and central 
            bank regulatory examiners.
          </p>
        </div>

        {/* Security Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {securitySpecs.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    {item.title}
                  </h3>
                  <span className="font-mono text-xs text-slate-600">
                    {item.code}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                <span>{item.spec}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bank Examiner Attestation Strip */}
        <div className="mt-8 bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded text-slate-800 border border-slate-200">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Statutory Regulatory Examination Readiness
              </span>
              <span className="text-xs text-slate-500">
                One-click export of structured concordance dossiers and signed ARCON vetting packages.
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="font-mono text-xs text-slate-600">
              BOFIA 2020 § 5.2 / NDPA 2023
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
