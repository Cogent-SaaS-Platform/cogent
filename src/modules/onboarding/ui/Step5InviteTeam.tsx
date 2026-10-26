'use client';

import React, { useState } from 'react';
import { OnboardingState, InvitedTeamMember } from '../types';
import { ChevronRight, ChevronLeft, UserPlus, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Step5Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
  onFinish: () => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export function Step5InviteTeam({
  state,
  onChange,
  onFinish,
  onBack,
  isSubmitting,
}: Step5Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addMember = () => {
    const newMember: InvitedTeamMember = {
      id: 'invite_' + Date.now(),
      email: '',
      role: 'MEMBER',
      department: 'COMPLIANCE_LEGAL',
    };
    onChange({ invitedMembers: [...state.invitedMembers, newMember] });
  };

  const removeMember = (id: string) => {
    if (state.invitedMembers.length <= 1) return;
    onChange({ invitedMembers: state.invitedMembers.filter((m) => m.id !== id) });
  };

  const updateMember = (id: string, updates: Partial<InvitedTeamMember>) => {
    onChange({
      invitedMembers: state.invitedMembers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await onFinish();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete workspace onboarding.';
      setErrorMessage(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
      {/* Brand Monogram Icon matching onb.webp */}
      <div className="w-12 h-12 rounded-xl bg-[#0B0F1A] text-white flex items-center justify-center shadow-sm">
        <UserPlus className="w-6 h-6 text-white" />
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B0F1A] tracking-tight">
          Invite team members
        </h2>
        <p className="text-sm text-[#4B5565] mt-1.5 leading-relaxed">
          Bring compliance officers, legal counsel, and risk managers into your workspace.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs">
          {errorMessage}
        </div>
      )}

      {/* Team Members List */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[#0B0F1A]">
          Team Seats &amp; Role Assignments
        </label>

        {state.invitedMembers.map((member, index) => (
          <div
            key={member.id || index}
            className="p-4 rounded-xl bg-white border border-[#DDE3EE] shadow-2xs flex flex-col sm:flex-row sm:items-center gap-3"
          >
            {/* Email Input */}
            <div className="flex-1">
              <input
                type="email"
                value={member.email}
                onChange={(e) => updateMember(member.id, { email: e.target.value })}
                placeholder="colleague@company.com"
                className="w-full px-3.5 py-2 bg-white border border-[#DDE3EE] rounded-lg text-xs text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF]"
              />
            </div>

            {/* Role Select */}
            <div className="w-full sm:w-36">
              <select
                value={member.role}
                onChange={(e) => updateMember(member.id, { role: e.target.value as InvitedTeamMember['role'] })}
                className="w-full px-3 py-2 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="OWNER">Owner</option>
                <option value="OTHER">Other Role</option>
              </select>
            </div>

            {/* Department Select */}
            <div className="w-full sm:w-44">
              <select
                value={member.department}
                onChange={(e) => updateMember(member.id, { department: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
              >
                <option value="COMPLIANCE_LEGAL">Compliance &amp; Legal</option>
                <option value="EXECUTIVE_LEADERSHIP">Executive Leadership</option>
                <option value="OPERATIONS">Operations &amp; Risk</option>
                <option value="GROWTH_MARKETING">Growth &amp; Marketing</option>
                <option value="ENGINEERING_TECH">Engineering &amp; Tech</option>
              </select>
            </div>

            {/* Remove Action */}
            {state.invitedMembers.length > 1 && (
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                className="p-2 text-[#4B5565] hover:text-[#DC2626] rounded-lg hover:bg-[#FEF2F2] transition-colors self-end sm:self-center"
                title="Remove invite"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addMember}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[#2A4BFF] hover:text-[#1E3BD9] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] rounded-xl transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add another seat</span>
        </button>
      </div>

      {/* Sovereign Regulatory Security Seal */}
      <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
        <div className="text-xs text-[#065F46] leading-relaxed">
          <strong className="block font-bold mb-0.5">Sovereign Cloud Data Residency Guarantee</strong>
          All tenant compliance evaluations, policy vector embeddings, and official bank defense dossiers are partitioned with cryptographic tenant isolation in strict compliance with the Nigeria Data Protection Act (NDPA) 2023.
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-6 border-t border-[#DDE3EE] flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-[#4B5565] hover:text-[#0B0F1A] bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] rounded-xl transition-all disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] disabled:opacity-50 rounded-xl shadow-sm transition-all"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Initializing Workspace...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Launch Workspace</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
