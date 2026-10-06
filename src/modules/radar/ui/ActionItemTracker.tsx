'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Clock,
  UserCheck,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { OrgDepartment } from '@/shared/types';
import { RadarActionItemPresentation } from '../types';

export interface ActionItemTrackerProps {
  initialItems?: RadarActionItemPresentation[];
  circularNumber: string;
  statutoryDeadline: string | null;
  onItemsChange?: (items: RadarActionItemPresentation[]) => void;
}

export function ActionItemTracker({
  initialItems = [],
  circularNumber,
  statutoryDeadline,
  onItemsChange,
}: ActionItemTrackerProps) {
  const [items, setItems] = useState<RadarActionItemPresentation[]>(initialItems);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDept, setNewDept] = useState<OrgDepartment>('COMPLIANCE_LEGAL');
  const [newDeadline, setNewDeadline] = useState(statutoryDeadline || '');

  const handleToggleCompleted = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setItems(updated);
    if (onItemsChange) onItemsChange(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: RadarActionItemPresentation = {
      id: `task_${Date.now()}`,
      actionTitle: newTitle.trim(),
      actionDescription: newDesc.trim() || 'Internal operational requirement.',
      targetDepartment: newDept,
      suggestedDeadline: newDeadline || null,
      isCompleted: false,
    };

    const updated = [newItem, ...items];
    setItems(updated);
    if (onItemsChange) onItemsChange(updated);

    // Reset form
    setNewTitle('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const filteredItems =
    selectedDept === 'ALL'
      ? items
      : items.filter((i) => i.targetDepartment === selectedDept);

  const getDeptColor = (dept: OrgDepartment) => {
    switch (dept) {
      case 'COMPLIANCE_LEGAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'OPERATIONS':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'ENGINEERING_TECH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'TREASURY_FINANCE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'PRODUCT_MANAGEMENT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0B111E]/90 p-5 shadow-xl backdrop-blur-xl">
      {/* Header & Progress */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Action Item Tracker
              </h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                {completedCount} / {items.length} Completed
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Departmental compliance tasks for {circularNumber}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
          <span>Execution Progress</span>
          <span className="text-cyan-400 font-bold">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Department Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs">
        <span className="text-[11px] text-slate-500 flex items-center gap-1 mr-1">
          <Filter className="h-3 w-3" /> Filter:
        </span>
        {['ALL', 'COMPLIANCE_LEGAL', 'OPERATIONS', 'ENGINEERING_TECH', 'TREASURY_FINANCE'].map(
          (dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                selectedDept === dept
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {dept === 'ALL' ? 'All Departments' : dept.replace(/_/g, ' ')}
            </button>
          )
        )}
      </div>

      {/* Inline Add Task Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddItem}
          className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <h4 className="text-xs font-bold text-cyan-300 mb-2">Assign New Compliance Task</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Task Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Conduct partner bank routing audit"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Operational Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Specific implementation guidance..."
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Target Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value as OrgDepartment)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="COMPLIANCE_LEGAL">COMPLIANCE & LEGAL</option>
                  <option value="OPERATIONS">OPERATIONS</option>
                  <option value="ENGINEERING_TECH">ENGINEERING & TECH</option>
                  <option value="TREASURY_FINANCE">TREASURY & FINANCE</option>
                  <option value="PRODUCT_MANAGEMENT">PRODUCT MANAGEMENT</option>
                  <option value="EXECUTIVE_LEADERSHIP">EXECUTIVE LEADERSHIP</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Suggested Deadline</label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
              >
                Save Task
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Action Items List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
            No compliance tasks assigned for this department filter.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleCompleted(item.id)}
              className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                item.isCompleted
                  ? 'border-emerald-900/30 bg-emerald-950/10 opacity-75'
                  : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors"
              >
                {item.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Square className="h-5 w-5 text-slate-500 hover:text-slate-300" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h4
                    className={`text-xs font-bold ${
                      item.isCompleted
                        ? 'line-through text-slate-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {item.actionTitle}
                  </h4>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getDeptColor(
                      item.targetDepartment
                    )}`}
                  >
                    {item.targetDepartment.replace(/_/g, ' ')}
                  </span>
                </div>

                <p
                  className={`text-[11px] leading-relaxed mb-2 ${
                    item.isCompleted ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {item.actionDescription}
                </p>

                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  {item.suggestedDeadline && (
                    <span className="flex items-center gap-1 font-mono text-slate-400">
                      <Calendar className="h-3 w-3 text-cyan-400" />
                      Deadline: {item.suggestedDeadline}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-slate-500" />
                    Status: {item.isCompleted ? 'Completed' : 'Pending Action'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
