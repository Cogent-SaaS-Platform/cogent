'use client';

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { RadarCircularPresentationCard } from '../types';

export interface CircularCardProps {
  card: RadarCircularPresentationCard;
  isSelected: boolean;
  onSelect: () => void;
  onInspect?: () => void;
}

export function CircularCard({ card, isSelected, onSelect, onInspect }: CircularCardProps) {
  const getRegulatorBadgeClass = (regulator: string) => {
    switch (regulator) {
      case 'CBN':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SEC':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'ARCON':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'NDPC':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'FCCPC':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'NFIU':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'NDIC':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getLineageBadge = () => {
    const status = card.lineageStatus || 'ACTIVE_LAW';
    switch (status) {
      case 'SUPERSEDED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            SUPERSEDED
          </span>
        );
      case 'AMENDED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            AMENDED
          </span>
        );
      case 'ACTIVE_LAW':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ACTIVE LAW
          </span>
        );
    }
  };

  const getCountdownBadge = () => {
    switch (card.countdownTier) {
      case 'CRITICAL_EMERGENCY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700 animate-pulse shadow-sm">
            <Clock className="h-3 w-3" />
            {card.daysRemaining !== null
              ? card.daysRemaining < 0
                ? `EXPIRED (${Math.abs(card.daysRemaining)}d)`
                : `CRITICAL: ${card.daysRemaining}D LEFT`
              : 'CRITICAL'}
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 shadow-sm">
            <Clock className="h-3 w-3" />
            {card.daysRemaining !== null ? `${card.daysRemaining}D REMAINING` : 'HIGH'}
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-800">
            <Clock className="h-3 w-3" />
            {card.daysRemaining !== null ? `${card.daysRemaining}D REMAINING` : 'MEDIUM'}
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
            <Clock className="h-3 w-3" />
            {card.daysRemaining !== null ? `${card.daysRemaining}D` : 'LOW'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#DDE3EE] bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-[#4B5565]">
            NO DEADLINE
          </span>
        );
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-[#2A4BFF] bg-[#2A4BFF]/5 shadow-sm ring-1 ring-[#2A4BFF]'
          : 'border-[#DDE3EE] bg-white hover:border-[#2A4BFF]/40 hover:bg-[#F9FAFC]'
      }`}
    >
      {/* Top Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getRegulatorBadgeClass(
              card.regulator
            )}`}
          >
            {card.regulator}
          </span>
          <span className="font-mono text-xs font-semibold text-[#0B0F1A]">
            {card.circularNumber}
          </span>
          {getLineageBadge()}
        </div>

        {getCountdownBadge()}
      </div>

      {/* Subject */}
      <h3
        className={`text-xs font-bold leading-snug line-clamp-2 mb-2 transition-colors ${
          isSelected ? 'text-[#2A4BFF]' : 'text-[#0B0F1A] group-hover:text-[#2A4BFF]'
        }`}
      >
        {card.subject}
      </h3>

      {/* Applicability Indicator */}
      <div className="mb-3">
        {card.applicability.isApplicable ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">Applies to Your Institution</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#4B5565]">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="truncate">Not Applicable (Noise Filtered)</span>
          </div>
        )}
      </div>

      {/* Footer Details: Dual Date Lineage */}
      <div className="flex items-center justify-between border-t border-[#DDE3EE] pt-2.5 text-[10px] text-[#4B5565]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[#0B0F1A]">Issued: {card.publicationDate}</span>
          <span className="text-[#8D99AE]">•</span>
          <span>Effective: {card.effectiveDate || card.publicationDate}</span>
          {card.statutoryDeadline && (
            <>
              <span className="text-[#8D99AE]">•</span>
              <span className="text-amber-700 font-bold">Due: {card.statutoryDeadline}</span>
            </>
          )}
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform shrink-0 ${
            isSelected
              ? 'text-[#2A4BFF] translate-x-1'
              : 'text-slate-400 group-hover:text-[#2A4BFF] group-hover:translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
}
