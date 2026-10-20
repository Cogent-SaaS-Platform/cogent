'use client';

import React, { useState, useEffect } from 'react';
import { NavigationRail } from './NavigationRail';
import { GlobalHeader, BreadcrumbSegment } from './GlobalHeader';
import { CommandPalette } from './CommandPalette';
import { SmartInsightDrawer } from './SmartInsightDrawer';
import { TenantSubscriptionBanner } from './TenantSubscriptionBanner';

export interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbSegment[];
  activePillarOverride?: string;
  onNavigateOverride?: (href: string) => void;
}

export function AppShell({
  children,
  breadcrumbs,
  activePillarOverride,
  onNavigateOverride,
}: AppShellProps) {
  const [isRailExpanded, setIsRailExpanded] = useState<boolean>(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] flex flex-col font-sans selection:bg-[#2A4BFF]/20 selection:text-[#2A4BFF]">
      {/* 1. Persistent 64px / 240px Navigation Rail (Layer 0) */}
      <NavigationRail
        onToggleExpand={setIsRailExpanded}
        activePillarOverride={activePillarOverride}
        onNavigateOverride={onNavigateOverride}
      />

      {/* 2. Main Workspace Content Frame */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ease-in-out ${
          isRailExpanded ? 'pl-60' : 'pl-16'
        }`}
      >
        {/* Global Command Header (Section 3.2) */}
        <GlobalHeader
          breadcrumbs={breadcrumbs}
          activePillar={activePillarOverride}
          isRailExpanded={isRailExpanded}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
        />

        {/* Global Subscription & Trial Status Banner */}
        <TenantSubscriptionBanner />

        {/* Dynamic Page Canvas */}
        <main className="flex-1 bg-[#F5F6FA] overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* 3. Global Command Palette Modal (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={onNavigateOverride}
      />

      {/* 4. AI Smart Insight Side Drawer (notic.webp) */}
      <SmartInsightDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onActionClick={onNavigateOverride}
      />
    </div>
  );
}
