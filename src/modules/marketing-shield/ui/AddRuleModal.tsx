'use client';

import React, { useState } from 'react';
import { X, Plus, BookOpen, AlertCircle } from 'lucide-react';
import { ProductCategoryCode, MarketingChannel } from '@/shared/types';

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRuleAdded: () => void;
}

export const AddRuleModal: React.FC<AddRuleModalProps> = ({
  isOpen,
  onClose,
  onRuleAdded,
}) => {
  const [title, setTitle] = useState('');
  const [regulatorCode, setRegulatorCode] = useState('CBN');
  const [statutoryCitation, setStatutoryCitation] = useState('');
  const [verbatimClause, setVerbatimClause] = useState('');
  const [prohibitedInput, setProhibitedInput] = useState('');
  const [disclosuresInput, setDisclosuresInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !verbatimClause.trim()) {
      setErrorMsg('Title and Verbatim Statutory Clause are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const prohibitedTerms = prohibitedInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const mandatoryDisclosures = disclosuresInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/marketing/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          regulatorCode,
          statutoryCitation: statutoryCitation || `${regulatorCode} Regulatory Guidelines`,
          verbatimClause,
          prohibitedTerms,
          mandatoryDisclosures,
          appliesToCategories: ['DIGITAL_NANO_LOAN', 'WEALTHTECH_INVEST', 'SAVINGS_DEPOSIT', 'PAYMENTS_WALLET', 'REMITTANCE_FX'],
          appliesToChannels: ['SMS_BLAST', 'SOCIAL_MEDIA_POST', 'LANDING_PAGE_WEBSITE', 'EMAIL_NEWSLETTER', 'OUTDOOR_BILLBOARD'],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create rule');
      }

      onRuleAdded();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Add Statutory Marketing Rule
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Rule Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prohibition of Unsubstantiated FX Transfer Speed Claims"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Governing Regulator *
              </label>
              <select
                value={regulatorCode}
                onChange={(e) => setRegulatorCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="ARCON">ARCON</option>
                <option value="CBN">CBN</option>
                <option value="FCCPC">FCCPC</option>
                <option value="SEC">SEC</option>
                <option value="NDIC">NDIC</option>
                <option value="INTERNAL_POLICY">Internal Compliance Policy</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Statutory Citation
              </label>
              <input
                type="text"
                value={statutoryCitation}
                onChange={(e) => setStatutoryCitation(e.target.value)}
                placeholder="e.g. CBN IMTO Guidelines 2024 §4.2"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Verbatim Statutory Clause / Requirement *
            </label>
            <textarea
              rows={3}
              value={verbatimClause}
              onChange={(e) => setVerbatimClause(e.target.value)}
              placeholder="Enter exact regulatory clause or internal compliance requirement..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Prohibited Phrases (comma-separated)
            </label>
            <input
              type="text"
              value={prohibitedInput}
              onChange={(e) => setProhibitedInput(e.target.value)}
              placeholder="instant money guaranteed, zero fx fees, no commission"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Mandatory Disclosures (comma-separated)
            </label>
            <input
              type="text"
              value={disclosuresInput}
              onChange={(e) => setDisclosuresInput(e.target.value)}
              placeholder="Licensed by CBN as an IMTO, Subject to FX settlement conditions"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Adding...' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
