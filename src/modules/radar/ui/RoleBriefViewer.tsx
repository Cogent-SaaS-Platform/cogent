'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  ShieldCheck,
  Code2,
  Coins,
  Copy,
  Check,
  Sparkles,
  Building,
} from 'lucide-react';

export interface RoleBriefViewerProps {
  executiveBriefCco?: string;
  actionBriefCoo?: string;
  technicalBriefProductEng?: string;
  financialBriefCfo?: string;
  technicalBriefCto?: string;
  governanceBriefCeoCro?: string;
  circularNumber: string;
}

type RoleTab = 'cco' | 'cfo' | 'cto' | 'ceo_cro';

export function RoleBriefViewer({
  executiveBriefCco,
  actionBriefCoo,
  technicalBriefProductEng,
  financialBriefCfo,
  technicalBriefCto,
  governanceBriefCeoCro,
  circularNumber,
}: RoleBriefViewerProps) {
  const [activeTab, setActiveTab] = useState<RoleTab>('cco');
  const [copiedRole, setCopiedRole] = useState<RoleTab | null>(null);

  const getBriefContent = (tab: RoleTab): string => {
    switch (tab) {
      case 'cco':
        return (
          executiveBriefCco ||
          'Statutory obligations, regulatory filing timelines, and mandatory sanctions for default under Nigerian financial regulations.'
        );
      case 'cfo':
        return (
          financialBriefCfo ||
          'Reserve capital ratios, minimum liquidity buffers, interchange fee caps, and institutional balance sheet exposure.'
        );
      case 'cto':
        return (
          technicalBriefCto ||
          technicalBriefProductEng ||
          'System architecture, API specifications, authentication limit modifications (2FA thresholds), KYC schema changes, and audit trail retention.'
        );
      case 'ceo_cro':
        return (
          governanceBriefCeoCro ||
          actionBriefCoo ||
          'Enterprise governance, Board Risk Committee reporting, systemic risk containment, operational continuity, and settlement cut-off windows.'
        );
    }
  };

  const handleCopy = (tab: RoleTab) => {
    const text = getBriefContent(tab);
    navigator.clipboard.writeText(text);
    setCopiedRole(tab);
    setTimeout(() => setCopiedRole(null), 2000);
  };

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('cogent_user_role') : null;
  const executiveTabLabel = userRole ? `${userRole} / Legal` : 'Executive / Legal';

  const tabs: Array<{
    id: RoleTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'cco',
      label: executiveTabLabel,
      sublabel: 'Statutory Mandates & Fines',
      icon: <ShieldCheck className="h-4 w-4 text-[#2A4BFF]" />,
    },
    {
      id: 'cfo',
      label: 'CFO / Treasury',
      sublabel: 'Capital Reserves & Margins',
      icon: <Coins className="h-4 w-4 text-[#10B981]" />,
    },
    {
      id: 'cto',
      label: 'CTO / Product & Eng',
      sublabel: 'APIs, 2FA & Auth Thresholds',
      icon: <Code2 className="h-4 w-4 text-[#7C3AED]" />,
    },
    {
      id: 'ceo_cro',
      label: 'CEO / CRO Governance',
      sublabel: 'Board Risk & Oversight',
      icon: <Briefcase className="h-4 w-4 text-[#F59E0B]" />,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#DDE3EE] bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E8EDF5] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#2A4BFF]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B0F1A]">
              Multi-Role Departmental Impact Briefs
            </h3>
            <p className="text-[11px] text-[#4B5565]">
              Tailored synthesis generated for executive leadership teams
            </p>
          </div>
        </div>

        <button
          onClick={() => handleCopy(activeTab)}
          className="btn-base btn-secondary btn-xs gap-1.5 self-start sm:self-auto"
          title="Copy active role brief"
        >
          {copiedRole === activeTab ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#10B981]" />
              <span className="text-[#10B981]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-[#4B5565]" />
              <span>Copy Brief</span>
            </>
          )}
        </button>
      </div>

      {/* Segmented Role Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 ${
                isActive
                  ? 'border-[#2A4BFF] bg-[#EEF2FF]/50 shadow-2xs'
                  : 'border-[#DDE3EE] bg-[#F9FAFC] hover:bg-[#F5F6FA]'
              }`}
            >
              <div className="flex items-center justify-between">
                {tab.icon}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A4BFF]" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-[#0B0F1A] block">
                  {tab.label}
                </span>
                <span className="text-[10px] text-[#4B5565] block truncate">
                  {tab.sublabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Brief Content Card */}
      <div className="p-4 rounded-xl bg-[#F9FAFC] border border-[#E8EDF5] space-y-2">
        <div className="flex items-center justify-between text-xs border-b border-[#E8EDF5] pb-2">
          <span className="font-bold text-[#0B0F1A]">
            {tabs.find((t) => t.id === activeTab)?.label} Directive Memo
          </span>
          <span className="font-mono text-[10px] text-[#8D99AE]">
            Directive: {circularNumber}
          </span>
        </div>
        <p className="text-xs text-[#0B0F1A] leading-relaxed whitespace-pre-line pt-1">
          {getBriefContent(activeTab)}
        </p>
      </div>
    </div>
  );
}
