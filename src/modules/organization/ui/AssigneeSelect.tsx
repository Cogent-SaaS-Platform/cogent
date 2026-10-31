'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, User, Shield, Check } from 'lucide-react';
import { TeamMember, FunctionalRole } from '../types';

export interface AssigneeSelection {
  type: 'USER' | 'ROLE' | 'UNASSIGNED';
  id?: string;
  name: string;
  department?: string;
  initials?: string;
}

export interface AssigneeSelectProps {
  value?: string | null; // e.g. "user:uuid" or "role:Chief Compliance Officer" or "CCO" or name
  onChange: (selection: AssigneeSelection) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function AssigneeSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select Assignee...',
}: AssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [functionalRoles, setFunctionalRoles] = useState<FunctionalRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchMembers() {
      setIsLoading(true);
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
        console.error('Failed to load organization members', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Determine current display label and initials from value
  const resolvedSelection = React.useMemo<AssigneeSelection>(() => {
    if (!value || value === 'UN' || value === 'UNASSIGNED') {
      return { type: 'UNASSIGNED', name: 'Unassigned', initials: 'UN' };
    }

    // Check if matching a member
    const cleanVal = value.startsWith('user:') ? value.slice(5) : value;
    const memberMatch = members.find(
      (m) => m.userId === cleanVal || m.id === cleanVal || m.fullName.toLowerCase() === value.toLowerCase()
    );
    if (memberMatch) {
      return {
        type: 'USER',
        id: memberMatch.userId,
        name: memberMatch.fullName,
        department: memberMatch.department,
        initials: memberMatch.initials,
      };
    }

    // Check if matching a functional role
    const cleanRole = value.startsWith('role:') ? value.slice(5) : value;
    const roleMatch = functionalRoles.find(
      (r) => r.roleId === cleanRole || r.roleTitle.toLowerCase() === cleanRole.toLowerCase()
    );
    if (roleMatch) {
      return {
        type: 'ROLE',
        id: roleMatch.roleId,
        name: roleMatch.roleTitle,
        department: roleMatch.department,
        initials: roleMatch.roleId.slice(0, 2).toUpperCase(),
      };
    }

    // Fallback display
    return {
      type: 'ROLE',
      id: value,
      name: cleanRole,
      initials: cleanRole.slice(0, 2).toUpperCase(),
    };
  }, [value, members, functionalRoles]);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md hover:border-slate-300 focus:outline-hidden flex items-center justify-between gap-2 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          {resolvedSelection.type === 'UNASSIGNED' ? (
            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
              UN
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
              {resolvedSelection.initials}
            </div>
          )}
          <span className="truncate text-slate-900">
            {resolvedSelection.name || placeholder}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-9 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-1.5 space-y-2 text-xs">
            {/* Unassign option */}
            <button
              type="button"
              onClick={() => {
                onChange({ type: 'UNASSIGNED', name: 'Unassigned', initials: 'UN' });
                setIsOpen(false);
              }}
              className="w-full px-2.5 py-1.5 text-left rounded hover:bg-slate-50 flex items-center justify-between text-slate-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Unassigned</span>
              </div>
              {resolvedSelection.type === 'UNASSIGNED' && (
                <Check className="w-3.5 h-3.5 text-slate-900" />
              )}
            </button>

            {/* Group 1: Organization Team Members */}
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Organization Team Members
              </div>
              <div className="space-y-0.5 pt-1">
                {members.length === 0 ? (
                  <div className="px-2.5 py-1 text-slate-400 italic text-[11px]">
                    No other organization members found.
                  </div>
                ) : (
                  members.map((member) => {
                    const isSelected =
                      resolvedSelection.type === 'USER' && resolvedSelection.id === member.userId;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          onChange({
                            type: 'USER',
                            id: member.userId,
                            name: member.fullName,
                            department: member.department,
                            initials: member.initials,
                          });
                          setIsOpen(false);
                        }}
                        className={`w-full px-2 py-1.5 text-left rounded flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                            {member.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-slate-900 font-medium leading-tight">
                              {member.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {member.jobTitle || member.department.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Group 2: Canonical Functional Roles */}
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Statutory Functional Roles
              </div>
              <div className="space-y-0.5 pt-1">
                {functionalRoles.map((role) => {
                  const isSelected =
                    resolvedSelection.type === 'ROLE' &&
                    (resolvedSelection.name === role.roleTitle || resolvedSelection.id === role.roleId);
                  return (
                    <button
                      key={role.roleId}
                      type="button"
                      onClick={() => {
                        onChange({
                          type: 'ROLE',
                          id: role.roleId,
                          name: role.roleTitle,
                          department: role.department,
                          initials: role.roleId.slice(0, 2).toUpperCase(),
                        });
                        setIsOpen(false);
                      }}
                      className={`w-full px-2 py-1.5 text-left rounded flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-mono text-[8px] font-bold flex items-center justify-center shrink-0">
                          {role.roleId.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-slate-800 font-medium leading-tight">
                            {role.roleTitle}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {role.department.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
