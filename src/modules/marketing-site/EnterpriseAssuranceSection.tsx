'use client';

import React from 'react';
import { ShieldCheck, UserCheck, Lock, Globe2, Network, ShieldAlert } from 'lucide-react';

interface SecurityTile {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const tiles: SecurityTile[] = [
  {
    title: 'Certified and compliant',
    desc: 'Engineered in compliance with CAMA 2020, BOFIA 2020 §5.2 standards, and NDPA 2023 data governance principles to ensure integrity across every layer of the operating system.',
    icon: <ShieldCheck className="w-5 h-5 text-slate-800" />,
  },
  {
    title: 'Access and identity management',
    desc: 'Granular role-based permissions (CCO, General Counsel, Bank Examiner, Risk Analyst) with Google OAuth and enterprise SSO integrations, ensuring only authorised personnel can review or sign off.',
    icon: <UserCheck className="w-5 h-5 text-slate-800" />,
  },
  {
    title: 'Secure by design',
    desc: 'Embeds deterministic rule evaluation and cryptographic SHA-256 state hashing at every stage of the compliance cascade, from circular ingestion to public campaign pre-clearance.',
    icon: <Lock className="w-5 h-5 text-slate-800" />,
  },
  {
    title: 'NDPA and data privacy governance',
    desc: 'Ensuring all financial customer data, internal manuals, and draft creatives remain strictly sovereign within Nigeria, never retained or utilized for external model weights training.',
    icon: <Globe2 className="w-5 h-5 text-slate-800" />,
  },
  {
    title: 'Integration without compromise',
    desc: 'Connecting securely via REST API, automated circular webhooks, and direct document ingestion, with optional connectors for leading core banking and governance systems.',
    icon: <Network className="w-5 h-5 text-slate-800" />,
  },
  {
    title: 'Resilience and reliability',
    desc: 'Powered by distributed edge proxy routing and high-availability infrastructure to maintain continuous, 24/7 supervisory surveillance across all apex Nigerian regulatory portals.',
    icon: <ShieldAlert className="w-5 h-5 text-slate-800" />,
  },
];

export function EnterpriseAssuranceSection() {
  return (
    <section className="py-24 md:py-32 bg-[#FBFBFA] border-t border-dotted border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Split-Color Header (Matching va.JPG) */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-tight">
            <span className="text-black">Enterprise-grade security.</span>{' '}
            <span className="text-[#9CA3AF]">Trusted infrastructure for compliance at scale.</span>
          </h2>
        </div>

        {/* 3x2 Grid System: Flush, flat layout with internal 1px borders and NO outer border box (Matching va.JPG) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 lg:divide-y-0 border-collapse">
          {tiles.map((tile, idx) => {
            // Compute internal borders to create borderless perimeter with internal 1px line splits
            // On desktop (3 cols):
            // Row 1 (0, 1, 2) has border-b
            // Col 1 & 2 (0, 1, 3, 4) have border-r on lg screens
            const hasBorderRight = idx % 3 !== 2;
            const hasBorderBottom = idx < 3;

            return (
              <div
                key={idx}
                className={`p-8 sm:p-10 flex flex-col justify-start space-y-4 bg-transparent ${
                  hasBorderRight ? 'lg:border-r border-[#E5E7EB]' : ''
                } ${hasBorderBottom ? 'lg:border-b border-[#E5E7EB]' : ''} ${
                  idx % 2 === 0 ? 'md:max-lg:border-r border-[#E5E7EB]' : ''
                } ${idx < 4 ? 'md:max-lg:border-b border-[#E5E7EB]' : ''}`}
              >
                <div className="p-1.5 w-8 h-8 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center">
                  {tile.icon}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {tile.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {tile.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
