'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Edit2,
  RefreshCw,
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
import { UpgradePlanModal } from '@/shared/ui/UpgradePlanModal';
import { PlanTier } from '@/lib/plans';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTitleEditing, setIsTitleEditing] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'canvas_only'>('split');

  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    featureName?: string;
    requiredPlan?: PlanTier;
    reason?: string;
    isReadOnly?: boolean;
    currentUsage?: number;
    maxAllowed?: number;
  }>({ isOpen: false });

  const fetchCampaignDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await fetch(`/api/marketing/campaigns/${campaignId}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.campaign) {
        throw new Error(data.error || 'Failed to load campaign details');
      }

      setCampaign(data.campaign);
      setEditedTitle(data.campaign.title);
      setCanvasContent(data.campaign.canvasContent || '');
      setMessages(data.messages || []);
      setExtractedClaims(data.extractedClaims || []);

      const lastAssistantMsg = [...(data.messages || [])]
        .reverse()
        .find((m: CampaignChatMessage) => m.role === 'ASSISTANT' && (m.structuredFindingsJson?.length ?? 0) > 0);

      setFindings(lastAssistantMsg?.structuredFindingsJson || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load campaign workspace');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaignDetails();
  }, [fetchCampaignDetails]);

  const saveCanvasContent = useCallback(
    async (newContent: string) => {
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
    },
    [campaignId]
  );

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
      setCampaign((prev) => (prev ? { ...prev, title: editedTitle.trim() } : null));
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
      setCampaign((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAssetAttached = async (asset: {
    assetUrl: string | null;
    assetType: 'IMAGE' | 'PDF' | 'URL';
  }) => {
    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            attachedAssetUrl: asset.assetUrl,
            attachedAssetType: asset.assetType,
          }
        : null
    );
    if (asset.assetType === 'URL' && asset.assetUrl) {
      await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachedAssetUrl: asset.assetUrl,
          attachedAssetType: asset.assetType,
        }),
      }).catch(() => null);
    }
  };

  const handleSendMessage = async (
    content: string,
    context: {
      productCategory: ProductCategoryCode;
      channel: MarketingChannel;
      scopedRegulations: string[];
      attachedAssetBase64?: string;
      attachedAssetMimeType?: string;
      attachedAssetUrl?: string;
    }
  ) => {
    const res = await fetch(`/api/marketing/campaigns/${campaignId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        context,
        attachedAssetBase64: context.attachedAssetBase64,
        attachedAssetMimeType: context.attachedAssetMimeType,
        attachedAssetUrl: context.attachedAssetUrl,
        canvasContent,
      }),
    });

    const data = await res.json();
    if (res.status === 402 || res.status === 403) {
      setUpgradeModalState({
        isOpen: true,
        featureName: 'Marketing Compliance Analysis',
        requiredPlan: (data.requiredPlan as PlanTier) || 'PRO',
        reason: data.error,
        isReadOnly: !!data.isReadOnly,
      });
      return;
    }

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Statutory analysis failed. Please retry.');
    }

    await fetchCampaignDetails();
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

  const handleExportDossier = async () => {
    try {
      const checkRes = await fetch(`/api/marketing/campaigns/${campaignId}/dossier?check=true`, {
        headers: { Accept: 'application/json' },
      });
      if (checkRes.status === 402 || checkRes.status === 403) {
        const errData = await checkRes.json().catch(() => ({}));
        setUpgradeModalState({
          isOpen: true,
          featureName: 'ARCON Pre-Clearance Dossier Export',
          requiredPlan: (errData.requiredPlan as PlanTier) || 'PRO',
          reason:
            errData.error ||
            'Generating signed ARCON ASP Pre-Clearance Dossiers requires the Pro or Enterprise plan.',
          isReadOnly: !!errData.isReadOnly,
        });
        return;
      }
      window.open(`/api/marketing/campaigns/${campaignId}/dossier`, '_blank');
    } catch {
      window.open(`/api/marketing/campaigns/${campaignId}/dossier`, '_blank');
    }
  };

  const handleApplyFixToCanvas = (suggestedRewrite: string, claimElement?: string) => {
    if (claimElement && canvasContent.includes(claimElement)) {
      handleCanvasChange(canvasContent.replace(claimElement, suggestedRewrite));
    } else {
      handleCanvasChange(canvasContent ? `${canvasContent}\n\n${suggestedRewrite}` : suggestedRewrite);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
          <span>Opening Split-Screen Marketing Studio...</span>
        </div>
      </div>
    );
  }

  if (loadError || !campaign) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full space-y-3 text-center">
          <p className="text-xs font-semibold text-rose-700">{loadError || 'Campaign not found'}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onBackToHub}
              className="px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-xs font-medium cursor-pointer"
            >
              Back to Hub
            </button>
            <button
              type="button"
              onClick={fetchCampaignDetails}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
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
      {/* TOP STUDIO HEADER BAR */}
      <header className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
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
                className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-medium cursor-pointer"
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

          <span className="text-[11px] text-slate-600 flex items-center gap-1 ml-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            {isSaving ? 'Saving...' : 'Saved'}
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 ml-2">
            {getStatusDot(campaign.status)}
            {campaign.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-xs border border-slate-200">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                viewMode === 'split'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split Studio
            </button>
            <button
              onClick={() => setViewMode('canvas_only')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                viewMode === 'canvas_only'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Canvas Only
            </button>
          </div>

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
                  Approve Campaign
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN SPLIT-SCREEN WORKSPACE (45% / 55%) */}
      <main className="flex-1 flex overflow-hidden">
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
              onAssetAttached={handleAssetAttached}
              onCategoryChange={async (cat) => {
                setCampaign((prev) => (prev ? { ...prev, productCategory: cat } : null));
                await fetch(`/api/marketing/campaigns/${campaignId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ productCategory: cat }),
                }).catch(() => null);
              }}
              onChannelChange={async (chan) => {
                setCampaign((prev) => (prev ? { ...prev, channel: chan } : null));
                await fetch(`/api/marketing/campaigns/${campaignId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ channel: chan }),
                }).catch(() => null);
              }}
              attachedAssetUrl={campaign.attachedAssetUrl}
              attachedAssetType={campaign.attachedAssetType}
            />
          </div>
        )}

        <div className={`${viewMode === 'split' ? 'w-[55%]' : 'w-full'} h-full flex flex-col`}>
          <LiveCanvasPane
            campaign={campaign}
            canvasContent={canvasContent}
            findings={findings}
            extractedClaims={extractedClaims}
            onCanvasChange={handleCanvasChange}
            onClaimStatusChange={handleClaimStatusChange}
            onExportDossierClick={handleExportDossier}
            onUpgradeRequired={(modalState) =>
              setUpgradeModalState({ isOpen: true, ...modalState })
            }
          />
        </div>
      </main>

      <UpgradePlanModal
        isOpen={upgradeModalState.isOpen}
        onClose={() => setUpgradeModalState({ isOpen: false })}
        featureName={upgradeModalState.featureName}
        requiredPlan={upgradeModalState.requiredPlan}
        reason={upgradeModalState.reason}
        isReadOnly={upgradeModalState.isReadOnly}
        currentUsage={upgradeModalState.currentUsage}
        maxAllowed={upgradeModalState.maxAllowed}
      />
    </div>
  );
};
