'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileText,
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
  }> = [
    {
      id: 'cco',
      label: executiveTabLabel,
      sublabel: 'Statutory Mandates & Fines',
    },
    {
      id: 'cfo',
      label: 'CFO / Treasury',
      sublabel: 'Capital Reserves & Margins',
    },
    {
      id: 'cto',
      label: 'CTO / Product & Eng',
      sublabel: 'APIs, 2FA & Auth Thresholds',
    },
    {
      id: 'ceo_cro',
      label: 'CEO / CRO Governance',
      sublabel: 'Board Risk & Oversight',
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-700">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Departmental Impact Briefs
            </h3>
            <p className="text-xs text-slate-500">
              Operational synthesis for executive leadership teams
            </p>
          </div>
        </div>

        <button
          onClick={() => handleCopy(activeTab)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded shadow-xs transition-colors self-start sm:self-auto"
          title="Copy active role brief"
        >
          {copiedRole === activeTab ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-500" />
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
              className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between space-y-1 ${
                isActive
                  ? 'border-slate-900 bg-white ring-1 ring-slate-900 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 block">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                )}
              </div>
              <span className="text-[11px] text-slate-500 block truncate">
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Brief Content Card */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
          <span className="font-semibold text-slate-800">
            {tabs.find((t) => t.id === activeTab)?.label} Directive Memo
          </span>
          <span className="font-mono text-xs text-slate-500">
            Directive: {circularNumber}
          </span>
        </div>
        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line pt-1">
          {getBriefContent(activeTab)}
        </p>
      </div>
    </div>
  );
}
