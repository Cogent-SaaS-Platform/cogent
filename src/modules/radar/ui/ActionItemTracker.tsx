'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Clock,
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
  onInspectItem?: (item: RadarActionItemPresentation) => void;
}

export function ActionItemTracker({
  initialItems = [],
  circularNumber,
  statutoryDeadline,
  onItemsChange,
  onInspectItem,
}: ActionItemTrackerProps) {
  const [items, setItems] = useState<RadarActionItemPresentation[]>(initialItems);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDept, setNewDept] = useState<OrgDepartment>('COMPLIANCE_LEGAL');
  const [newDeadline, setNewDeadline] = useState(statutoryDeadline || '');

  const handleToggleCompleted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div className="rounded-2xl border border-[#DDE3EE] bg-white p-5 shadow-xs space-y-4">
      {/* Header with Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E8EDF5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#0B0F1A]">
              Statutory Obligations & Remediation Checklist
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#EEF2FF] text-[#2A4BFF]">
              {completedCount} / {items.length} Done
            </span>
          </div>
          <p className="text-xs text-[#4B5565] mt-0.5">
            Departmental SLAs enforced to prevent non-compliance sanctions under CAMA 2020.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-base btn-secondary btn-xs gap-1 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5 text-[#2A4BFF]" />
          <span>{showAddForm ? 'Cancel' : 'Add Action Item'}</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-[#4B5565] font-medium">
          <span>Overall Implementation Progress</span>
          <span className="font-mono font-bold text-[#0B0F1A]">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#E8EDF5] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#2A4BFF] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Department Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {['ALL', 'COMPLIANCE_LEGAL', 'OPERATIONS', 'ENGINEERING_TECH', 'TREASURY_FINANCE'].map(
          (dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDept === dept
                  ? 'bg-[#2A4BFF] text-white shadow-xs'
                  : 'bg-[#F5F6FA] text-[#4B5565] hover:bg-[#EEF2FF] hover:text-[#2A4BFF]'
              }`}
            >
              {dept === 'ALL' ? 'All Departments' : dept.replace(/_/g, ' ')}
            </button>
          )
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="p-4 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] space-y-3">
          <h4 className="text-xs font-bold text-[#0B0F1A]">Assign New Action Item</h4>
          <div className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Action Title (e.g., Update POS Limit Rules)..."
              className="cogent-input text-xs w-full"
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Action Details & Implementation Mandate..."
              rows={2}
              className="cogent-input text-xs w-full resize-none"
            />
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <select
              value={newDept}
              onChange={(e) => setNewDept(e.target.value as OrgDepartment)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#DDE3EE] rounded-lg text-[#0B0F1A]"
            >
              <option value="COMPLIANCE_LEGAL">Compliance & Legal</option>
              <option value="OPERATIONS">Operations</option>
              <option value="ENGINEERING_TECH">Engineering & Tech</option>
              <option value="TREASURY_FINANCE">Treasury & Finance</option>
            </select>
            <button type="submit" className="btn-base btn-primary btn-xs">
              Save Action Item
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="divide-y divide-[#E8EDF5] border border-[#DDE3EE] rounded-xl overflow-hidden bg-white">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8D99AE]">
            No action items assigned to this department.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onInspectItem?.(item)}
              className={`p-3.5 flex items-start justify-between gap-3 hover:bg-[#F9FAFC] transition-colors cursor-pointer ${
                item.isCompleted ? 'bg-[#F9FAFC]/50' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={(e) => handleToggleCompleted(item.id, e)}
                  className="mt-0.5 text-[#8D99AE] hover:text-[#2A4BFF] shrink-0"
                  aria-label={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                >
                  {item.isCompleted ? (
                    <CheckSquare className="h-4 w-4 text-[#10B981]" />
                  ) : (
                    <Square className="h-4 w-4 text-[#8D99AE]" />
                  )}
                </button>
                <div className="space-y-0.5 min-w-0">
                  <span
                    className={`text-xs font-semibold block truncate ${
                      item.isCompleted
                        ? 'line-through text-[#8D99AE]'
                        : 'text-[#0B0F1A]'
                    }`}
                  >
                    {item.actionTitle}
                  </span>
                  <p className="text-[11px] text-[#4B5565] line-clamp-1">
                    {item.actionDescription}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                      {item.targetDepartment.replace(/_/g, ' ')}
                    </span>
                    {item.suggestedDeadline && (
                      <span className="text-[10px] text-[#8D99AE] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#F59E0B]" />
                        <span>SLA: {item.suggestedDeadline}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  item.isCompleted
                    ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                    : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                }`}
              >
                {item.isCompleted ? 'Completed' : 'Pending'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
