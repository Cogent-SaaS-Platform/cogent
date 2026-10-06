'use client';

import React from 'react';
import { OrganizationSwitcher, UserButton, Show, SignInButton } from '@clerk/nextjs';
import { PlatformPillar } from '@/shared/types';
import { ShieldCheck, Radar, FileSearch, LayoutDashboard } from 'lucide-react';

export interface EnterpriseHeaderProps {
  activePillar?: PlatformPillar;
  onSwitchPillar?: (pillar: PlatformPillar) => void;
}

export function EnterpriseHeader({ activePillar = 'executive', onSwitchPillar }: EnterpriseHeaderProps) {
  const pillars: { id: PlatformPillar; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'executive', label: 'Command Center', icon: LayoutDashboard },
    { id: 'marketing', label: 'Marketing Shield', icon: ShieldCheck },
    { id: 'radar', label: 'Regulatory Radar', icon: Radar },
    { id: 'gap-matrix', label: '5-W Gap Matrix', icon: FileSearch },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Left Section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <span className="font-extrabold text-white text-base">C</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-wide">COGENT</span>
                <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  v1.2 REGTECH
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                African Financial Regulatory Intelligence
              </p>
            </div>
          </div>

          {/* Pillar Navigation Tabs */}
          {onSwitchPillar && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              {pillars.map((p) => {
                const Icon = p.icon;
                const isActive = activePillar === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSwitchPillar(p.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
                {/* Organization Switcher (Personal workspaces disabled for enterprise institutions) */}
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
                          'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-all focus:ring-1 focus:ring-cyan-500',
                        organizationPreviewTextContainer: 'text-slate-200 text-xs',
                        organizationSwitcherPopoverCard:
                          'bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl rounded-xl',
                        organizationSwitcherPopoverActionButton:
                          'text-slate-300 hover:bg-slate-800 hover:text-white',
                      },
                    }}
                  />
                </div>

                {/* User Profile Avatar */}
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8 ring-1 ring-slate-700 hover:ring-cyan-500 transition-all',
                      userButtonPopoverCard:
                        'bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl rounded-xl',
                      userButtonPopoverActionButton:
                        'text-slate-300 hover:bg-slate-800 hover:text-white',
                    },
                  }}
                />
              </Show>

              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-cyan-500/20">
                    Sign In
                  </button>
                </SignInButton>
              </Show>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Tenant: Enterprise Compliance</span>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                CCO
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
