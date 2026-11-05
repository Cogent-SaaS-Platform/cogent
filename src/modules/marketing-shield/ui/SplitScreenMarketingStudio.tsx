'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Scale,
  ShieldCheck,
  Edit2,
} from 'lucide-react';
import {
  MarketingCampaign,
  CampaignChatMessage,
  ExtractedPromotionalClaim,
  StructuredFinding,
  CampaignLifecycleStatus,
} from '../types';
import { ProductCategoryCode, MarketingChannel } from '@/shared/types';
import { CopilotChatPane } from './CopilotChatPane';
import { LiveCanvasPane } from './LiveCanvasPane';

interface SplitScreenMarketingStudioProps {
  campaignId: string;
  onBackToHub: () => void;
}

export const SplitScreenMarketingStudio: React.FC<SplitScreenMarketingStudioProps> = ({
  campaignId,
  onBackToHub,
}) => {
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [messages, setMessages] = useState<CampaignChatMessage[]>([]);
  const [extractedClaims, setExtractedClaims] = useState<ExtractedPromotionalClaim[]>([]);
  const [findings, setFindings] = useState<StructuredFinding[]>([]);
  const [canvasContent, setCanvasContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTitleEditing, setIsTitleEditing] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'canvas_only' | 'audit'>('split');

  // Load campaign on mount
  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/marketing/campaigns/${campaignId}`);
      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
        setEditedTitle(data.campaign.title);
        setCanvasContent(data.campaign.canvasContent || '');
        setMessages(data.messages || []);
        setExtractedClaims(data.extractedClaims || []);

        // Derive current active findings from the latest assistant message
        const lastAssistantMsg = [...(data.messages || [])]
          .reverse()
          .find((m: any) => m.role === 'ASSISTANT' && m.structuredFindingsJson?.length > 0);

        if (lastAssistantMsg) {
          setFindings(lastAssistantMsg.structuredFindingsJson);
        }
      }
    } catch (err) {
      console.error('Failed to load campaign:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced auto-save of canvas copy
  const saveCanvasContent = useCallback(async (newContent: string) => {
    setIsSaving(true);
    try {
      await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasContent: newContent }),
      });
    } catch (err) {
      console.error('Failed to auto-save canvas:', err);
    } finally {
      setIsSaving(false);
    }
  }, [campaignId]);

  const handleCanvasChange = (newText: string) => {
    setCanvasContent(newText);
    saveCanvasContent(newText);
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) return;
    try {
      await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editedTitle.trim() }),
      });
      setCampaign((prev) => prev ? { ...prev, title: editedTitle.trim() } : null);
      setIsTitleEditing(false);
    } catch (err) {
      console.error('Failed to save title:', err);
    }
  };

  const handleStatusChange = async (newStatus: CampaignLifecycleStatus) => {
    try {
      await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setCampaign((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSendMessage = async (content: string, context: {
    productCategory: ProductCategoryCode;
    channel: MarketingChannel;
    scopedRegulations: string[];
    attachedAssetBase64?: string;
    attachedAssetMimeType?: string;
  }) => {
    const res = await fetch(`/api/marketing/campaigns/${campaignId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        context,
        attachedAssetBase64: context.attachedAssetBase64,
        attachedAssetMimeType: context.attachedAssetMimeType,
        canvasContent,
      }),
    });

    const data = await res.json();
    if (data.success) {
      await fetchCampaignDetails();
    }
  };

  const handleClaimStatusChange = async (claimId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await fetch(`/api/marketing/claims/${claimId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: newStatus }),
      });
      setExtractedClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, reviewStatus: newStatus } : c))
      );
    } catch (err) {
      console.error('Failed to update claim:', err);
    }
  };

  const handleExportDossier = () => {
    window.open(`/api/marketing/campaigns/${campaignId}/dossier`, '_blank');
  };

  const handleApplyFixToCanvas = (suggestedRewrite: string, claimElement?: string) => {
    if (claimElement && canvasContent.includes(claimElement)) {
      handleCanvasChange(canvasContent.replace(claimElement, suggestedRewrite));
    } else {
      handleCanvasChange(`${canvasContent}\n\n${suggestedRewrite}`);
    }
  };

  if (isLoading || !campaign) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
          <span>Opening Split-Screen Marketing Studio...</span>
        </div>
      </div>
    );
  }

  const getStatusDot = (status: CampaignLifecycleStatus) => {
    switch (status) {
      case 'Draft':
        return <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />;
      case 'Review':
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />;
      case 'Revision':
        return <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />;
      case 'Approved':
        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden font-sans">
      {/* ──────────────────────────────────────────────────────────────────────────
          TOP STUDIO HEADER BAR
          ────────────────────────────────────────────────────────────────────────── */}
      <header className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        {/* Left Breadcrumbs & Editable Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Campaigns</span>
          </button>
          <span className="text-slate-300">/</span>

          {isTitleEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="px-2 py-0.5 rounded border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-medium"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 truncate max-w-sm">
                {campaign.title}
              </span>
              <button
                onClick={() => setIsTitleEditing(true)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Edit title"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Auto-save indicator */}
          <span className="text-[11px] text-slate-600 flex items-center gap-1 ml-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            {isSaving ? 'Saving...' : 'Saved'}
          </span>

          {/* Status Badge */}
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium ml-2 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
            {getStatusDot(campaign.status)}
            {campaign.status}
          </span>
        </div>

        {/* Right Studio Controls & Workflow Buttons */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-xs border border-slate-200">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split Studio
            </button>
            <button
              onClick={() => setViewMode('canvas_only')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                viewMode === 'canvas_only' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Canvas Only
            </button>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex items-center gap-2">
            {campaign.status === 'Draft' ? (
              <button
                onClick={() => handleStatusChange('Review')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                Submit for Review
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleStatusChange('Revision')}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Request Revision
                </button>
                <button
                  onClick={() => handleStatusChange('Approved')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                >
                  ✓ Approve Campaign
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          MAIN SPLIT-SCREEN WORKSPACE (45% / 55% Ref Video 1 & Video 2)
          ────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left 45% Pane: Conversational Compliance Copilot (Drata GPT UX) */}
        {viewMode === 'split' && (
          <div className="w-[45%] h-full flex flex-col">
            <CopilotChatPane
              campaignId={campaign.id}
              messages={messages}
              productCategory={campaign.productCategory}
              channel={campaign.channel}
              canvasContent={canvasContent}
              onApplyFixToCanvas={handleApplyFixToCanvas}
              onSendMessage={handleSendMessage}
              onCategoryChange={(cat) => setCampaign((prev) => prev ? { ...prev, productCategory: cat } : null)}
              onChannelChange={(chan) => setCampaign((prev) => prev ? { ...prev, channel: chan } : null)}
              attachedAssetUrl={campaign.attachedAssetUrl}
              attachedAssetType={campaign.attachedAssetType}
            />
          </div>
        )}

        {/* Right 55% Pane: Live Copy Canvas & Aurora Inline Editor */}
        <div className={`${viewMode === 'split' ? 'w-[55%]' : 'w-full'} h-full flex flex-col`}>
          <LiveCanvasPane
            campaign={campaign}
            canvasContent={canvasContent}
            findings={findings}
            extractedClaims={extractedClaims}
            onCanvasChange={handleCanvasChange}
            onClaimStatusChange={handleClaimStatusChange}
            onExportDossierClick={handleExportDossier}
          />
        </div>
      </main>
    </div>
  );
};
