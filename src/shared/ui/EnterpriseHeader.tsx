'use client';

import React from 'react';
import Image from 'next/image';
import { OrganizationSwitcher, UserButton, Show, SignInButton } from '@clerk/nextjs';
import { PlatformPillar } from '@/shared/types';
import { ShieldCheck, Radar, FileSearch, LayoutDashboard } from 'lucide-react';
import { useUserProfile } from '@/shared/hooks/useUserProfile';

export interface EnterpriseHeaderProps {
  activePillar?: PlatformPillar;
  onSwitchPillar?: (pillar: PlatformPillar) => void;
}

export function EnterpriseHeader({ activePillar = 'executive', onSwitchPillar }: EnterpriseHeaderProps) {
  const { roleBadge } = useUserProfile();
  const pillars: { id: PlatformPillar; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'executive', label: 'Command Center', icon: LayoutDashboard },
    { id: 'marketing', label: 'Marketing Shield', icon: ShieldCheck },
    { id: 'radar', label: 'Regulatory Radar', icon: Radar },
    { id: 'gap-matrix', label: '5-W Gap Matrix', icon: FileSearch },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#DDE3EE] px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Left Section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icon.png"
              alt="Cogent RegTech"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg shadow-xs object-contain"
              priority
            />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#0B0F1A] tracking-tight">COGENT</span>
                <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                  v1.2 REGTECH
                </span>
              </div>
              <p className="text-[11px] text-[#4B5565] font-mono hidden sm:block">
                African Financial Regulatory Intelligence
              </p>
            </div>
          </div>

          {/* Pillar Navigation Tabs */}
          {onSwitchPillar && (
            <nav className="hidden md:flex items-center gap-1 bg-[#F5F6FA] p-1 rounded-xl border border-[#DDE3EE]">
              {pillars.map((p) => {
                const Icon = p.icon;
                const isActive = activePillar === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSwitchPillar(p.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#2A4BFF] text-white font-semibold shadow-xs'
                        : 'text-[#4B5565] hover:text-[#0B0F1A] hover:bg-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section: Clerk Tenancy Controls or Dev Institutional Badge */}
        <div className="flex items-center gap-3">
          {Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ? (
            <>
              <Show when="signed-in">
                <div className="flex items-center">
                  <OrganizationSwitcher
                    hidePersonal={true}
                    afterCreateOrganizationUrl="/"
                    afterSelectOrganizationUrl="/"
                    afterLeaveOrganizationUrl="/sign-in"
                    appearance={{
                      elements: {
                        rootBox: 'flex items-center',
                        organizationSwitcherTrigger:
                          'bg-white border border-[#DDE3EE] hover:border-[#CBD5E1] text-[#0B0F1A] px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs transition-all focus:ring-1 focus:ring-[#2A4BFF]',
                        organizationPreviewTextContainer: 'text-[#0B0F1A] text-xs',
                        organizationSwitcherPopoverCard:
                          'bg-white border border-[#DDE3EE] text-[#0B0F1A] shadow-lg rounded-xl',
                        organizationSwitcherPopoverActionButton:
                          'text-[#4B5565] hover:bg-[#F5F6FA] hover:text-[#0B0F1A]',
                      },
                    }}
                  />
                </div>

                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8 ring-1 ring-[#DDE3EE] hover:ring-[#2A4BFF] transition-all',
                      userButtonPopoverCard:
                        'bg-white border border-[#DDE3EE] text-[#0B0F1A] shadow-lg rounded-xl',
                      userButtonPopoverActionButton:
                        'text-[#4B5565] hover:bg-[#F5F6FA] hover:text-[#0B0F1A]',
                    },
                  }}
                />
              </Show>

              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="px-3.5 py-1.5 rounded-lg bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white font-semibold text-xs transition-all shadow-xs">
                    Sign In
                  </button>
                </SignInButton>
              </Show>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded-md bg-[#EEF2FF] border border-[#C7D2FE] text-[#2A4BFF] text-xs font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span>Tenant: Enterprise Compliance</span>
              </div>
              <div className="w-7 h-7 rounded-full bg-[#F5F6FA] border border-[#DDE3EE] flex items-center justify-center text-[10px] font-bold text-[#2A4BFF]">
                {roleBadge}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
