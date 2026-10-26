'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Scale,
  Layers,
  ArrowRight,
  RefreshCw,
  Building2,
  CreditCard,
  Briefcase,
} from 'lucide-react';
import { LicenseType, PaymentRail } from '@/shared/types';
import { TenantBootstrapResult } from '../services/tenantBootstrapService';

const AVAILABLE_LICENSES: Array<{ id: LicenseType; label: string; regulator: string }> = [
  { id: 'COMMERCIAL_BANK', label: 'Commercial Banking Institution', regulator: 'CBN' },
  { id: 'PAYMENT_SERVICE_BANK', label: 'Payment Service Bank (PSB)', regulator: 'CBN' },
  { id: 'MICROFINANCE_BANK_NATIONAL', label: 'Microfinance Bank (National / State)', regulator: 'CBN' },
  { id: 'FINANCE_COMPANY', label: 'Licensed Finance Company', regulator: 'CBN' },
  { id: 'SWITCHING_AND_PROCESSING', label: 'Switching and Processing Company', regulator: 'CBN' },
  { id: 'PAYMENT_SOLUTION_SERVICES_PSSP', label: 'Payment Solution Service Provider (PSSP)', regulator: 'CBN' },
  { id: 'DIGITAL_LENDER_FCCPC_REGISTERED', label: 'Digital Lending Platform (Registered)', regulator: 'FCCPC' },
  { id: 'CRYPTO_VASP_SEC_APPROVED', label: 'Digital Assets / VASP Operator', regulator: 'SEC' },
];

const AVAILABLE_RAILS: Array<{ id: PaymentRail; label: string }> = [
  { id: 'NIBSS_NIP', label: 'NIBSS Instant Payment (NIP)' },
  { id: 'CARD_ACQUIRING_MASTERCARD_VISA', label: 'Card Acquiring (Mastercard / Visa)' },
  { id: 'CARD_ACQUIRING_VERVE', label: 'Card Acquiring (Verve Scheme)' },
  { id: 'USSD', label: 'USSD Financial Shortcodes' },
  { id: 'DIRECT_DEBIT_ACH', label: 'Direct Debit / Automated Clearing House' },
  { id: 'PAYSTACK', label: 'Paystack Gateway Integration' },
  { id: 'FLUTTERWAVE', label: 'Flutterwave Payment Rails' },
];

export function RapidOnboardingFlow() {
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>('COMMERCIAL_BANK');
  const [selectedRails, setSelectedRails] = useState<PaymentRail[]>([
    'NIBSS_NIP',
    'CARD_ACQUIRING_MASTERCARD_VISA',
  ]);
  const [policyManualText, setPolicyManualText] = useState<string>('');
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(false);
  const [result, setResult] = useState<TenantBootstrapResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleRail = (rail: PaymentRail) => {
    setSelectedRails((prev) =>
      prev.includes(rail) ? prev.filter((r) => r !== rail) : [...prev, rail]
    );
  };

  const handleBootstrap = async () => {
    setIsBootstrapping(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/onboarding/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseType: selectedLicense,
          paymentRails: selectedRails,
          policyManualText: policyManualText.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setResult(json.data);
      } else {
        setErrorMsg(json.error || 'Failed to bootstrap tenant profile');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during bootstrap');
    } finally {
      setIsBootstrapping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Onboarding Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Institutional Rapid Onboarding & Baseline Matrix
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Select institutional regulatory license and settlement rails to generate an anchored obligation register and baseline departmental readiness.
        </p>
      </div>

      {!result ? (
        <div className="space-y-6">
          {/* Step 1: License Selection */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <Building2 className="w-4 h-4 text-slate-600" />
              1. Institutional License Scope
            </div>
            <p className="text-xs text-slate-500">
              Select the primary operating license issued to your institution.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
              {AVAILABLE_LICENSES.map((lic) => (
                <button
                  key={lic.id}
                  type="button"
                  onClick={() => setSelectedLicense(lic.id)}
                  className={`flex items-start justify-between p-3 rounded-lg border text-left transition-all ${
                    selectedLicense === lic.id
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{lic.label}</div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                      Supervised by {lic.regulator}
                    </div>
                  </div>
                  {selectedLicense === lic.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Payment Rails Scope */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <CreditCard className="w-4 h-4 text-slate-600" />
              2. Active Settlement & Payment Rails
            </div>
            <p className="text-xs text-slate-500">
              Identify settlement rails and acquiring channels active in your institution.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {AVAILABLE_RAILS.map((rail) => {
                const isSelected = selectedRails.includes(rail.id);
                return (
                  <button
                    key={rail.id}
                    type="button"
                    onClick={() => toggleRail(rail.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 font-medium text-slate-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span>{rail.label}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Optional Policy Manual Text */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <FileText className="w-4 h-4 text-slate-600" />
              3. Operational Policy Manual (Optional Instant Concordance)
            </div>
            <p className="text-xs text-slate-500">
              Paste internal compliance manual or risk governance policy to evaluate baseline statutory concordance.
            </p>

            <textarea
              value={policyManualText}
              onChange={(e) => setPolicyManualText(e.target.value)}
              placeholder="Paste excerpt of institutional AML/CFT policy, credit risk manual, or cybersecurity governance framework..."
              rows={4}
              className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {errorMsg && (
            <div className="bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-lg text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleBootstrap}
              disabled={isBootstrapping}
              className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-lg text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
            >
              {isBootstrapping ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing Statutory Posture...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Bootstrap Institutional Compliance Posture
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Institutional Posture Active
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Onboarding completed in {result.timeToValueSeconds}s. Matched {result.matchedCircularsCount} active statutory directives.
              </p>
            </div>
            <button
              onClick={() => setResult(null)}
              className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              Reconfigure License
            </button>
          </div>

          {/* Pulse Strip / Metrics */}
          <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200 shadow-xs">
            <div className="p-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Applicable Circulars
              </div>
              <div className="mt-1 text-slate-900 font-mono text-2xl font-bold tracking-tight">
                {result.matchedCircularsCount}
              </div>
              <div className="mt-1 text-xs text-slate-500">Past 90 Days Monitored</div>
            </div>

            <div className="p-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Registered Obligations
              </div>
              <div className="mt-1 text-slate-900 font-mono text-2xl font-bold tracking-tight">
                {result.obligationRegister.totalObligationsRegistered}
              </div>
              <div className="mt-1 text-xs text-slate-500">Anchored Character Spans</div>
            </div>

            <div className="p-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Baseline Readiness
              </div>
              <div className="mt-1 text-slate-900 font-mono text-2xl font-bold tracking-tight">
                88%
              </div>
              <div className="mt-1 text-xs text-slate-500">Across 6 Supervisory Roles</div>
            </div>

            <div className="p-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Time-to-Value
              </div>
              <div className="mt-1 text-slate-900 font-mono text-2xl font-bold tracking-tight">
                {result.timeToValueSeconds}s
              </div>
              <div className="mt-1 text-xs text-slate-500">Zero Manual Seeding Required</div>
            </div>
          </div>

          {/* Departmental Readiness Breakdown */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
            <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Departmental Governance & Role Alignment
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(result.departmentalReadiness).map(([roleKey, roleData]) => (
                <div key={roleKey} className="p-3.5 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      {roleData.roleName}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-900">
                      {roleData.baselineReadinessScore}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {roleData.applicableObligationsCount} Applicable Statutory Mandates
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 pt-1">
                    {roleData.topActionItems.slice(0, 2).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Matched Circulars Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
              Matched Regulatory Feed
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Regulator</th>
                    <th className="px-4 py-3 font-mono">Reference</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Publication Date</th>
                    <th className="px-4 py-3">Relevance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.matchedCirculars.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{c.regulator}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {c.circularNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{c.subject}</td>
                      <td className="px-4 py-3 text-slate-500">{c.publicationDate}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {c.relevanceScore}% Matched
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
