'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  Search,
  Bell,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

export interface GlobalHeaderProps {
  breadcrumbs?: BreadcrumbSegment[];
  onOpenCommandPalette?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  activePillar?: string;
  isRailExpanded?: boolean;
}

const ROUTE_BREADCRUMBS: Record<string, BreadcrumbSegment[]> = {
  '/': [{ label: 'Workspace' }, { label: 'Overview' }],
  '/overview': [{ label: 'Workspace' }, { label: 'Overview' }],
  '/insight': [{ label: 'Workspace' }, { label: 'Insight', href: '/insight' }, { label: 'Horizon Scanning' }],
  '/radar': [{ label: 'Workspace' }, { label: 'Insight', href: '/insight' }, { label: 'Horizon Scanning' }],
  '/marketing': [{ label: 'Workspace' }, { label: 'Marketing Shield', href: '/marketing' }, { label: 'Campaigns & Claims' }],
  '/gap': [{ label: 'Workspace' }, { label: 'Gap', href: '/gap' }, { label: 'Policy Concordance' }],
  '/gap-matrix': [{ label: 'Workspace' }, { label: 'Gap', href: '/gap' }, { label: 'Policy Concordance' }],
  '/library': [{ label: 'Workspace' }, { label: 'Regulatory Library' }],
  '/audit': [{ label: 'Workspace' }, { label: 'Audit Ledger' }],
  '/settings': [{ label: 'Workspace' }, { label: 'Settings' }],
};

export function GlobalHeader({
  breadcrumbs,
  onOpenCommandPalette,
  onOpenNotifications,
  unreadNotificationsCount = 3,
  activePillar,
  isRailExpanded = false,
}: GlobalHeaderProps) {
  const pathname = usePathname();

  // Determine breadcrumbs automatically if not explicitly provided
  const resolvedBreadcrumbs: BreadcrumbSegment[] =
    breadcrumbs ||
    (activePillar === 'executive' || activePillar === 'overview'
      ? [{ label: 'Workspace' }, { label: 'Overview' }]
      : activePillar === 'radar' || activePillar === 'insight'
      ? [{ label: 'Workspace' }, { label: 'Insight', href: '/insight' }, { label: 'Horizon Scanning' }]
      : activePillar === 'marketing'
      ? [{ label: 'Workspace' }, { label: 'Marketing Shield', href: '/marketing' }, { label: 'Campaigns & Claims' }]
      : activePillar === 'gap-matrix' || activePillar === 'gap'
      ? [{ label: 'Workspace' }, { label: 'Gap', href: '/gap' }, { label: 'Policy Concordance' }]
      : ROUTE_BREADCRUMBS[pathname || '/'] || [
          { label: 'Workspace' },
          { label: pathname?.replace('/', '') || 'Overview' },
        ]);

  return (
    <header
      id="cogent-global-header"
      className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-md border-b border-[#DDE3EE] px-4 lg:px-6 flex items-center justify-between gap-4 select-none"
    >
      {/* 1. Left Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
        {resolvedBreadcrumbs.map((segment, index) => {
          const isLast = index === resolvedBreadcrumbs.length - 1;
          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-[#8D99AE] shrink-0" />
              )}
              {isLast ? (
                <span className="font-semibold text-[#0B0F1A] truncate">
                  {segment.label}
                </span>
              ) : segment.href ? (
                <Link
                  href={segment.href}
                  className="text-[#4B5565] hover:text-[#0B0F1A] hover:underline transition-colors truncate"
                >
                  {segment.label}
                </Link>
              ) : (
                <span className="text-[#4B5565] truncate">{segment.label}</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* 2. Right Command Header Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Instant Command Palette Trigger (Cmd+K) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#F5F6FA] hover:bg-[#ECEEF5] border border-[#DDE3EE] text-xs text-[#4B5565] hover:text-[#0B0F1A] transition-all shadow-xs"
          title="Search all regulatory circulars, claims, and policies (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#8D99AE]" />
          <span className="text-[11px] font-medium hidden md:inline">
            Quick jump across circulars & policies...
          </span>
          <span className="text-[11px] font-medium md:hidden">Search...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white text-[#4B5565] border border-[#DDE3EE] rounded shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Regulatory Enclaves Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
          <span>CBN · SEC · NDPC Enclaves</span>
        </div>

        {/* AI Smart Insight Notification Trigger */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-[#4B5565] hover:text-[#0B0F1A] hover:bg-[#F5F6FA] border border-transparent hover:border-[#DDE3EE] transition-all"
          title="AI Smart Insight & Notifications"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2A4BFF] ring-2 ring-white" />
          )}
        </button>
      </div>
    </header>
  );
}
