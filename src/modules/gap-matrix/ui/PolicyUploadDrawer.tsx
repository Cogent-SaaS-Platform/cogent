'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  FileCheck2,
  FolderOpen,
} from 'lucide-react';
import { OrgDepartment } from '@/shared/types';
import { PolicyIngestResult } from '../types';
import { UpgradePlanModal } from '@/shared/ui/UpgradePlanModal';
import { PlanTier } from '@/lib/plans';

interface PolicyUploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onUploadSuccess: (result: PolicyIngestResult) => void;
}

export function PolicyUploadDrawer({
  isOpen,
  onClose,
  organizationId,
  onUploadSuccess,
}: PolicyUploadDrawerProps) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<OrgDepartment>('COMPLIANCE_LEGAL');
  const [versionTag, setVersionTag] = useState('1.0');
  const [mode, setMode] = useState<'FILE' | 'TEXT'>('FILE');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    featureName?: string;
    requiredPlan?: PlanTier;
    reason?: string;
    isReadOnly?: boolean;
    currentUsage?: number;
    maxAllowed?: number;
  }>({ isOpen: false });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleIngest = async () => {
    if (!title.trim()) {
      setErrorMessage('Please enter an internal policy title');
      return;
    }

    if (mode === 'TEXT' && !rawText.trim()) {
      setErrorMessage('Please paste or write the policy manual content');
      return;
    }

    if (mode === 'FILE' && !selectedFile) {
      setErrorMessage('Please select a PDF or DOCX file to upload');
      return;
    }

    setIsIngesting(true);
    setErrorMessage(null);

    try {
      let response: Response;

      if (mode === 'FILE' && selectedFile) {
        const formData = new FormData();
        formData.append('organizationId', organizationId);
        formData.append('title', title.trim());
        formData.append('department', department);
        formData.append('versionTag', versionTag.trim() || '1.0');
        formData.append('file', selectedFile);

        response = await fetch('/api/gap-matrix/policies/ingest', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/gap-matrix/policies/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            title: title.trim(),
            department,
            versionTag: versionTag.trim() || '1.0',
            fileName: `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${versionTag}.txt`,
            mimeType: 'text/plain',
            rawText,
          }),
        });
      }

      const json = await response.json().catch(() => ({}));
      if (
        response.status === 402 ||
        response.status === 403 ||
        json.code === 'PLAN_LIMIT_REACHED' ||
        json.code === 'TRIAL_EXPIRED'
      ) {
        setUpgradeModalState({
          isOpen: true,
          featureName: json.featureName || 'Internal Policy Document Vault Quota',
          requiredPlan: (json.requiredPlan as PlanTier) || 'PRO',
          reason:
            json.error ||
            'You have reached the maximum internal policy documents permitted on your current plan.',
          isReadOnly: json.code === 'TRIAL_EXPIRED',
          currentUsage: json.currentUsage,
          maxAllowed: json.maxAllowed,
        });
        return;
      }

      let result: PolicyIngestResult;
      if (response.status === 409 && json.data) {
        result = json.data;
      } else if (!response.ok) {
        throw new Error(json.error || 'Policy upload failed');
      } else {
        result = json.data;
      }

      onUploadSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Policy document ingestion failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Upload Internal Policy Document
              </h2>
              <p className="text-xs text-slate-500">
                Structural section decomposition and tenant-isolated indexing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleIngest}
                className="px-2.5 py-1 bg-white border border-rose-300 rounded text-rose-700 font-medium hover:bg-rose-100 shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Policy Manual Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Information Security Policy, Customer Credit Policy, AML/CFT Manual"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Responsible Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as OrgDepartment)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                <option value="COMPLIANCE_LEGAL">Compliance &amp; Legal</option>
                <option value="OPERATIONS">Operations</option>
                <option value="TREASURY_FINANCE">Treasury &amp; Finance</option>
                <option value="GROWTH_MARKETING">Growth &amp; Marketing</option>
                <option value="PRODUCT_MANAGEMENT">Product Management</option>
                <option value="ENGINEERING_TECH">Engineering &amp; Tech</option>
                <option value="EXECUTIVE_LEADERSHIP">Executive Leadership</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Version Tag
              </label>
              <input
                type="text"
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                placeholder="1.0"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Ingestion Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('FILE')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  mode === 'FILE'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Upload PDF / DOCX
              </button>
              <button
                type="button"
                onClick={() => setMode('TEXT')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  mode === 'TEXT'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Paste Policy Clauses
              </button>
            </div>
          </div>

          {mode === 'TEXT' ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Policy Document Text (Preserves Sections &amp; Headings)
              </label>
              <textarea
                rows={12}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste internal policy manual text here. Include section numbers (e.g. 'Section 3.1') for structural clause extraction..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 leading-relaxed"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Select PDF or DOCX File
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-xl p-8 text-center bg-slate-50 cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-7 h-7 text-slate-600 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-900 mb-1">
                  {selectedFile ? selectedFile.name : 'Click or drag policy file to upload'}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : 'PDF, DOCX, TXT up to 25MB'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Vault path: <code className="text-slate-700 font-mono">policies/{organizationId.slice(0, 8)}/...</code>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleIngest}
              disabled={isIngesting}
              className="px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              {isIngesting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Chunking &amp; Indexing...
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  Ingest &amp; Extract Sections
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <UpgradePlanModal
        isOpen={upgradeModalState.isOpen}
        onClose={() => setUpgradeModalState({ isOpen: false })}
        featureName={upgradeModalState.featureName}
        requiredPlan={upgradeModalState.requiredPlan}
        reason={upgradeModalState.reason}
        isReadOnly={upgradeModalState.isReadOnly}
        currentUsage={upgradeModalState.currentUsage}
        maxAllowed={upgradeModalState.maxAllowed}
      />
    </div>
  );
}
