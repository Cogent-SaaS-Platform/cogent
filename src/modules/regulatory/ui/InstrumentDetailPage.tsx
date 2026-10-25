'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Share2,
  Copy,
  Check,
  FileText,
  User,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Scale,
  Clock,
} from 'lucide-react';
import { RegulatoryInstrumentPresentation } from '../types';

interface InstrumentDetailPageProps {
  instrument: RegulatoryInstrumentPresentation;
  onBack: () => void;
  onViewObligations: () => void;
  onViewDoc: () => void;
  onToggleStar: (instrumentId: string) => void;
}

export function InstrumentDetailPage({
  instrument,
  onBack,
  onViewObligations,
  onViewDoc,
  onToggleStar,
}: InstrumentDetailPageProps) {
  const [selectedOwner, setSelectedOwner] = useState<string>(
    instrument.owner || 'Chief Compliance Officer'
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);

  const formatJurisdiction = (code: string) => {
    switch (code) {
      case 'NG':
        return { name: 'Nigeria', flag: '🇳🇬' };
      case 'GH':
        return { name: 'Ghana', flag: '🇬🇭' };
      case 'KE':
        return { name: 'Kenya', flag: '🇰🇪' };
      case 'ZA':
        return { name: 'South Africa', flag: '🇿🇦' };
      case 'SUPRANATIONAL':
        return { name: 'Supranational', flag: '🌐' };
      default:
        return { name: 'Pan-African', flag: '🌍' };
    }
  };

  const jur = formatJurisdiction(instrument.jurisdiction);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(instrument.officialCitation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  // Substantive default key requirement areas if not explicitly provided
  const keyRequirementAreas = instrument.keyRequirements || [
    'Institutional Licensing & Capital Sufficiency: Maintenance of statutory capital floors, regulatory approval for capital reduction, and periodic capital adequacy assessments.',
    'Governance & Fit-and-Proper Approvals: Compulsory CBN/supervisory clearance for directors, designated executive officers, and compliance leads prior to formal appointment.',
    'Prudential Accounting & Inspection Readout: Maintaining transparent, audited statutory books, AML transaction recording, and submission of routine supervisory returns.',
    'Operational Risk & Systems Resilience: Implementation of dual authorization, cryptographic customer key security, and business continuity architecture.',
    'Statutory Sanction Schedules: Strict adherence to mandatory reporting intervals under threat of administrative fines and institutional license suspension.',
  ];

  const scopeInstitutions = instrument.scopeInstitutions || [
    'Commercial Banks (National & Regional)',
    'Merchant Banks & Investment Houses',
    'Microfinance Banks (MFBs)',
    'Payment Service Banks (PSBs)',
    'Switching & Processing Entities',
    'Mobile Money Operators (MMOs)',
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Regulation Library</span>
          </button>
          <span>/</span>
          <span className="text-slate-400">Regulatory Instrument List</span>
          <span>/</span>
          <span className="font-semibold text-slate-900 line-clamp-1">
            {instrument.shortTitle}
          </span>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleStar(instrument.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              instrument.isStarred
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                instrument.isStarred ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
              }`}
            />
            <span>{instrument.isStarred ? 'Starred' : 'Star'}</span>
          </button>

          <button
            type="button"
            onClick={onViewDoc}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>View Doc</span>
          </button>
        </div>
      </div>

      {/* 2. Instrument Header Details */}
      <div className="space-y-3">
        {/* Badges Bar */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            <span>{jur.flag}</span>
            <span>{jur.name}</span>
          </span>
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {instrument.regulatorName} ({instrument.regulator})
          </span>
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {instrument.instrumentType.replace(/_/g, ' ')}
          </span>
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {instrument.domain.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {instrument.fullTitle}
        </h1>

        {/* Citation & Enactment Subtitle */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-mono text-slate-600 font-medium">
            {instrument.officialCitation}
          </span>
          <span>·</span>
          <span>Enacted {instrument.year}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Active Statutory Law</span>
          </span>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Overview, Scope, Key Requirements) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overview
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed space-y-3">
              <p>
                {instrument.description || instrument.overviewSummary || (
                  <>
                    The {instrument.fullTitle} serves as the primary statutory framework governing
                    financial institutions and compliance responsibilities within {jur.name}. Enacted
                    under authoritative legislative mandate, this instrument establishes binding
                    prudential rules, supervisory inspection mechanisms, and civil/criminal penalty
                    schedules for non-compliance.
                  </>
                )}
              </p>
              <p>
                Supervised directly by {instrument.regulatorName}, the directive introduces continuous
                surveillance requirements, mandatory institutional disclosures, and formal fit-and-proper
                qualifications for executive officers. Financial institutions must align internal
                compliance controls, risk registers, and automated transaction monitoring systems with
                these statutory parameters.
              </p>
            </div>
          </div>

          {/* Section: Scope */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Scope of Applicability
            </h2>
            <p className="text-xs text-slate-600">
              The statutory provisions and decomposed obligations apply across the following licensed entities and market participants:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {scopeInstitutions.map((institution, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/70 rounded-lg text-xs text-slate-700"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{institution}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Key Requirement Areas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Key Requirement Areas
            </h2>
            <div className="space-y-3">
              {keyRequirementAreas.map((area, idx) => {
                const [title, ...desc] = area.split(':');
                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        0{idx + 1}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">
                        {title.trim()}
                      </h3>
                    </div>
                    {desc.length > 0 && (
                      <p className="text-xs text-slate-600 leading-relaxed pl-7">
                        {desc.join(':').trim()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar (Actions, CTAs, Source, Metadata) */}
        <div className="space-y-5">
          {/* Primary CTA: View Obligations */}
          <div className="bg-slate-900 text-white rounded-xl p-5 space-y-3.5 shadow-sm">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Statutory Registers
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Decomposed Obligations
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Review section-by-section decomposed compliance duties, assessment criteria, and penalty schedules.
              </p>
            </div>

            <button
              type="button"
              onClick={onViewObligations}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 rounded-lg shadow-xs transition-colors"
            >
              <span>View Obligations</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Actions Card: Owner & Sharing */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Actions & Ownership
            </h3>

            {/* Owner Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 font-medium">
                Assigned Regulatory Lead:
              </label>
              <div className="relative">
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Chief Compliance Officer">Chief Compliance Officer (CCO)</option>
                  <option value="Head of Legal & Regulatory">Head of Legal & Regulatory</option>
                  <option value="Chief Risk Officer">Chief Risk Officer (CRO)</option>
                  <option value="Head of Internal Audit">Head of Internal Audit</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>
            </div>

            {/* Share & Copy Link */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCitation}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                {copiedCitation ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedCitation ? 'Copied' : 'Citation'}</span>
              </button>
            </div>
          </div>

          {/* Details & Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Statutory Details
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Legal Classification</span>
                <span className="font-mono text-slate-900 font-medium">
                  {instrument.classification.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Enactment Year</span>
                <span className="font-mono text-slate-900">{instrument.year}</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Publication Date</span>
                <span className="font-mono text-slate-900">
                  {instrument.publicationDate || 'Gazette Verified'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Effective Date</span>
                <span className="font-mono text-slate-900">
                  {instrument.effectiveDate || 'In Force'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500">Decomposed Sections</span>
                <span className="font-mono font-bold text-slate-900">
                  {instrument.sectionsCount} Sections
                </span>
              </div>
            </div>

            {/* Official Source Link */}
            {instrument.sourceFileUrl && (
              <div className="pt-2 border-t border-slate-100">
                <a
                  href={instrument.sourceFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 font-medium"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Official Gazette Document ↗</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
