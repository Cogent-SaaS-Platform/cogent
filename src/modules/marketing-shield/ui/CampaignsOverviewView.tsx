'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  ChevronRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Layers,
  Scale,
  RefreshCw,
  Edit3,
  Bookmark,
} from 'lucide-react';
import { ProductCategoryCode, MarketingChannel } from '@/shared/types';
import { CampaignRecord, CampaignLifecycleStatus, PRODUCT_CATEGORIES_CATALOG } from '../types';

interface CampaignsOverviewViewProps {
  campaigns: CampaignRecord[];
  onOpenCampaign: (campaign: CampaignRecord) => void;
  onNewCampaignClick: () => void;
}

export const CampaignsOverviewView: React.FC<CampaignsOverviewViewProps> = ({
  campaigns,
  onOpenCampaign,
  onNewCampaignClick,
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<CampaignLifecycleStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategoryCode | 'ALL'>('ALL');

  // Compute status counts
  const counts = useMemo(() => {
    const draft = campaigns.filter((c) => c.status === 'Draft').length;
    const review = campaigns.filter((c) => c.status === 'Review').length;
    const revision = campaigns.filter((c) => c.status === 'Revision').length;
    const approved = campaigns.filter((c) => c.status === 'Approved').length;
    return { draft, review, revision, approved };
  }, [campaigns]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (selectedStatusFilter !== 'ALL' && c.status !== selectedStatusFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && c.productCategory !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.campaignName.toLowerCase().includes(q) ||
          c.rawCopy.toLowerCase().includes(q) ||
          c.authorName.toLowerCase().includes(q) ||
          c.productCategory.toLowerCase().includes(q) ||
          c.channel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [campaigns, selectedStatusFilter, categoryFilter, searchQuery]);

  // Recent 4-5 updates for horizontal strip
  const recentUpdates = useMemo(() => {
    return [...campaigns].slice(0, 4);
  }, [campaigns]);

  const handleStatusCardClick = (status: CampaignLifecycleStatus) => {
    setSelectedStatusFilter((prev) => (prev === status ? 'ALL' : status));
  };

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

  return (
    <div className="space-y-8">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. ZANGO COMPLIANCE HEADER: Clean Title + Primary "+ Campaign" Action
          (Per user directive: No "Add Rule", No "Knowledge Base")
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Marketing Shield</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Statutory pre-vetting, deterministic compliance scans, and ARCON / CBN / FCCPC pre-clearance ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewCampaignClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Campaign</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. TOP METRIC CARDS (Zango Reference: marjet.png & Cogent AGENTS.md)
          Unified container with 1px hairline dividers & monochrome font-mono figures.
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 shadow-2xs">
        {/* Card 1: Draft */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('Draft')}
          className={`p-5 text-left transition-colors cursor-pointer group ${
            selectedStatusFilter === 'Draft' ? 'bg-slate-100/70 ring-1 ring-slate-900/10' : 'hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
              {counts.draft}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Draft
            </span>
          </div>
        </button>

        {/* Card 2: Review */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('Review')}
          className={`p-5 text-left transition-colors cursor-pointer group ${
            selectedStatusFilter === 'Review' ? 'bg-slate-100/70 ring-1 ring-slate-900/10' : 'hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
              {counts.review}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Review
            </span>
          </div>
        </button>

        {/* Card 3: Revision */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('Revision')}
          className={`p-5 text-left transition-colors cursor-pointer group ${
            selectedStatusFilter === 'Revision' ? 'bg-slate-100/70 ring-1 ring-slate-900/10' : 'hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
              {counts.revision}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Revision
            </span>
          </div>
        </button>

        {/* Card 4: Approved */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('Approved')}
          className={`p-5 text-left transition-colors cursor-pointer group ${
            selectedStatusFilter === 'Approved' ? 'bg-slate-100/70 ring-1 ring-slate-900/10' : 'hover:bg-slate-50/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
              {counts.approved}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved
            </span>
          </div>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. RECENT UPDATES (Zango Reference: marjet.png)
          Horizontal cards showing what the user worked on last with dynamic category banners.
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Recent Updates
          </h2>
          {selectedStatusFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedStatusFilter('ALL')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentUpdates.map((campaign) => {
            const meta = PRODUCT_CATEGORIES_CATALOG[campaign.productCategory];
            return (
              <div
                key={campaign.id}
                onClick={() => onOpenCampaign(campaign)}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer group flex flex-col"
              >
                {/* Banner Image Preview */}
                <div className="h-36 w-full overflow-hidden bg-slate-100 relative">
                  <img
                    src={campaign.bannerImage || meta.bannerImage}
                    alt={campaign.campaignName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-950/75 backdrop-blur-xs text-[10px] font-mono text-white">
                    {campaign.channel.replace(/_/g, ' ')}
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider truncate">
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {campaign.relativeTime}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-700 transition-colors line-clamp-1">
                      {campaign.campaignName}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                      {getStatusDot(campaign.status)}
                      <span>{campaign.status}</span>
                    </span>

                    <span className="font-mono text-xs text-slate-600">
                      {campaign.infractionsCount > 0 ? (
                        <span>{campaign.infractionsCount} Issues</span>
                      ) : (
                        <span>Pre-Cleared</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. CAMPAIGNS TO REVIEW (Zango Reference: marjet.png)
          Table/list of campaigns needing attention or in flight.
          (Explicitly: NO Recent Claims column per user directive)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Campaigns to Review <span className="font-mono font-semibold text-slate-500 text-xs">({filteredCampaigns.length})</span>
            </h2>
            {selectedStatusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                <span>Filter: {selectedStatusFilter}</span>
                <button
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className="hover:text-slate-900 ml-1 font-bold"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 w-44 sm:w-56"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ProductCategoryCode | 'ALL')}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">All Categories</option>
              <option value="DIGITAL_NANO_LOAN">Digital Nano-Loan</option>
              <option value="PAYMENTS_WALLET">Payments & Wallet</option>
              <option value="REMITTANCE_FX">Remittance & FX</option>
              <option value="WEALTHTECH_INVEST">WealthTech & Investment</option>
              <option value="SAVINGS_DEPOSIT">Savings & Vault</option>
            </select>
          </div>
        </div>

        {/* Campaign List Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredCampaigns.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-900">No campaigns found</p>
              <p className="text-xs text-slate-500">
                {selectedStatusFilter !== 'ALL'
                  ? `There are currently no campaigns matching the "${selectedStatusFilter}" status filter.`
                  : 'Start by creating your first promotional campaign using the + Campaign button.'}
              </p>
              {selectedStatusFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className="mt-2 text-xs font-semibold text-slate-900 underline underline-offset-2"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            filteredCampaigns.map((campaign) => {
              const meta = PRODUCT_CATEGORIES_CATALOG[campaign.productCategory];
              return (
                <div
                  key={campaign.id}
                  onClick={() => onOpenCampaign(campaign)}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Left: Thumbnail + Title + Metadata */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-11 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                      <img
                        src={campaign.bannerImage || meta.bannerImage}
                        alt={campaign.campaignName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                          {campaign.campaignName}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {campaign.channel.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 truncate">
                        <span>{campaign.authorName}</span>
                        <span>•</span>
                        <span>{campaign.relativeTime}</span>
                        <span>•</span>
                        <span className="text-slate-400">{meta.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Turnaround countdown + Infractions + Status Dot + CTA */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-end sm:self-center">
                    {/* Turnaround countdown */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{campaign.turnaroundDays} days turnaround</span>
                    </div>

                    {/* Infractions count */}
                    <div className="min-w-[70px] text-right">
                      {campaign.infractionsCount > 0 ? (
                        <span className="font-mono text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {campaign.infractionsCount} {campaign.infractionsCount === 1 ? 'Issue' : 'Issues'}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          0 Issues
                        </span>
                      )}
                    </div>

                    {/* Status Badge with 6px status dot */}
                    <div className="min-w-[85px]">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        {getStatusDot(campaign.status)}
                        <span>{campaign.status}</span>
                      </span>
                    </div>

                    {/* CTA Button */}
                    <div>
                      {campaign.status === 'Draft' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCampaign(campaign);
                          }}
                          className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-xs shadow-2xs transition-colors"
                        >
                          Continue Draft
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCampaign(campaign);
                          }}
                          className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs shadow-2xs transition-colors"
                        >
                          Open Audit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
