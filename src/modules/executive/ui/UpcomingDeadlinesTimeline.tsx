'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RegulatorCode } from '@/shared/types';
import { DashboardDeadlineItem } from '@/app/api/dashboard/overview/route';
import { UrgentComplianceGate } from '../types';

export interface UpcomingDeadlinesTimelineProps {
  deadlines?: DashboardDeadlineItem[];
  gates?: UrgentComplianceGate[];
  onInspectDeadline?: (item: DashboardDeadlineItem) => void;
  onInspectGate?: (gate: UrgentComplianceGate) => void;
  onRefresh?: () => void;
}

export function UpcomingDeadlinesTimeline({
  deadlines = [],
  gates = [],
  onInspectDeadline,
  onInspectGate,
  onRefresh,
}: UpcomingDeadlinesTimelineProps) {
  const router = useRouter();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [calendarFilterRegulator, setCalendarFilterRegulator] = useState<string>('ALL');

  // Form states for + Add Deadline
  const [formTitle, setFormTitle] = useState('');
  const [formRegulator, setFormRegulator] = useState<RegulatorCode>('CBN');
  const [formDueDate, setFormDueDate] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formModule, setFormModule] = useState<'horizon' | 'library' | 'gap' | 'marketing'>('horizon');
  const [isSubmittingDeadline, setIsSubmittingDeadline] = useState(false);

  // Normalize input items to unified DashboardDeadlineItem interface
  const items: DashboardDeadlineItem[] = useMemo(() => {
    if (deadlines && deadlines.length > 0) {
      return deadlines;
    }

    if (gates && gates.length > 0) {
      return gates.map((g) => {
        const cleanTitle = g.title.replace(new RegExp(`^${g.regulatorCode}\\s*`, 'i'), '').trim();
        const shortTopic = cleanTitle.split(/\s+/).slice(0, 2).join(' ') || 'Filing';
        const targetUrl =
          g.sourcePillar === 'radar'
            ? `/insight?search=${encodeURIComponent(g.linkContext?.searchTerm || g.title)}`
            : g.sourcePillar === 'gap-matrix'
            ? `/gap?policy=${encodeURIComponent(g.linkContext?.searchTerm || g.title)}`
            : `/marketing`;

        return {
          id: g.id,
          sourceId: g.id,
          sourceModule: (g.sourcePillar === 'radar' ? 'horizon' : g.sourcePillar === 'gap-matrix' ? 'gap' : 'marketing') as any,
          title: g.title,
          shortLabel: `${g.regulatorCode} • ${shortTopic}`,
          regulatorCode: g.regulatorCode,
          dueDate: g.deadlineDate,
          daysRemaining: g.daysRemaining,
          priority: g.priority,
          summary: g.actionRequired,
          targetUrl,
          actionRequired: g.actionRequired,
        };
      });
    }

    return [];
  }, [deadlines, gates]);

  // Select first item by default if none selected
  const activeItem = useMemo(() => {
    if (items.length === 0) return null;
    if (selectedItemId) {
      return items.find((it) => it.id === selectedItemId) || items[0];
    }
    return items[0];
  }, [items, selectedItemId]);

  const now = new Date();

  // Helper to format ISO dates to clean "15 Nov" or "31 Dec"
  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr?: string): string => {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Dynamic 4-month axis labels starting from current month
  const monthLabels = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d);
    });
  }, []);

  // Calculate percentage positions across timeline track
  const getPositionPercent = (index: number, total: number) => {
    if (total <= 1) return 50;
    return Math.round(14 + (index / (total - 1)) * 76);
  };

  const handleInspect = (item: DashboardDeadlineItem) => {
    if (onInspectDeadline) {
      onInspectDeadline(item);
    } else if (onInspectGate && gates.length > 0) {
      const matchedGate = gates.find((g) => g.id === item.sourceId || g.id === item.id);
      if (matchedGate) onInspectGate(matchedGate);
      else router.push(item.targetUrl);
    } else {
      router.push(item.targetUrl);
    }
  };

  // Handle + Add Deadline Form Submission
  const handleSubmitAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDueDate) return;

    setIsSubmittingDeadline(true);
    try {
      const res = await fetch('/api/dashboard/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          regulatorCode: formRegulator,
          dueDate: formDueDate,
          summary: formSummary.trim(),
          sourceModule: formModule,
        }),
      });

      if (res.ok) {
        setFormTitle('');
        setFormSummary('');
        setFormDueDate('');
        setIsAddingDeadline(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed submitting deadline', err);
    } finally {
      setIsSubmittingDeadline(false);
    }
  };

  // Filtered list for calendar modal
  const filteredCalendarItems = useMemo(() => {
    if (calendarFilterRegulator === 'ALL') return items;
    return items.filter((it) => it.regulatorCode.toUpperCase() === calendarFilterRegulator.toUpperCase());
  }, [items, calendarFilterRegulator]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* 1. Header with Calendar link */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Upcoming Deadlines
        </h2>
        <button
          type="button"
          onClick={() => setIsCalendarModalOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>Calendar</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Horizontal Timeline Track Container */}
      <div className="relative pt-8 pb-10 px-2 overflow-x-auto min-w-[620px]">
        {/* Urgent Shaded Zone (covers immediate 30-day window) */}
        <div
          className="absolute top-2 bottom-8 left-4 w-[36%] bg-rose-50/70 border-r border-rose-200/80 rounded-l-md pointer-events-none"
          title="Imminent Enforcement Window (< 30 days)"
        />

        {/* Dynamic Month Axis Labels at bottom */}
        <div className="absolute bottom-1 left-4 right-4 flex justify-between text-[11px] font-semibold text-slate-400 select-none">
          <span className="w-16 text-left">{monthLabels[0]}</span>
          <span className="w-16 text-center">{monthLabels[1]}</span>
          <span className="w-16 text-center">{monthLabels[2]}</span>
          <span className="w-16 text-right">{monthLabels[3]}</span>
        </div>

        {/* Continuous Horizontal Axis Line */}
        <div className="relative h-0.5 bg-slate-200 w-full my-6">
          {/* Today Marker */}
          <div className="absolute -top-7 left-4 flex flex-col items-center select-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Today
            </span>
            <div className="w-px h-8 bg-rose-400 border-l border-dashed border-rose-500" />
            <div className="w-2 h-2 rounded-full bg-rose-500 -mt-1 ring-2 ring-white" />
          </div>

          {/* Chronological Milestone Nodes */}
          {items.map((item, idx) => {
            const leftPercent = getPositionPercent(idx, items.length);
            const isImminent = item.daysRemaining >= 0 && item.daysRemaining <= 30;
            const isSelected = activeItem?.id === item.id;
            const displayDate = formatDisplayDate(item.dueDate);

            return (
              <div
                key={item.id}
                style={{ left: `${leftPercent}%` }}
                className="absolute -top-12 -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                onClick={() => setSelectedItemId(item.id)}
              >
                {/* Date Label */}
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap group-hover:text-slate-900 transition-colors">
                  {displayDate}
                </span>

                {/* Regulator + Short Topic (Strictly clean without duplicate strings) */}
                <span className="text-[10px] font-medium text-slate-500 truncate max-w-[105px] text-center mb-1 group-hover:text-slate-900 transition-colors">
                  {item.shortLabel}
                </span>

                {/* Vertical Stem down to timeline */}
                <div
                  className={`w-px h-6 transition-colors ${
                    isImminent
                      ? 'bg-rose-400 group-hover:bg-rose-600'
                      : 'bg-slate-300 group-hover:bg-slate-500'
                  }`}
                />

                {/* Axis Node Pin Dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full ring-2 ring-white transition-all transform group-hover:scale-125 ${
                    isImminent ? 'bg-rose-500' : 'bg-slate-700'
                  } ${isSelected ? 'ring-4 ring-slate-900 scale-125' : ''}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Milestone Detail Banner */}
      {activeItem && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                {activeItem.regulatorCode}
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {activeItem.title}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Due: {formatDisplayDate(activeItem.dueDate)}{' '}
                {activeItem.daysRemaining >= 0
                  ? `(${activeItem.daysRemaining}d remaining)`
                  : `(${Math.abs(activeItem.daysRemaining)}d ago)`}
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
              {activeItem.summary || activeItem.actionRequired}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleInspect(activeItem)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            <span>
              Inspect in{' '}
              {activeItem.sourceModule === 'horizon'
                ? 'Horizon'
                : activeItem.sourceModule === 'library'
                ? 'Library'
                : activeItem.sourceModule === 'gap'
                ? 'Gap'
                : 'Marketing'}
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MODAL: Full Calendar & + Add Deadline Modal */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Statutory Compliance Calendar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological enforcement gates across CBN, SEC, NDPC, FCCPC, and ARCON
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDeadline(!isAddingDeadline)}
                  className="btn-base btn-primary btn-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingDeadline ? 'View List' : 'Add Deadline'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Inline Add Deadline Form */}
            {isAddingDeadline ? (
              <form onSubmit={handleSubmitAddDeadline} className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <h4 className="font-bold text-slate-900 text-xs">Add New Statutory Filing Deadline</h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Filing Title / Obligation
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. NDPC Statutory Annual Data Audit Attestation"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Regulator
                    </label>
                    <select
                      value={formRegulator}
                      onChange={(e) => setFormRegulator(e.target.value as RegulatorCode)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                    >
                      <option value="CBN">CBN</option>
                      <option value="NDPC">NDPC</option>
                      <option value="SEC">SEC</option>
                      <option value="FCCPC">FCCPC</option>
                      <option value="ARCON">ARCON</option>
                      <option value="NFIU">NFIU</option>
                      <option value="NDIC">NDIC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Statutory Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Target Module
                    </label>
                    <select
                      value={formModule}
                      onChange={(e) => setFormModule(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                    >
                      <option value="horizon">Horizon Scanning</option>
                      <option value="library">Regulation Library</option>
                      <option value="gap">Policy Gap Analysis</option>
                      <option value="marketing">Marketing Shield</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mandatory Action Summary
                  </label>
                  <textarea
                    rows={2}
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="Brief description of what must be submitted to avoid statutory default proceedings..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingDeadline(false)}
                    className="btn-base btn-secondary btn-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDeadline}
                    className="btn-base btn-primary btn-xs"
                  >
                    {isSubmittingDeadline ? 'Saving...' : 'Save Statutory Deadline'}
                  </button>
                </div>
              </form>
            ) : (
              /* Calendar Milestones List */
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {/* Regulator Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {['ALL', 'CBN', 'SEC', 'NDPC', 'FCCPC', 'ARCON', 'NFIU'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCalendarFilterRegulator(r)}
                      className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-medium transition-colors ${
                        calendarFilterRegulator === r
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredCalendarItems.map((item) => {
                    const isImminent = item.daysRemaining >= 0 && item.daysRemaining <= 30;

                    return (
                      <div
                        key={item.id}
                        className="py-3 flex items-start justify-between gap-3 group hover:bg-slate-50/60 px-2 rounded-lg transition-colors text-xs"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.regulatorCode}
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] line-clamp-1">
                            {item.summary}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {formatFullDate(item.dueDate)}
                            </span>
                            <span
                              className={`font-mono text-[10px] font-semibold ${
                                isImminent
                                  ? 'text-rose-600'
                                  : item.daysRemaining < 0
                                  ? 'text-slate-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {item.daysRemaining >= 0
                                ? `${item.daysRemaining}d remaining`
                                : `${Math.abs(item.daysRemaining)}d ago`}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsCalendarModalOpen(false);
                              handleInspect(item);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-200/60 transition-colors"
                            title="Inspect in document cockpit"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
