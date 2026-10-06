'use client';

import React, { useState } from 'react';
import { PresentationActionItem } from '@/shared/types/presentation';
import { CheckSquare, Square, Clock, Building, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';

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
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  const getOwnerStyle = (owner: string) => {
    switch (owner) {
      case 'Compliance':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'Legal':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'Marketing':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div id="marketing-shield-action-checklist" className="space-y-4">
      {/* Header & Progress Indicator */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-400" />
            <span>Remediation Action Plan ({actions.length})</span>
          </h3>
          <p className="text-xs text-slate-400">
            Level 5 Progressive Disclosure: Statutory Rectification Tasks & Departmental Ownership
          </p>
        </div>

        {/* Progress Metric */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">
            {completedCount} of {actions.length} Completed
          </span>
          <div className="h-2 w-28 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
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
                ? 'border-emerald-500/30 bg-emerald-950/10 opacity-75'
                : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            {/* Checkbox Icon */}
            <button
              type="button"
              className="mt-0.5 text-slate-400 hover:text-white transition-colors"
            >
              {action.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Square className="h-5 w-5 text-slate-600" />
              )}
            </button>

            {/* Main Action Content */}
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    action.completed ? 'text-slate-400 line-through' : 'text-white'
                  }`}
                >
                  {action.title}
                </span>

                {/* Badges: Priority & Owner */}
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getPriorityStyle(
                      action.priority
                    )}`}
                  >
                    {action.priority}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getOwnerStyle(
                      action.ownerDepartment
                    )}`}
                  >
                    <Building className="h-2.5 w-2.5" />
                    <span>{action.ownerDepartment}</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{action.description}</p>

              {/* Deadline Indicator */}
              {action.suggestedDeadlineDays && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-400">
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
