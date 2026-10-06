'use client';

import React, { useState, useEffect } from 'react';
import {
  ProductCategoryCode,
  PRODUCT_CATEGORY_CODES,
  RegulatorCode,
} from '@/shared/types';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertOctagon,
  Copy,
  Scale,
  Sparkles,
  RefreshCw,
  Tag,
} from 'lucide-react';

interface ClaimItem {
  id: string;
  productCategory: ProductCategoryCode;
  approvedText: string;
  prohibitedCounterpart: string | null;
  governingRegulator: RegulatorCode;
  statutoryCitation: string;
  ccoRationale: string;
  approvedAt: string;
}

interface ClaimsLedgerTabProps {
  initialCategory?: ProductCategoryCode;
  onApplyToDraft?: (text: string) => void;
}

const CATEGORY_LABELS: Record<ProductCategoryCode, string> = {
  SAVINGS_DEPOSIT: 'Savings & High-Yield Deposits (NDIC/CBN)',
  DIGITAL_NANO_LOAN: 'Digital Nano-Loans & Credit (FCCPC/CBN)',
  PAYMENTS_WALLET: 'Payments & Stored Value Wallets (CBN)',
  REMITTANCE_FX: 'Cross-Border Remittance & IMTO (CBN)',
  WEALTHTECH_INVEST: 'WealthTech & Securities Assets (SEC)',
};

export const ClaimsLedgerTab: React.FC<ClaimsLedgerTabProps> = ({
  initialCategory = 'SAVINGS_DEPOSIT',
  onApplyToDraft,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryCode | 'ALL'>('ALL');
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New claim modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<ProductCategoryCode>(initialCategory);
  const [newApprovedText, setNewApprovedText] = useState<string>('');
  const [newProhibitedText, setNewProhibitedText] = useState<string>('');
  const [newRegulator, setNewRegulator] = useState<RegulatorCode>('CBN');
  const [newCitation, setNewCitation] = useState<string>('CBN Consumer Protection Framework 2019 s.4.2');
  const [newRationale, setNewRationale] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const url =
        selectedCategory === 'ALL'
          ? '/api/marketing/claims-ledger'
          : `/api/marketing/claims-ledger?category=${selectedCategory}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data?.claims) {
        setClaims(json.data.claims);
      }
    } catch (err) {
      console.error('Failed to fetch claims ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [selectedCategory]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApprovedText.trim() || !newRationale.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marketing/claims-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCategory: newCategory,
          approvedText: newApprovedText.trim(),
          prohibitedCounterpart: newProhibitedText.trim() || undefined,
          governingRegulator: newRegulator,
          statutoryCitation: newCitation.trim(),
          ccoRationale: newRationale.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setNewApprovedText('');
        setNewProhibitedText('');
        setNewRationale('');
        await fetchClaims();
      } else {
        alert(json.error || 'Failed to save claim');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.approvedText.toLowerCase().includes(q) ||
      (c.prohibitedCounterpart && c.prohibitedCounterpart.toLowerCase().includes(q)) ||
      c.ccoRationale.toLowerCase().includes(q) ||
      c.statutoryCitation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-400" />
            <span>Institutional Claims Ledger (Memory Engine)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Reconciled phrasing bank ensuring CCO approvals travel across time, copywriters, and channels.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-purple-950/40 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Approved Phrasing</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-purple-600 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Categories ({claims.length})
          </button>
          {PRODUCT_CATEGORY_CODES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search approved claims..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
          <span className="text-xs">Loading institutional claims ledger...</span>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
          <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No approved claims found</p>
          <p className="text-xs text-slate-600 mt-1">
            Add approved copy phrasings or run a scan to auto-seed institutional memory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 hover:border-slate-700 transition-all space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-950/70 border border-purple-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300">
                    {claim.productCategory.replace(/_/g, ' ')}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                    {claim.governingRegulator}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(claim.approvedText, claim.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedId === claim.id ? 'Copied!' : 'Copy'}</span>
                  </button>
                  {onApplyToDraft && (
                    <button
                      onClick={() => onApplyToDraft(claim.approvedText)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 px-2.5 py-1 text-xs font-semibold transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Use in Draft</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Side by side approved vs prohibited */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-1">
                  <div className="text-[11px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>CCO-Approved Phrasing</span>
                  </div>
                  <p className="text-slate-100 font-medium leading-relaxed">
                    &ldquo;{claim.approvedText}&rdquo;
                  </p>
                </div>

                {claim.prohibitedCounterpart ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 space-y-1">
                    <div className="text-[11px] uppercase font-bold text-red-400 flex items-center gap-1">
                      <AlertOctagon className="h-3.5 w-3.5" />
                      <span>Prohibited Counterpart Replaced</span>
                    </div>
                    <p className="text-red-200 line-through leading-relaxed">
                      &ldquo;{claim.prohibitedCounterpart}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 text-slate-500 italic flex items-center justify-center">
                    Universal Approved Phrasing (No specific prohibited counterpart)
                  </div>
                )}
              </div>

              {/* Rationale & Statutory Citation */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-900 text-xs">
                <div className="text-slate-300">
                  <span className="text-slate-500 font-semibold mr-1.5">CCO RATIONALE:</span>
                  <span>{claim.ccoRationale}</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
                  <Scale className="h-3 w-3" />
                  <span>{claim.statutoryCitation}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Claim Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0B0F19] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-400" />
                <span>Add Phrasing to Institutional Claims Ledger</span>
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Product Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductCategoryCode)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    {PRODUCT_CATEGORY_CODES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Governing Regulator *</label>
                  <select
                    value={newRegulator}
                    onChange={(e) => setNewRegulator(e.target.value as RegulatorCode)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="CBN">CBN (Central Bank of Nigeria)</option>
                    <option value="ARCON">ARCON (Advertising Regulatory Council of Nigeria)</option>
                    <option value="SEC">SEC (Securities & Exchange Commission)</option>
                    <option value="FCCPC">FCCPC (Federal Competition & Consumer Protection)</option>
                    <option value="NDPC">NDPC (Nigeria Data Protection Commission)</option>
                    <option value="NFIU">NFIU (Nigerian Financial Intelligence Unit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Approved Copy Phrasing *</label>
                <textarea
                  rows={2}
                  value={newApprovedText}
                  onChange={(e) => setNewApprovedText(e.target.value)}
                  placeholder="e.g. Earn up to 22% annual yield on vetted assets. Capital at risk."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Prohibited Counterpart Replaced (Optional)
                </label>
                <input
                  type="text"
                  value={newProhibitedText}
                  onChange={(e) => setNewProhibitedText(e.target.value)}
                  placeholder="e.g. Guaranteed 22% risk-free returns"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Statutory Citation *</label>
                <input
                  type="text"
                  value={newCitation}
                  onChange={(e) => setNewCitation(e.target.value)}
                  placeholder="e.g. CBN Consumer Protection Framework 2019 s.4.2"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">CCO Legal Rationale *</label>
                <textarea
                  rows={2}
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  placeholder="Why is this phrasing approved? (e.g. Risk elimination prohibited; explicit capital risk disclosure required)."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
