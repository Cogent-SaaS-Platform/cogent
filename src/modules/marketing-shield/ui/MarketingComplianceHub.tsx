'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  ChevronRight,
  FileText,
  Search,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import {
  MarketingCampaign,
  ExtractedPromotionalClaim,
  CampaignLifecycleStatus,
} from '../types';
import { MarketingKnowledgeBaseView } from './MarketingKnowledgeBaseView';
import { AddRuleModal } from './AddRuleModal';
import { UpgradePlanModal } from '@/shared/ui/UpgradePlanModal';
import { PlanTier } from '@/lib/plans';

interface MarketingComplianceHubProps {
  onOpenCampaign: (campaignId: string) => void;
  onCreateNewCampaign: () => void;
}

export const MarketingComplianceHub: React.FC<MarketingComplianceHubProps> = ({
  onOpenCampaign,
  onCreateNewCampaign,
}) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'knowledge_base'>('campaigns');
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [recentClaims, setRecentClaims] = useState<ExtractedPromotionalClaim[]>([]);
  const [counts, setCounts] = useState({ draft: 0, review: 0, revision: 0, approved: 0 });
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<CampaignLifecycleStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

  const [subscriptionPlan, setSubscriptionPlan] = useState<{
    tier: PlanTier;
    canAddCustomMarketingRules: boolean;
  } | null>(null);

  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    featureName?: string;
    requiredPlan?: PlanTier;
    reason?: string;
    isReadOnly?: boolean;
    currentUsage?: number;
    maxAllowed?: number;
  }>({ isOpen: false });

  useEffect(() => {
    fetchHubData();
  }, []);

  const fetchHubData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [campRes, claimsRes, subRes] = await Promise.all([
        fetch('/api/marketing/campaigns'),
        fetch('/api/marketing/claims'),
        fetch('/api/billing/subscription'),
      ]);

      const campData = await campRes.json();
      const claimsData = await claimsRes.json();
      const subData = await subRes.json().catch(() => null);

      if (!campRes.ok || !campData.success) {
        throw new Error(campData.error || 'Failed to load marketing campaigns');
      }

      setCampaigns(campData.campaigns || []);
      setCounts(campData.counts || { draft: 0, review: 0, revision: 0, approved: 0 });

      if (claimsData.success) {
        setRecentClaims(claimsData.claims || []);
      }

      if (subData?.tier) {
        const tier = subData.tier as PlanTier;
        setSubscriptionPlan({
          tier,
          canAddCustomMarketingRules: !!subData.planConfig?.canAddCustomMarketingRules,
        });
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load Marketing Compliance Hub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddRule = () => {
    if (subscriptionPlan && !subscriptionPlan.canAddCustomMarketingRules) {
      setUpgradeModalState({
        isOpen: true,
        featureName: 'Custom Knowledge Base Rules (+ Add Rule)',
        requiredPlan: 'PRO',
        reason:
          'Adding custom statutory and internal brand compliance rules to your Marketing Knowledge Base requires the Pro or Enterprise plan.',
      });
      return;
    }
    setIsAddRuleOpen(true);
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (selectedStatusFilter !== 'ALL' && c.status !== selectedStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.canvasContent.toLowerCase().includes(q) ||
          c.createdBy.toLowerCase().includes(q) ||
          c.channel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [campaigns, selectedStatusFilter, searchQuery]);

  const recentUpdates = useMemo(() => {
    return [...filteredCampaigns].slice(0, 4);
  }, [filteredCampaigns]);

  const campaignsToReview = useMemo(() => {
    return filteredCampaigns.filter((c) => c.status === 'Review' || c.status === 'Revision');
  }, [filteredCampaigns]);

  const getStatusDot = (status: CampaignLifecycleStatus) => {
    switch (status) {
      case 'Draft':
        return <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />;
      case 'Review':
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />;
      case 'Revision':
        return <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />;
      case 'Approved':
        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* 1. TOP HEADER & NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Marketing Compliance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional pre-clearance, deterministic advertising rule evaluation, and continuous drift monitoring.
          </p>

          <div className="flex items-center gap-1 mt-3">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'campaigns'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('knowledge_base')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'knowledge_base'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Knowledge Base &amp; Rules</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAddRule}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>Add Rule</span>
          </button>

          <button
            onClick={onCreateNewCampaign}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Campaign</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded text-xs font-medium flex items-center justify-between">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={fetchHubData}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {activeTab === 'knowledge_base' ? (
        <MarketingKnowledgeBaseView onAddRuleClick={handleOpenAddRule} />
      ) : (
        <div className="space-y-6">
          {/* 2. TOP KPI PIPELINE COUNTERS — Unified container, 1px hairline dividers, monochrome bold numbers */}
          <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <button
              type="button"
              onClick={() => setSelectedStatusFilter((prev) => (prev === 'Draft' ? 'ALL' : 'Draft'))}
              className={`p-4 text-left transition-colors cursor-pointer hover:bg-slate-50/60 ${
                selectedStatusFilter === 'Draft' ? 'bg-slate-50 ring-1 ring-inset ring-slate-900' : ''
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Draft</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              </div>
              <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight mt-1.5">
                {counts.draft}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusFilter((prev) => (prev === 'Review' ? 'ALL' : 'Review'))}
              className={`p-4 text-left transition-colors cursor-pointer hover:bg-slate-50/60 ${
                selectedStatusFilter === 'Review' ? 'bg-slate-50 ring-1 ring-inset ring-slate-900' : ''
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Review</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </div>
              <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight mt-1.5">
                {counts.review}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusFilter((prev) => (prev === 'Revision' ? 'ALL' : 'Revision'))}
              className={`p-4 text-left transition-colors cursor-pointer hover:bg-slate-50/60 ${
                selectedStatusFilter === 'Revision' ? 'bg-slate-50 ring-1 ring-inset ring-slate-900' : ''
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Revision</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight mt-1.5">
                {counts.revision}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusFilter((prev) => (prev === 'Approved' ? 'ALL' : 'Approved'))}
              className={`p-4 text-left transition-colors cursor-pointer hover:bg-slate-50/60 ${
                selectedStatusFilter === 'Approved' ? 'bg-slate-50 ring-1 ring-inset ring-slate-900' : ''
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Approved</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight mt-1.5">
                {counts.approved}
              </div>
            </button>
          </div>

          {/* Search & Filter Bar */}
          {campaigns.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search campaigns, copy, or channel..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              {selectedStatusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer self-start sm:self-auto"
                >
                  Showing: {selectedStatusFilter} (Clear filter)
                </button>
              )}
            </div>
          )}

          {/* 3. RECENT UPDATES HORIZONTAL STRIP */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Updates
              </h2>
              {campaigns.length > 0 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredCampaigns.length} of {campaigns.length} campaigns
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-xs text-slate-500">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    No Campaigns Created Yet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Pre-vet your first ad copy, social flyer, or broadcast SMS against Nigerian regulatory codes.
                  </p>
                </div>
                <button
                  onClick={onCreateNewCampaign}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Campaign</span>
                </button>
              </div>
            ) : recentUpdates.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                No campaigns match the active filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {recentUpdates.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onOpenCampaign(c.id)}
                    className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-600">
                        <span className="font-mono text-xs text-slate-600">{c.channel}</span>
                        <span>{formatRelativeTime(c.createdAt)}</span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {c.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {c.canvasContent || '(Empty draft copy — click to compose)'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        {getStatusDot(c.status)}
                        {c.status}
                      </span>
                      {c.totalFindings > 0 ? (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-xs font-medium">
                          {c.totalFindings} {c.totalFindings === 1 ? 'Issue' : 'Issues'}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-600">0 Issues</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. BOTTOM TWO-COLUMN SPLIT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Campaigns to Review */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Campaigns to Review ({campaignsToReview.length})
                </h2>
                {campaigns.length > 0 && (
                  <button
                    onClick={() => setSelectedStatusFilter('ALL')}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    View All &gt;
                  </button>
                )}
              </div>

              {campaignsToReview.length === 0 ? (
                <div className="p-6 rounded-lg border border-slate-200 bg-white text-center">
                  <p className="text-xs font-medium text-slate-600">Zero campaigns currently awaiting review or revision.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">All active campaigns have been cleared or are in draft.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {campaignsToReview.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onOpenCampaign(c.id)}
                      className="p-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{c.title}</h4>
                          <span className="font-mono text-xs text-slate-600 shrink-0">{c.channel}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>{c.createdBy}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(c.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {c.totalFindings > 0 ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-xs font-medium">
                            {c.totalFindings} Issues
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-600">0 Issues</span>
                        )}

                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                          {getStatusDot(c.status)}
                          {c.status}
                        </span>

                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Recent Claims Registry */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Claims ({recentClaims.length})
                </h2>
                {recentClaims.length > 0 && (
                  <span className="text-[11px] font-semibold text-slate-600">
                    Live Registry
                  </span>
                )}
              </div>

              {recentClaims.length === 0 ? (
                <div className="p-6 rounded-lg border border-slate-200 bg-white text-center">
                  <p className="text-xs font-medium text-slate-600">Zero promotional claims registered yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Claims extracted during campaign scans will appear here.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {recentClaims.slice(0, 6).map((claim) => (
                    <div
                      key={claim.id}
                      onClick={() => claim.campaignId && onOpenCampaign(claim.campaignId)}
                      className="p-3 hover:bg-slate-50/70 transition-colors space-y-1.5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-slate-600">{claim.code}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              claim.reviewStatus === 'APPROVED'
                                ? 'bg-emerald-500'
                                : claim.reviewStatus === 'REJECTED'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {claim.reviewStatus}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-medium line-clamp-2">
                        &ldquo;{claim.claimText}&rdquo;
                      </p>

                      <div className="text-[10px] text-slate-500 truncate">
                        {claim.campaignTitle || 'Campaign Promotional Claim'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AddRuleModal
        isOpen={isAddRuleOpen}
        onClose={() => setIsAddRuleOpen(false)}
        onRuleAdded={() => {
          fetchHubData();
        }}
      />

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
