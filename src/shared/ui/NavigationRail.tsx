'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { OrganizationSwitcher, UserButton, Show } from '@clerk/nextjs';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import {
  OverviewIcon,
  InsightIcon,
  MarketingIcon,
  GapIcon,
  LibraryIcon,
  AuditIcon,
  SettingsIcon,
} from './DualStateIcons';

export interface NavItemDef {
  key: string;
  label: string;
  subtitle: string;
  href: string;
  aliases?: string[];
  icon: React.ComponentType<{ isActive?: boolean; className?: string; size?: number }>;
}

export const COGENT_NAV_ITEMS: NavItemDef[] = [
  {
    key: 'overview',
    label: 'Overview',
    subtitle: 'Executive Cockpit',
    href: '/overview',
    icon: OverviewIcon,
  },
  {
    key: 'insight',
    label: 'Insight',
    subtitle: 'Horizon Scanning',
    href: '/insight',
    aliases: ['/radar'],
    icon: InsightIcon,
  },
  {
    key: 'marketing',
    label: 'Marketing Shield',
    subtitle: 'Ad Pre-Vetting',
    href: '/marketing',
    icon: MarketingIcon,
  },
  {
    key: 'gap',
    label: 'Gap',
    subtitle: 'Policy Concordance',
    href: '/gap',
    aliases: ['/gap-matrix'],
    icon: GapIcon,
  },
  {
    key: 'library',
    label: 'Regulatory Library',
    subtitle: 'Statutory Corpus',
    href: '/library',
    icon: LibraryIcon,
  },
  {
    key: 'audit',
    label: 'Audit Ledger',
    subtitle: 'CAMA 2020 Logs',
    href: '/audit',
    icon: AuditIcon,
  },
  {
    key: 'settings',
    label: 'Settings',
    subtitle: 'Institutions & Team',
    href: '/settings',
    icon: SettingsIcon,
  },
];

export interface NavigationRailProps {
  onToggleExpand?: (expanded: boolean) => void;
  activePillarOverride?: string;
  onNavigateOverride?: (href: string) => void;
}

export function NavigationRail({
  onToggleExpand,
  activePillarOverride,
  onNavigateOverride,
}: NavigationRailProps) {
  const pathname = usePathname();
  const [isPinnedExpanded, setIsPinnedExpanded] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Restore collapsed/expanded state from localStorage, default to true (expanded)
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem('cogent_rail_expanded');
      if (stored !== null) {
        const val = JSON.parse(stored);
        setIsPinnedExpanded(Boolean(val));
        onToggleExpand?.(Boolean(val));
      } else {
        setIsPinnedExpanded(true);
        onToggleExpand?.(true);
      }
    } catch {
      setIsPinnedExpanded(true);
      onToggleExpand?.(true);
    }
  }, [onToggleExpand]);

  const handleToggle = () => {
    const nextVal = !isPinnedExpanded;
    setIsPinnedExpanded(nextVal);
    onToggleExpand?.(nextVal);
    try {
      localStorage.setItem('cogent_rail_expanded', JSON.stringify(nextVal));
    } catch {
      // Ignore localStorage errors
    }
  };

  const isExpanded = isPinnedExpanded || isHovered;

  const isItemActive = (item: NavItemDef): boolean => {
    if (activePillarOverride) {
      if (activePillarOverride === item.key) return true;
      if (activePillarOverride === 'executive' && item.key === 'overview') return true;
      if (activePillarOverride === 'radar' && item.key === 'insight') return true;
      if (activePillarOverride === 'gap-matrix' && item.key === 'gap') return true;
    }
    if (!pathname) return item.key === 'overview';
    if (pathname === item.href) return true;
    if (item.aliases && item.aliases.includes(pathname)) return true;
    if (item.href !== '/' && item.href !== '/overview' && pathname.startsWith(item.href)) {
      return true;
    }
    if (item.key === 'insight' && pathname.startsWith('/radar')) return true;
    if (item.key === 'gap' && pathname.startsWith('/gap-matrix')) return true;
    return false;
  };

  const isClerkConfigured =
    isMounted && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <aside
      id="cogent-navigation-rail"
      aria-label="Primary Navigation"
      onMouseEnter={() => {
        if (!isPinnedExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      className={`fixed inset-y-0 left-0 flex flex-col bg-white border-r border-[#DDE3EE] transition-all duration-200 ease-in-out select-none ${
        isExpanded ? 'w-60 shadow-xl z-40' : 'w-16 z-30'
      }`}
    >
      {/* 1. Brand Monogram Header */}
      <div className="h-16 flex items-center border-b border-[#DDE3EE] px-3.5">
        <Link
          href="/overview"
          onClick={(e) => {
            if (onNavigateOverride) {
              e.preventDefault();
              onNavigateOverride('/overview');
            }
          }}
          className="flex items-center gap-3 w-full group overflow-hidden"
          title="Cogent RegTech OS"
        >
          {/* Original Cogent Platform Icon */}
          <div className="w-9 h-9 shrink-0 transition-transform group-hover:scale-105">
            <Image
              src="/icon.png"
              alt="Cogent RegTech"
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl object-contain shadow-sm shadow-[#2A4BFF]/25"
              priority
            />
          </div>


          {/* Expanded Brand Name */}
          <div
            className={`flex flex-col transition-opacity duration-150 ${
              isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none w-0'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-[#0B0F1A]">COGENT</span>
              <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE] font-semibold">
                OS
              </span>
            </div>
            <span className="text-[10px] text-[#8D99AE] font-medium truncate">
              RegTech Nigeria
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Middle Navigation Item Rail */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {COGENT_NAV_ITEMS.map((item) => {
          const active = isItemActive(item);
          const IconComponent = item.icon;

          return (
            <div key={item.key} className="relative group">
              <Link
                href={item.href}
                onClick={(e) => {
                  if (onNavigateOverride) {
                    e.preventDefault();
                    onNavigateOverride(item.href);
                  }
                }}
                className={`flex items-center rounded-xl transition-all duration-150 ${
                  isExpanded
                    ? 'px-3 py-2.5 gap-3'
                    : 'w-11 h-11 mx-auto justify-center'
                } ${
                  active
                    ? 'bg-[#EEF2FF] text-[#2A4BFF] font-semibold shadow-xs'
                    : 'text-[#4B5565] hover:text-[#0B0F1A] hover:bg-[#F5F6FA]'
                }`}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <div className={`shrink-0 transition-colors ${active ? 'text-[#2A4BFF]' : 'text-[#4B5565] group-hover:text-[#0B0F1A]'}`}>
                  <IconComponent isActive={active} size={20} />
                </div>

                {isExpanded && (
                  <div className="flex flex-col min-w-0 flex-1 truncate">
                    <span className="text-xs truncate font-medium">{item.label}</span>
                    <span className="text-[10px] text-[#8D99AE] truncate font-normal">
                      {item.subtitle}
                    </span>
                  </div>
                )}
              </Link>

              {/* Tooltip for Collapsed 64px State */}
              {!isExpanded && (
                <div
                  role="tooltip"
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-[#0B0F1A] text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 flex flex-col"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-[#8D99AE]">{item.subtitle}</span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Section: Expand Toggle & Tenancy Controls */}
      <div className="border-t border-[#DDE3EE] p-2 space-y-2">
        {/* Rail Collapse / Expand Toggle Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`flex items-center rounded-lg text-[#4B5565] hover:text-[#0B0F1A] hover:bg-[#F5F6FA] transition-colors ${
            isExpanded
              ? 'w-full px-3 py-1.5 justify-between text-xs font-medium'
              : 'w-11 h-9 mx-auto justify-center'
          }`}
          title={isPinnedExpanded ? 'Collapse Navigation (64px)' : 'Stick / Pin Navigation Open (240px)'}
          aria-label={isPinnedExpanded ? 'Collapse Navigation' : 'Stick / Pin Navigation Open'}
        >
          {isExpanded ? (
            <>
              <span className="text-[11px] font-medium text-[#8D99AE]">
                {isPinnedExpanded ? 'Collapse Rail' : 'Stick / Pin Open'}
              </span>
              <ChevronLeft className="w-4 h-4 text-[#8D99AE]" />
            </>
          ) : (
            <ChevronRight className="w-4 h-4 text-[#8D99AE]" />
          )}
        </button>

        {/* Clerk Org Switcher / Tenancy Profile */}
        <div
          className={`flex items-center transition-all ${
            isExpanded ? 'px-2 py-1 justify-between gap-2' : 'justify-center py-1'
          }`}
        >
          {isClerkConfigured ? (
            <Show when="signed-in">
              <div className="flex items-center gap-2 overflow-hidden">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox:
                        'w-8 h-8 ring-1 ring-[#DDE3EE] hover:ring-[#2A4BFF] transition-all',
                    },
                  }}
                />
                {isExpanded && (
                  <div className="overflow-hidden">
                    <OrganizationSwitcher
                      hidePersonal={true}
                      appearance={{
                        elements: {
                          rootBox: 'flex items-center max-w-[130px]',
                          organizationSwitcherTrigger:
                            'text-xs text-[#0B0F1A] font-medium truncate py-1 px-1 hover:bg-[#F5F6FA] rounded',
                          organizationPreviewTextContainer: 'truncate text-xs',
                        },
                      }}
                    />
                  </div>
                )}
              </div>
            </Show>
          ) : (
            <div
              className={`flex items-center ${
                isExpanded ? 'w-full gap-2.5 px-1 py-1' : 'justify-center'
              }`}
              title="Institution Context: CBN Tier-1 Sandbox"
            >
              <div className="w-8 h-8 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center shrink-0 text-[11px] font-bold text-[#2A4BFF]">
                CCO
              </div>
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#0B0F1A] truncate">
                    Apex FinTech PLC
                  </span>
                  <span className="text-[10px] text-[#10B981] font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    CBN Licensed
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
