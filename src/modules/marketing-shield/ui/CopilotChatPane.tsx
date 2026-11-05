'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Check,
  AlertTriangle,
  Scale,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  Layers,
  FileText,
} from 'lucide-react';
import {
  CampaignChatMessage,
  StructuredFinding,
  ProductCategoryMetadata,
  PRODUCT_CATEGORIES_CATALOG,
} from '../types';
import { ProductCategoryCode, MarketingChannel } from '@/shared/types';
import { AttachAssetModal } from './AttachAssetModal';

interface CopilotChatPaneProps {
  campaignId: string;
  messages: CampaignChatMessage[];
  productCategory: ProductCategoryCode;
  channel: MarketingChannel;
  canvasContent: string;
  onApplyFixToCanvas: (suggestedRewrite: string, claimElement?: string) => void;
  onSendMessage: (content: string, context: {
    productCategory: ProductCategoryCode;
    channel: MarketingChannel;
    scopedRegulations: string[];
    attachedAssetBase64?: string;
    attachedAssetMimeType?: string;
  }) => Promise<void>;
  onCategoryChange: (cat: ProductCategoryCode) => void;
  onChannelChange: (chan: MarketingChannel) => void;
  attachedAssetUrl?: string | null;
  attachedAssetType?: 'IMAGE' | 'PDF' | 'URL' | null;
}

export const CopilotChatPane: React.FC<CopilotChatPaneProps> = ({
  campaignId,
  messages,
  productCategory,
  channel,
  canvasContent,
  onApplyFixToCanvas,
  onSendMessage,
  onCategoryChange,
  onChannelChange,
  attachedAssetUrl,
  attachedAssetType,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [scopedRegulations, setScopedRegulations] = useState<string[]>(['ALL']);
  const [attachedBase64, setAttachedBase64] = useState<string | undefined>();
  const [attachedMime, setAttachedMime] = useState<string | undefined>();
  const [attachedLabel, setAttachedLabel] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async () => {
    if (!inputText.trim() && !attachedBase64) return;
    try {
      setIsSending(true);
      const text = inputText;
      setInputText('');
      await onSendMessage(text, {
        productCategory,
        channel,
        scopedRegulations,
        attachedAssetBase64: attachedBase64,
        attachedAssetMimeType: attachedMime,
      });
      setAttachedBase64(undefined);
      setAttachedMime(undefined);
      setAttachedLabel(null);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Copilot State */}
        {messages.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Cogent Marketing Compliance Copilot
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ask anything, paste promotional copy, or upload a creative flyer. I evaluate claims in real time against binding Nigerian regulations in your Knowledge Base (ARCON Act 2022, CBN Consumer Protection Framework, FCCPC Digital Lending Guidelines, and SEC rules).
            </p>
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Quick prompts:</span>
              <button
                type="button"
                onClick={() => setInputText('Check our headline against CBN and ARCON guarantee prohibitions.')}
                className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                &ldquo;Check for guarantee prohibitions&rdquo;
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setInputText('What mandatory APR and license disclosures are required for this channel?')}
                className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                &ldquo;Required APR &amp; license disclosures&rdquo;
              </button>
            </div>
          </div>
        )}

        {/* Conversation Stream */}
        {messages.map((msg) => {
          const isUser = msg.role === 'USER';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <span>{isUser ? 'Marketer' : 'Compliance Copilot'}</span>
                <span>•</span>
                <span className="font-normal text-slate-600">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`max-w-[95%] rounded-lg p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none shadow-2xs space-y-3'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Structured Findings Table (Drata GPT style: Ref Video 1 00:08) */}
                {!isUser && msg.structuredFindingsJson && msg.structuredFindingsJson.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Regulatory Findings ({msg.structuredFindingsJson.length})
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                        <Scale className="h-3 w-3 text-slate-600" />
                        Statutory Evidence
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <th className="py-1.5 px-2.5 font-semibold">Flagged Element</th>
                            <th className="py-1.5 px-2.5 font-semibold">Rule & Citation</th>
                            <th className="py-1.5 px-2.5 font-semibold">Compliance Gap & Required Fix</th>
                            <th className="py-1.5 px-2.5 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {msg.structuredFindingsJson.map((finding) => (
                            <tr key={finding.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2 px-2.5 font-mono font-medium text-slate-900 align-top">
                                {finding.severity === 'BLOCKING_ISSUE' ? (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[11px] font-medium inline-block">
                                    &ldquo;{finding.claimElement}&rdquo;
                                  </span>
                                ) : (
                                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[11px] font-medium inline-block">
                                    &ldquo;{finding.claimElement}&rdquo;
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2.5 align-top">
                                <div className="font-semibold text-slate-800">{finding.regulatoryRule}</div>
                                <div className="font-mono text-[10px] text-slate-600">{finding.statutoryCitation}</div>
                              </td>
                              <td className="py-2 px-2.5 text-slate-600 align-top">
                                <div>{finding.complianceGap}</div>
                                <div className="mt-1 text-slate-800 font-medium text-[10px]">
                                  Remediation: {finding.requiredFix}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-right align-top">
                                {finding.suggestedRewrite && (
                                  <button
                                    onClick={() => onApplyFixToCanvas(finding.suggestedRewrite, finding.claimElement)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-[10px] transition-colors cursor-pointer shrink-0"
                                    title="Replace in live canvas"
                                  >
                                    <span>Apply Fix</span>
                                    <ArrowRight className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-ping" />
            <span>Evaluating statutory concordance against Regulation Library...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Composer Box (Modeled on Drata GPT: Ref Video 1 00:03 - 00:06) */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="border border-slate-300 focus-within:border-slate-800 rounded-lg p-2.5 bg-white shadow-2xs transition-all space-y-2">
          {/* Attached asset pill if present */}
          {attachedLabel && (
            <div className="flex items-center justify-between bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs border border-slate-200">
              <span className="font-medium truncate max-w-xs">{attachedLabel}</span>
              <button
                type="button"
                onClick={() => {
                  setAttachedBase64(undefined);
                  setAttachedMime(undefined);
                  setAttachedLabel(null);
                }}
                className="text-slate-400 hover:text-slate-600 ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Text Input Area */}
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, paste ad copy, or request a compliant rewrite..."
            className="w-full text-xs text-slate-900 placeholder:text-slate-600 focus:outline-none resize-none bg-transparent"
          />

          {/* Bottom Control Row inside Composer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            {/* Left Context Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Product Category Selector */}
              <select
                value={productCategory}
                onChange={(e) => onCategoryChange(e.target.value as ProductCategoryCode)}
                className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-none"
              >
                <option value="DIGITAL_NANO_LOAN">Digital Nano-Loan</option>
                <option value="WEALTHTECH_INVEST">WealthTech / Invest</option>
                <option value="SAVINGS_DEPOSIT">Savings & Deposit</option>
                <option value="PAYMENTS_WALLET">Payments & Wallet</option>
                <option value="REMITTANCE_FX">Remittance & FX</option>
              </select>

              {/* Channel Selector */}
              <select
                value={channel}
                onChange={(e) => onChannelChange(e.target.value as MarketingChannel)}
                className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-none"
              >
                <option value="SOCIAL_MEDIA_POST">Social Post / Flyer</option>
                <option value="SMS_BLAST">SMS (160 chars)</option>
                <option value="LANDING_PAGE_WEBSITE">Landing Page / Web</option>
                <option value="EMAIL_NEWSLETTER">Email / Newsletter</option>
                <option value="OUTDOOR_BILLBOARD">Billboard / Script</option>
              </select>

              {/* Regulations Scope Dropdown */}
              <select
                value={scopedRegulations[0] || 'ALL'}
                onChange={(e) => setScopedRegulations([e.target.value])}
                className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Nigerian Rules</option>
                <option value="ARCON">ARCON Code 2022</option>
                <option value="CBN">CBN Consumer Protection</option>
                <option value="FCCPC">FCCPC Digital Lending</option>
                <option value="SEC">SEC Capital Rules</option>
                <option value="NDIC">NDIC Deposit Rules</option>
              </select>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => setIsAttachModalOpen(true)}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Attach creative flyer image, PDF, or URL"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || (!inputText.trim() && !attachedBase64)}
                className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
                title="Send to Copilot"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attach Modal */}
      <AttachAssetModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        onAttach={(data) => {
          if (data.assetType === 'URL') {
            setAttachedLabel(`Webpage: ${data.assetUrl}`);
            setInputText((prev) => prev ? `${prev}\n\nURL to audit: ${data.assetUrl}` : `Please audit this live webpage: ${data.assetUrl}`);
          } else {
            setAttachedBase64(data.base64Data);
            setAttachedMime(data.mimeType);
            setAttachedLabel(`Creative Asset: ${data.assetType}`);
          }
        }}
      />
    </div>
  );
};
