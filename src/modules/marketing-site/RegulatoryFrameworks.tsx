import React from 'react';

interface FrameworkItem {
  acronym: string;
  name: string;
  scope: string;
  code: string;
  obligations: string;
}

const frameworks: FrameworkItem[] = [
  {
    acronym: 'CBN',
    name: 'Central Bank of Nigeria',
    scope: 'BOFIA 2020, Consumer Protection Framework, CyberSecurity Standards',
    code: 'BOFIA_2020_SEC_5.2',
    obligations: 'Capital adequacy, liquidity reserves, lending disclosures, mandatory reporting',
  },
  {
    acronym: 'NDPC',
    name: 'Nigeria Data Protection Commission',
    scope: 'Nigeria Data Protection Act (NDPA 2023), Cross-border Data Transfers',
    code: 'NDPA_2023_SEC_24-39',
    obligations: 'Lawful basis of processing, Data Protection Impact Assessment (DPIA), breach notifications',
  },
  {
    acronym: 'ARCON',
    name: 'Advertising Regulatory Council of Nigeria',
    scope: 'ARCON Act 2022, Nigerian Code of Advertising Practice (5th Edition)',
    code: 'ARCON_CODE_2022_P5',
    obligations: 'Pre-exposure vetting, prohibited superlatives, disclosure standards, ASP approval',
  },
  {
    acronym: 'SEC',
    name: 'Securities & Exchange Commission',
    scope: 'Investments and Securities Act (ISA 2007), Digital Asset Offering Rules',
    code: 'SEC_ISA_2007_DIV4',
    obligations: 'Capital market disclosures, digital asset custody, prospectus validation, AML compliance',
  },
  {
    acronym: 'NFIU',
    name: 'Nigerian Financial Intelligence Unit',
    scope: 'AML/CFT/CPF Regulations 2022, Terrorism Prevention Act',
    code: 'NFIU_AML_CFT_2022',
    obligations: 'Suspicious Transaction Reports (STR), Currency Transaction Reports (CTR), PEP monitoring',
  },
  {
    acronym: 'FCCPC',
    name: 'Federal Competition & Consumer Protection Commission',
    scope: 'FCCPA 2018, Digital Lending Regulatory Framework & Guidelines',
    code: 'FCCPA_2018_SEC_114',
    obligations: 'Fair debt recovery practices, interest rate transparency, privacy adherence for nano-loans',
  },
];

export function RegulatoryFrameworks() {
  return (
    <section id="frameworks" className="py-20 bg-white border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block mb-2">
            STATUTORY JURISDICTIONS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Comprehensive Nigerian Regulatory Coverage
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Continuous surveillance, atomic obligation decomposition, and deterministic rule evaluation 
            across all primary financial oversight bodies in Nigeria.
          </p>
        </div>

        {/* Unified Table-Style Grid Container */}
        <div className="mt-12 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {frameworks.map((item, idx) => (
              <div key={idx} className="p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-slate-900 tracking-tight">
                      {item.acronym}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active Register
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-1">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {item.scope}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Mandatory Controls
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    {item.obligations}
                  </p>
                  <div className="pt-1">
                    <span className="font-mono text-xs text-slate-600">
                      {item.code}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
