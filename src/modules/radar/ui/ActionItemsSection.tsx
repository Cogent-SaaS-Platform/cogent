'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Clock,
  ChevronDown,
  Layers,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { OrgDepartment } from '@/shared/types';
import { RadarActionItemPresentation } from '../types';
import { TeamMember, FunctionalRole } from '@/modules/organization/types';

export interface ActionItemsSectionProps {
  initialItems?: RadarActionItemPresentation[];
  circularNumber: string;
  circularId?: string;
  statutoryDeadline: string | null;
  onItemsChange?: (items: RadarActionItemPresentation[]) => void;
  onInspectItem?: (item: RadarActionItemPresentation) => void;
}

export function ActionItemsSection({
  initialItems = [],
  circularNumber,
  circularId,
  statutoryDeadline,
  onItemsChange,
  onInspectItem,
}: ActionItemsSectionProps) {
  const [items, setItems] = useState<RadarActionItemPresentation[]>(initialItems);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [functionalRoles, setFunctionalRoles] = useState<FunctionalRole[]>([]);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDept, setNewDept] = useState<OrgDepartment>('COMPLIANCE_LEGAL');
  const [newDeadline, setNewDeadline] = useState(statutoryDeadline || '');
  const [newAssignee, setNewAssignee] = useState<string>('');

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    let isMounted = true;
    async function loadMembers() {
      try {
        const res = await fetch('/api/organization/members');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setMembers(data.members || []);
            setFunctionalRoles(data.functionalRoles || []);
          }
        }
      } catch (err) {
        console.error('Failed to load organization members for action items', err);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleCompleted = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetItem = items.find((i) => i.id === id);
    if (!targetItem) return;

    const nextCompleted = !targetItem.isCompleted;
    const updated = items.map((item) =>
      item.id === id ? { ...item, isCompleted: nextCompleted } : item
    );
    setItems(updated);
    if (onItemsChange) onItemsChange(updated);

    // Persist via PATCH /api/radar/action-items/[id]
    try {
      await fetch(`/api/radar/action-items/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
    } catch (err) {
      console.error('Failed to persist action item completion', err);
    }
  };

  const handleReassignItem = async (itemId: string, assigneeValue: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, assignedTo: assigneeValue || null } : item
    );
    setItems(updated);
    if (onItemsChange) onItemsChange(updated);

    // Persist to PATCH /api/radar/action-items/[id]
    try {
      const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assigneeValue);
      await fetch(`/api/radar/action-items/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToUserId: isUserUuid ? assigneeValue : null,
          assignedRole: isUserUuid ? null : (assigneeValue || null),
        }),
      });
    } catch (err) {
      console.error('Failed to persist inline action item reassignment', err);
    }
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
      assignedTo: newAssignee || null,
    };

    const updated = [newItem, ...items];
    setItems(updated);
    if (onItemsChange) onItemsChange(updated);

    // Reset form
    setNewTitle('');
    setNewDesc('');
    setNewAssignee('');
    setShowAddForm(false);
  };

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const filteredItems =
    selectedDept === 'ALL'
      ? items
      : items.filter((i) => i.targetDepartment === selectedDept);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Statutory Delegated Duties & SLAs
            </h3>
            <span className="font-mono text-xs text-slate-600">
              {completedCount} / {items.length} Fulfilled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational mandates delegated across institutional roles under BOFIA 2020.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1 self-start sm:self-auto transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>{showAddForm ? 'Cancel' : 'Add Action Item'}</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span className="font-medium text-[11px] uppercase tracking-wider">Implementation Progress</span>
          <span className="font-mono font-bold text-slate-900">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-100">
        {['ALL', 'COMPLIANCE_LEGAL', 'OPERATIONS', 'ENGINEERING_TECH', 'TREASURY_FINANCE'].map(
          (dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedDept === dept
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {dept === 'ALL' ? 'All Departments' : dept.replace(/_/g, ' ')}
            </button>
          )
        )}
      </div>

      {/* Inline Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Delegate Statutory Duty
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Action Title (e.g. Update Settlement Risk Parameter)..."
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-hidden focus:border-slate-400"
              required
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Detailed statutory instruction and implementation guidance..."
              rows={2}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-hidden focus:border-slate-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={newDept}
              onChange={(e) => setNewDept(e.target.value as OrgDepartment)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden"
            >
              <option value="COMPLIANCE_LEGAL">Compliance & Legal</option>
              <option value="OPERATIONS">Operations</option>
              <option value="ENGINEERING_TECH">Engineering & Tech</option>
              <option value="TREASURY_FINANCE">Treasury & Finance</option>
            </select>
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 font-mono focus:outline-hidden"
            />
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden"
            >
              <option value="">Unassigned</option>
              {members.length > 0 && (
                <optgroup label="Team Members">
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName} ({m.initials})
                    </option>
                  ))}
                </optgroup>
              )}
              {functionalRoles.length > 0 && (
                <optgroup label="Functional Roles">
                  {functionalRoles.map((r) => (
                    <option key={r.roleId} value={r.roleTitle}>
                      {r.roleTitle}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800"
            >
              Save Delegated Duty
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No delegated statutory duties in this department.
          </div>
        ) : (
          filteredItems.map((item) => {
            // Match assignee details
            const assignedMember = members.find(
              (m) => m.userId === item.assignedTo || m.fullName === item.assignedTo
            );
            const initials = assignedMember
              ? assignedMember.initials
              : (item.assignedTo ? item.assignedTo.slice(0, 2).toUpperCase() : 'UN');

            return (
              <div
                key={item.id}
                onClick={() => onInspectItem?.(item)}
                className={`p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors cursor-pointer ${
                  item.isCompleted ? 'bg-slate-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => handleToggleCompleted(item.id, e)}
                    className="mt-0.5 text-slate-400 hover:text-slate-900 shrink-0"
                    aria-label={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {item.isCompleted ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <span
                      className={`text-xs font-semibold block truncate ${
                        item.isCompleted
                          ? 'line-through text-slate-400'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.actionTitle}
                    </span>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {item.actionDescription}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500">
                      <span className="font-mono text-slate-600 uppercase font-semibold">
                        {item.targetDepartment.replace(/_/g, ' ')}
                      </span>
                      {item.suggestedDeadline && (
                        <span className="font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>SLA: {item.suggestedDeadline}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Reassignment Selector */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <select
                      value={item.assignedTo || ''}
                      onChange={(e) => handleReassignItem(item.id, e.target.value, e)}
                      className="h-7 pl-6 pr-5 text-[11px] font-semibold text-slate-800 bg-white border border-slate-200 rounded hover:border-slate-300 focus:outline-hidden appearance-none cursor-pointer max-w-[150px] truncate"
                    >
                      <option value="">Unassigned</option>
                      {members.length > 0 && (
                        <optgroup label="Team Members">
                          {members.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.fullName}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {functionalRoles.length > 0 && (
                        <optgroup label="Roles">
                          {functionalRoles.map((r) => (
                            <option key={r.roleId} value={r.roleTitle}>
                              {r.roleTitle}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {/* Monochrome Initials Badge */}
                    <div className="w-4 h-4 rounded-full bg-slate-900 text-white font-mono text-[8px] font-bold flex items-center justify-center absolute left-1.5 top-1.5 pointer-events-none">
                      {initials}
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
                  </div>

                  {/* 6px Status Indicator */}
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 min-w-[75px]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-[11px] font-medium">
                      {item.isCompleted ? 'Fulfilled' : 'Pending'}
                    </span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ActionItemsSection;
