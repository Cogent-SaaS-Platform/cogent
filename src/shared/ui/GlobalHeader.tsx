'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  Search,
  Bell,
  ShieldCheck,
  LayoutDashboard,
  Radio,
  BookOpen,
  Scale,
  Megaphone,
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
  '/': [{ label: 'Dashboard' }],
  '/overview': [{ label: 'Dashboard' }],
  '/insight': [{ label: 'Horizon Scanning' }],
  '/radar': [{ label: 'Horizon Scanning' }],
  '/marketing': [{ label: 'Marketing Shield' }],
  '/gap': [{ label: 'Gap Analysis' }],
  '/gap-matrix': [{ label: 'Gap Analysis' }],
  '/library': [{ label: 'Regulatory Library' }],
  '/settings': [{ label: 'Settings' }],
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

  const isDashboardRoute =
    (!breadcrumbs || breadcrumbs.length === 0) &&
    (pathname === '/' || pathname === '/overview' || activePillar === 'executive' || activePillar === 'overview');

  const isHorizonRoute =
    (!breadcrumbs || breadcrumbs.length === 0) &&
    (pathname === '/insight' || pathname === '/radar' || activePillar === 'radar' || activePillar === 'insight');

  const isLibraryRoute =
    (!breadcrumbs || breadcrumbs.length === 0) &&
    (pathname === '/library' || activePillar === 'library');

  const isGapRoute =
    (!breadcrumbs || breadcrumbs.length === 0) &&
    (pathname === '/gap' || pathname === '/gap-matrix' || activePillar === 'gap' || activePillar === 'gap-matrix');

  const isMarketingRoute =
    (!breadcrumbs || breadcrumbs.length === 0) &&
    (pathname === '/marketing' || activePillar === 'marketing');

  // Determine breadcrumbs automatically if not explicitly provided
  const resolvedBreadcrumbs: BreadcrumbSegment[] =
    breadcrumbs ||
    (activePillar === 'marketing' || pathname === '/marketing'
      ? [{ label: 'Marketing Shield' }]
      : activePillar === 'gap-matrix' || activePillar === 'gap'
      ? [{ label: 'Gap Analysis' }]
      : ROUTE_BREADCRUMBS[pathname || '/'] || [
          { label: pathname?.replace('/', '') || 'Dashboard' },
        ]);

  return (
    <header
      id="cogent-global-header"
      className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-md border-b border-[#DDE3EE] px-4 lg:px-6 flex items-center justify-between gap-4 select-none"
    >
      {/* 1. Left Breadcrumb / Section Badge */}
      {isDashboardRoute ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] shadow-2xs">
          <LayoutDashboard className="w-4 h-4 text-[#4B5565]" />
          <span>Dashboard</span>
        </div>
      ) : isHorizonRoute ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] shadow-2xs">
          <Radio className="w-4 h-4 text-[#4B5565]" />
          <span>Horizon Scanning</span>
        </div>
      ) : isLibraryRoute ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] shadow-2xs">
          <BookOpen className="w-4 h-4 text-[#4B5565]" />
          <span>Regulation Library</span>
        </div>
      ) : isGapRoute ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] shadow-2xs">
          <Scale className="w-4 h-4 text-[#4B5565]" />
          <span>Gap Analysis</span>
        </div>
      ) : isMarketingRoute ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] shadow-2xs">
          <Megaphone className="w-4 h-4 text-[#4B5565]" />
          <span>Marketing Shield</span>
        </div>
      ) : (
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
      )}

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
