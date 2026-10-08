'use client';

import React, { useState } from 'react';
import { PresentationActionItem } from '@/shared/types/presentation';
import { CheckSquare, Square, Clock, Building, CheckCircle2 } from 'lucide-react';

interface ActionChecklistProps {
  actions: PresentationActionItem[];
  onToggleAction?: (actionId: string, completed: boolean) => void;
}

export const ActionChecklist: React.FC<ActionChecklistProps> = ({
  actions: initialActions,
  onToggleAction,
}) => {
  const [actions, setActions] = useState<PresentationActionItem[]>(initialActions);

  const handleToggle = (id: string) => {
    const updated = actions.map((act) =>
      act.id === id ? { ...act, completed: !act.completed } : act
    );
    setActions(updated);
    const toggled = updated.find((a) => a.id === id);
    if (toggled && onToggleAction) {
      onToggleAction(id, !!toggled.completed);
    }
  };

  const completedCount = actions.filter((a) => a.completed).length;
  const progressPercent = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getOwnerStyle = (owner: string) => {
    switch (owner) {
      case 'Compliance':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Legal':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Marketing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="marketing-shield-action-checklist" className="space-y-4">
      {/* Header & Progress Indicator */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B0F1A] flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-[#10B981]" />
            <span>Remediation Action Plan ({actions.length})</span>
          </h3>
          <p className="text-xs text-[#4B5565]">
            Level 5 Progressive Disclosure: Statutory Rectification Tasks & Departmental Ownership
          </p>
        </div>

        {/* Progress Metric */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#4B5565] font-semibold">
            {completedCount} of {actions.length} Completed
          </span>
          <div className="h-2 w-28 rounded-full bg-[#E8EDF5] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#10B981] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Items List */}
      <div className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            onClick={() => handleToggle(action.id)}
            className={`flex items-start gap-4 rounded-xl border p-4 transition-all cursor-pointer ${
              action.completed
                ? 'border-emerald-200 bg-emerald-50/30'
                : 'border-[#DDE3EE] bg-white hover:border-[#2A4BFF]/40 hover:bg-[#F9FAFC] shadow-xs'
            }`}
          >
            {/* Checkbox Icon */}
            <button
              type="button"
              className="mt-0.5 text-[#8D99AE] hover:text-[#2A4BFF] transition-colors"
            >
              {action.completed ? (
                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
              ) : (
                <Square className="h-5 w-5 text-[#8D99AE]" />
              )}
            </button>

            {/* Main Action Content */}
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    action.completed ? 'text-[#8D99AE] line-through' : 'text-[#0B0F1A]'
                  }`}
                >
                  {action.title}
                </span>

                {/* Badges: Priority & Owner */}
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getPriorityStyle(
                      action.priority
                    )}`}
                  >
                    {action.priority}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getOwnerStyle(
                      action.ownerDepartment
                    )}`}
                  >
                    <Building className="h-2.5 w-2.5" />
                    <span>{action.ownerDepartment}</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#4B5565] leading-relaxed">{action.description}</p>

              {/* Deadline Indicator */}
              {action.suggestedDeadlineDays && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-700 font-medium">
                  <Clock className="h-3 w-3" />
                  <span>
                    Deadline: Within {action.suggestedDeadlineDays}{' '}
                    {action.suggestedDeadlineDays === 1 ? 'business day' : 'business days'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
