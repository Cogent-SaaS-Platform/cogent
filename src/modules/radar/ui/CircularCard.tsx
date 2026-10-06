'use client';

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  Building,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { RadarCircularPresentationCard } from '../types';

export interface CircularCardProps {
  card: RadarCircularPresentationCard;
  isSelected: boolean;
  onSelect: () => void;
}

export function CircularCard({ card, isSelected, onSelect }: CircularCardProps) {
  const isUrgent = card.priority === 'CRITICAL_EMERGENCY' || card.priority === 'HIGH';

  const getRegulatorBadgeClass = (regulator: string) => {
    switch (regulator) {
      case 'CBN':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'SEC':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      case 'ARCON':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'NDPC':
        return 'bg-teal-950/80 text-teal-300 border-teal-700/60';
      case 'FCCPC':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'NFIU':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
      case 'NDIC':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getLineageBadge = () => {
    const status = card.lineageStatus || 'ACTIVE_LAW';
    switch (status) {
      case 'SUPERSEDED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/60 bg-rose-950/70 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            SUPERSEDED
          </span>
        );
      case 'AMENDED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/60 bg-amber-950/70 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            AMENDED
          </span>
        );
      case 'ACTIVE_LAW':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/60 bg-emerald-950/70 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            ACTIVE LAW
          </span>
        );
    }
  };

  const getCountdownBadge = () => {
    switch (card.countdownTier) {
      case 'CRITICAL_EMERGENCY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/80 bg-red-950/70 px-2.5 py-0.5 text-[10px] font-bold text-red-300 animate-pulse shadow-sm shadow-red-950">
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
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/80 bg-amber-950/70 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 shadow-sm">
            <Clock className="h-3 w-3" />
            {card.daysRemaining !== null ? `${card.daysRemaining}D REMAINING` : 'HIGH'}
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-600/70 bg-yellow-950/50 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-300">
            <Clock className="h-3 w-3" />
            {card.daysRemaining !== null ? `${card.daysRemaining}D REMAINING` : 'MEDIUM'}
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/60 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
            <Clock className="h-3 w-3" />
            {card.daysRemaining !== null ? `${card.daysRemaining}D` : 'LOW'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
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
          ? 'border-cyan-500/80 bg-slate-900/90 shadow-xl shadow-cyan-950/20 ring-1 ring-cyan-500/30'
          : 'border-slate-800/80 bg-[#0B111E]/70 hover:bg-slate-900/60 hover:border-slate-700'
      }`}
    >
      {/* Top Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getRegulatorBadgeClass(
              card.regulator
            )}`}
          >
            {card.regulator}
          </span>
          <span className="font-mono text-xs font-semibold text-slate-300">
            {card.circularNumber}
          </span>
          {getLineageBadge()}
        </div>

        {getCountdownBadge()}
      </div>

      {/* Subject */}
      <h3
        className={`text-xs font-bold leading-snug line-clamp-2 mb-2 transition-colors ${
          isSelected ? 'text-white' : 'text-slate-200 group-hover:text-cyan-300'
        }`}
      >
        {card.subject}
      </h3>

      {/* Applicability Indicator */}
      <div className="mb-3">
        {card.applicability.isApplicable ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Applies to Your Institution</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span className="truncate">Not Applicable (Noise Filtered)</span>
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>Pub: {card.publicationDate}</span>
          {card.statutoryDeadline && (
            <span>• Deadline: {card.statutoryDeadline}</span>
          )}
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${
            isSelected
              ? 'text-cyan-400 translate-x-1'
              : 'text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
}
