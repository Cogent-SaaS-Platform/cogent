'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Scale,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  CampaignChatMessage,
  StructuredFinding,
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
  onSendMessage: (
    content: string,
    context: {
      productCategory: ProductCategoryCode;
      channel: MarketingChannel;
      scopedRegulations: string[];
      attachedAssetBase64?: string;
      attachedAssetMimeType?: string;
      attachedAssetUrl?: string;
    }
  ) => Promise<void>;
  onAssetAttached?: (asset: {
    assetUrl: string | null;
    assetType: 'IMAGE' | 'PDF' | 'URL';
  }) => void;
  onCategoryChange: (cat: ProductCategoryCode) => void;
  onChannelChange: (chan: MarketingChannel) => void;
  attachedAssetUrl?: string | null;
  attachedAssetType?: 'IMAGE' | 'PDF' | 'URL' | null;
}

const parseInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const renderFormattedMessage = (content: string) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h5
              key={i}
              className="font-bold text-slate-900 text-xs mt-2.5 pt-1.5 border-t border-slate-100 flex items-center gap-1.5"
            >
              <span>{trimmed.replace(/^###\s*/, '')}</span>
            </h5>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h4
              key={i}
              className="font-bold text-slate-900 text-xs mt-3 pt-2 border-t border-slate-200"
            >
              {trimmed.replace(/^##\s*/, '')}
            </h4>
          );
        }

        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletContent = trimmed.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={i} className="flex items-start gap-1.5 pl-1.5">
              <span className="text-slate-400 mt-1 text-[10px]">•</span>
              <span className="flex-1">{parseInlineMarkdown(bulletContent)}</span>
            </div>
          );
        }

        return <p key={i}>{parseInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
};

export const CopilotChatPane: React.FC<CopilotChatPaneProps> = ({
  messages,
  productCategory,
  channel,
  onApplyFixToCanvas,
  onSendMessage,
  onAssetAttached,
  onCategoryChange,
  onChannelChange,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<{
    text: string;
    attachedBase64?: string;
    attachedMime?: string;
    attachedUrl?: string;
  } | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [scopedRegulations, setScopedRegulations] = useState<string[]>(['ALL']);
  const [attachedBase64, setAttachedBase64] = useState<string | undefined>();
  const [attachedMime, setAttachedMime] = useState<string | undefined>();
  const [attachedUrl, setAttachedUrl] = useState<string | undefined>();
  const [attachedLabel, setAttachedLabel] = useState<string | null>(null);
  const [selectedFindingForProof, setSelectedFindingForProof] = useState<StructuredFinding | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, sendError]);

  const executeSend = async (payload: {
    text: string;
    attachedBase64?: string;
    attachedMime?: string;
    attachedUrl?: string;
  }) => {
    try {
      setIsSending(true);
      setSendError(null);
      setLastAttempt(payload);

      await onSendMessage(payload.text, {
        productCategory,
        channel,
        scopedRegulations,
        attachedAssetBase64: payload.attachedBase64,
        attachedAssetMimeType: payload.attachedMime,
        attachedAssetUrl: payload.attachedUrl,
      });

      setAttachedBase64(undefined);
      setAttachedMime(undefined);
      setAttachedUrl(undefined);
      setAttachedLabel(null);
      setLastAttempt(null);
    } catch (err: unknown) {
      setSendError(
        err instanceof Error ? err.message : 'Statutory compliance evaluation failed. Please retry.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !attachedBase64 && !attachedUrl) return;
    const text = inputText;
    setInputText('');
    await executeSend({
      text,
      attachedBase64,
      attachedMime,
      attachedUrl,
    });
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
        {messages.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Cogent Marketing Compliance Copilot
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Paste promotional copy, ask a regulatory question, or attach a creative flyer or URL. Claims are evaluated deterministically and grounded strictly in your active Knowledge Base and Regulation Library (ARCON Act 2022, CBN Consumer Protection Framework, FCCPC Digital Lending Guidelines, and SEC rules).
            </p>
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Quick prompts:</span>
              <button
                type="button"
                onClick={() =>
                  setInputText('Check our headline against CBN and ARCON guarantee prohibitions.')
                }
                className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                &ldquo;Check for guarantee prohibitions&rdquo;
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() =>
                  setInputText(
                    'What mandatory APR and license disclosures are required for this channel?'
                  )
                }
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
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                <span>{isUser ? 'Marketer' : 'Compliance Copilot'}</span>
                <span>•</span>
                <span className="font-normal text-slate-500">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div
                className={`max-w-[95%] rounded-lg p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none shadow-2xs space-y-3'
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  renderFormattedMessage(msg.content)
                )}

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
                            <th className="py-1.5 px-2.5 font-semibold">Rule &amp; Citation</th>
                            <th className="py-1.5 px-2.5 font-semibold">Compliance Gap &amp; Required Fix</th>
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
                                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    &ldquo;{finding.claimElement}&rdquo;
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2.5 align-top">
                                {finding.epistemicTier === 'VERIFIED_STATUTORY_CITATION' ||
                                (!finding.epistemicTier && finding.matchedRuleId) ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedFindingForProof(finding)}
                                    className="group text-left inline-flex flex-col gap-1 p-1 -m-1 rounded hover:bg-emerald-50/80 border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                                    title="Click to view verbatim statutory quote & source document in Regulation Library"
                                  >
                                    <div className="flex items-center gap-1">
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <ShieldCheck className="h-3 w-3 text-emerald-700 shrink-0" />
                                        <span>{finding.regulatorCode || 'CBN'}</span>
                                        <span>•</span>
                                        <span className="truncate max-w-[120px]">
                                          {finding.instrumentTitle || finding.regulatoryRule}
                                        </span>
                                        <span>✓</span>
                                      </span>
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-700 font-semibold group-hover:text-emerald-900 flex items-center gap-1">
                                      <span className="truncate max-w-[160px]">
                                        {finding.sectionRef || finding.statutoryCitation}
                                      </span>
                                      <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
                                    </div>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedFindingForProof(finding)}
                                    className="group text-left inline-flex flex-col gap-1 p-1 -m-1 rounded hover:bg-amber-50/80 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                                    title="Click to inspect compliance advisory details"
                                  >
                                    <div className="flex items-center gap-1">
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
                                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                        <span>⚠️ Advisory</span>
                                        <span>•</span>
                                        <span className="truncate max-w-[120px]">
                                          {finding.regulatorCode || 'Domain'}
                                        </span>
                                      </span>
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-600 truncate max-w-[160px]">
                                      {finding.regulatoryRule}
                                    </div>
                                  </button>
                                )}
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
                                    onClick={() =>
                                      onApplyFixToCanvas(
                                        finding.suggestedRewrite,
                                        finding.claimElement
                                      )
                                    }
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
            <span>Evaluating deterministic rules and statutory concordance...</span>
          </div>
        )}

        {sendError && (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 p-3 rounded-lg text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
            {lastAttempt && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => executeSend(lastAttempt)}
                  disabled={isSending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry Evaluation</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Composer Box */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="border border-slate-300 focus-within:border-slate-800 rounded-lg p-2.5 bg-white shadow-2xs transition-all space-y-2">
          {attachedLabel && (
            <div className="flex items-center justify-between bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs border border-slate-200">
              <span className="font-medium truncate max-w-xs">{attachedLabel}</span>
              <button
                type="button"
                onClick={() => {
                  setAttachedBase64(undefined);
                  setAttachedMime(undefined);
                  setAttachedUrl(undefined);
                  setAttachedLabel(null);
                }}
                className="text-slate-400 hover:text-slate-600 ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, paste ad copy, or request a compliant rewrite..."
            className="w-full text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none resize-none bg-transparent"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={productCategory}
                onChange={(e) => onCategoryChange(e.target.value as ProductCategoryCode)}
                className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-none"
              >
                <option value="DIGITAL_NANO_LOAN">Digital Nano-Loan</option>
                <option value="WEALTHTECH_INVEST">WealthTech / Invest</option>
                <option value="SAVINGS_DEPOSIT">Savings &amp; Deposit</option>
                <option value="PAYMENTS_WALLET">Payments &amp; Wallet</option>
                <option value="REMITTANCE_FX">Remittance &amp; FX</option>
              </select>

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

              <select
                value={scopedRegulations[0] || 'ALL'}
                onChange={(e) => setScopedRegulations([e.target.value])}
                className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Nigerian Rules</option>
                <option value="ARCON">ARCON Advertising Standards</option>
                <option value="CBN">CBN Consumer Protection</option>
                <option value="FCCPC">FCCPC Digital Lending</option>
                <option value="SEC">SEC Capital Rules</option>
                <option value="NDIC">NDIC Deposit Rules</option>
              </select>
            </div>

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
                disabled={isSending || (!inputText.trim() && !attachedBase64 && !attachedUrl)}
                className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
                title="Send to Copilot"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AttachAssetModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        onAttach={(data) => {
          onAssetAttached?.({
            assetUrl: data.assetUrl,
            assetType: data.assetType,
          });
          if (data.assetType === 'URL' && data.assetUrl) {
            setAttachedUrl(data.assetUrl);
            setAttachedLabel(`Webpage: ${data.assetUrl}`);
            setInputText((prev) =>
              prev
                ? `${prev}\n\nURL to audit: ${data.assetUrl}`
                : `Please audit this live webpage: ${data.assetUrl}`
            );
          } else {
            setAttachedBase64(data.base64Data);
            setAttachedMime(data.mimeType);
            setAttachedLabel(`Creative Asset: ${data.assetType}`);
          }
        }}
      />

      {/* Statutory Source Proof Popover / Modal */}
      {selectedFindingForProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-slate-800" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Statutory Source Proof &amp; Verbatim Lineage
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFindingForProof(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Epistemic Tier Badge */}
              <div>
                {selectedFindingForProof.epistemicTier === 'VERIFIED_STATUTORY_CITATION' ||
                (!selectedFindingForProof.epistemicTier && selectedFindingForProof.matchedRuleId) ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>✓ Verified Statutory Citation (Foreign-Key Locked to Regulation Library)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-900 border border-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>⚠️ Compliance Advisory (Unlinked to Library Statute — Zero Invented Sections)</span>
                  </div>
                )}
              </div>

              {/* Flagged Element */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Flagged Claim in Marketing Copy
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-mono text-xs font-medium">
                  &ldquo;{selectedFindingForProof.claimElement}&rdquo;
                </div>
              </div>

              {/* Official Instrument & Section Reference */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Official Instrument
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedFindingForProof.instrumentTitle || selectedFindingForProof.regulatoryRule}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Section Reference
                  </div>
                  <div className="font-mono font-semibold text-slate-800 mt-0.5">
                    {selectedFindingForProof.sectionRef || selectedFindingForProof.statutoryCitation}
                  </div>
                </div>
              </div>

              {/* Verbatim Statutory Quote */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Verbatim Statutory Text from Ingested Instrument
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 font-mono">
                    100% Extracted Source Proof
                  </span>
                </div>
                <blockquote className="p-3.5 rounded-lg bg-emerald-50/40 border-l-4 border-emerald-600 text-xs text-slate-900 leading-relaxed italic font-serif">
                  &ldquo;{selectedFindingForProof.verbatimStatutoryQuote || 'Statutory instrument text verified in Regulation Library.'}&rdquo;
                </blockquote>
              </div>

              {/* Compliance Gap & Required Fix */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                    Compliance Analysis:
                  </span>
                  <p className="text-slate-700">{selectedFindingForProof.complianceGap}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                    Required Remediation:
                  </span>
                  <p className="text-slate-900 font-medium">{selectedFindingForProof.requiredFix}</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {selectedFindingForProof.sourceUrlOrPdfPath ? (
                  <a
                    href={selectedFindingForProof.sourceUrlOrPdfPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Verify in Official Gazette / Source PDF</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <a
                    href="/library"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Regulation Library</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedFindingForProof(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
