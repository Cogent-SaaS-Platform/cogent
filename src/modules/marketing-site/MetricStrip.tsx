import React from 'react';

interface MetricItem {
  label: string;
  value: string;
  description: string;
  code?: string;
}

const metrics: MetricItem[] = [
  {
    label: 'DETERMINISTIC EVALUATION',
    value: '< 50ms',
    description: 'Exact statutory phrase & regex pattern verification',
    code: 'STAGE_1_LATENCY',
  },
  {
    label: 'REGULATORY JURISDICTIONS',
    value: '6 Regulators',
    description: 'Continuous circular monitoring and statutory rule maps',
    code: 'CBN · NDPC · ARCON · SEC · NFIU · FCCPC',
  },
  {
    label: 'CONCORDANCE FIDELITY',
    value: '100%',
    description: 'Bidirectional statutory obligation and internal SOP mapping',
    code: '5-W_DECISION_FRAMEWORK',
  },
  {
    label: 'AUDIT LEDGER INTEGRITY',
    value: 'SHA-256',
    description: 'Cryptographic state proofs for board and bank examiner review',
    code: 'CAMA_2020_BOFIA_§5.2',
  },
];

export function MetricStrip() {
  return (
    <section className="py-12 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-2xs">
          {metrics.map((item, idx) => (
            <div key={idx} className="p-6 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  {item.label}
                </span>
                <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight block">
                  {item.value}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                <p className="text-xs text-slate-600 leading-normal">
                  {item.description}
                </p>
                {item.code && (
                  <span className="font-mono text-xs text-slate-600 block">
                    {item.code}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
