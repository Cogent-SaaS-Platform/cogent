'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  Scale,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { MarketingChannel, ProductCategoryCode } from '@/shared/types';
import { PRODUCT_CATEGORIES_CATALOG } from '../types';

interface NewCampaignDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDraft: (data: {
    campaignName: string;
    productCategory: ProductCategoryCode;
    channel: MarketingChannel;
    targetAudience: string;
    rawCopy: string;
  }) => void;
  onRunScan: (data: {
    campaignName: string;
    productCategory: ProductCategoryCode;
    channel: MarketingChannel;
    targetAudience: string;
    rawCopy: string;
  }) => Promise<void>;
  isScanning: boolean;
  scanError?: string | null;
}

export const NewCampaignDrawer: React.FC<NewCampaignDrawerProps> = ({
  isOpen,
  onClose,
  onSaveDraft,
  onRunScan,
  isScanning,
  scanError,
}) => {
  const [campaignName, setCampaignName] = useState('');
  const [productCategory, setProductCategory] = useState<ProductCategoryCode>('DIGITAL_NANO_LOAN');
  const [channel, setChannel] = useState<MarketingChannel>('SMS_BLAST');
  const [targetAudience, setTargetAudience] = useState('');
  const [rawCopy, setRawCopy] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCategoryMeta = PRODUCT_CATEGORIES_CATALOG[productCategory];

  const handleUseSample = () => {
    setCampaignName(currentCategoryMeta.sampleCampaignTitle);
    setRawCopy(currentCategoryMeta.sampleCopy);
    setTargetAudience('Retail consumers and retail banking customers');
  };

  const handleDraftClick = () => {
    if (!campaignName.trim() && !rawCopy.trim()) {
      setLocalError('Please enter a campaign title or marketing copy to save as draft.');
      return;
    }
    setLocalError(null);
    onSaveDraft({
      campaignName: campaignName.trim() || 'Untitled Draft Campaign',
      productCategory,
      channel,
      targetAudience: targetAudience.trim(),
      rawCopy: rawCopy.trim(),
    });
    onClose();
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawCopy.trim()) {
      setLocalError('Please enter promotional copy to evaluate against Nigerian regulatory codes.');
      return;
    }
    setLocalError(null);
    await onRunScan({
      campaignName: campaignName.trim() || 'Untitled Campaign',
      productCategory,
      channel,
      targetAudience: targetAudience.trim(),
      rawCopy: rawCopy.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-y-auto animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Regulatory Pre-Vetting Studio
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">New Marketing Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleScanSubmit} className="p-6 space-y-6 flex-1">
          {/* Category Banner Preview Box */}
          <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative group">
            <div className="h-32 w-full overflow-hidden relative">
              <img
                src={currentCategoryMeta.bannerImage}
                alt={currentCategoryMeta.label}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300">
                  {currentCategoryMeta.regulator} Supervision
                </span>
                <span className="text-sm font-bold text-white">
                  {currentCategoryMeta.label}
                </span>
              </div>
            </div>
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                {currentCategoryMeta.statutoryBasis}
              </span>
              <button
                type="button"
                onClick={handleUseSample}
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
              >
                Load Sample Copy
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Campaign Title <span className="text-slate-900 font-bold">*</span>
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Easter Nano-Credit SMS Flash Promo"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Product Category <span className="text-slate-900 font-bold">*</span>
                </label>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value as ProductCategoryCode)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="DIGITAL_NANO_LOAN">Digital Nano-Loan (FCCPC / CBN)</option>
                  <option value="PAYMENTS_WALLET">Payments & Digital Wallet (CBN PSMD)</option>
                  <option value="REMITTANCE_FX">Remittance & FX (CBN IMTO)</option>
                  <option value="WEALTHTECH_INVEST">WealthTech & Investment (SEC)</option>
                  <option value="SAVINGS_DEPOSIT">Savings & Vault Deposit (CBN / NDIC)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Dissemination Channel <span className="text-slate-900 font-bold">*</span>
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as MarketingChannel)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="SMS_BLAST">SMS Blast (160 char limit)</option>
                  <option value="SOCIAL_MEDIA_POST">Social Media Post</option>
                  <option value="OUTDOOR_BILLBOARD">Outdoor Billboard (ARCON ASP Mandatory)</option>
                  <option value="LANDING_PAGE_WEBSITE">Landing Page / Web Display</option>
                  <option value="EMAIL_NEWSLETTER">Email Newsletter</option>
                  <option value="IN_APP_PUSH_NOTIFICATION">In-App Push Notification</option>
                  <option value="RADIO_TV_SCRIPT">Radio / TV Commercial</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Target Audience <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Retail borrowers, SMEs, diaspora senders"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Marketing Copy to Pre-Vet <span className="text-slate-900 font-bold">*</span>
                </label>
                <span className="font-mono text-[10px] text-slate-400">
                  {rawCopy.length} chars • {channel === 'SMS_BLAST' ? `${Math.ceil(rawCopy.length / 160) || 1} SMS` : 'Full Text'}
                </span>
              </div>
              <textarea
                rows={6}
                value={rawCopy}
                onChange={(e) => setRawCopy(e.target.value)}
                placeholder="Paste promotional captions, ad copy, broadcast SMS, or script to evaluate against ARCON Code 2022, CBN CPF 2019, FCCPC Guidelines, and SEC regulations..."
                className="w-full p-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
              />
            </div>
          </div>

          {(localError || scanError) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{localError || scanError}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDraftClick}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>

            <button
              type="submit"
              disabled={isScanning || !rawCopy.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Statutory Corpus...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Run Pre-Vet Scan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
