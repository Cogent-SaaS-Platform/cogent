'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  FileCheck2,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { OrgDepartment } from '@/shared/types';
import { PolicyIngestResult } from '../types';

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
  const [mode, setMode] = useState<'FILE' | 'TEXT'>('TEXT');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      let result: PolicyIngestResult;

      if (mode === 'FILE' && selectedFile) {
        const formData = new FormData();
        formData.append('organizationId', organizationId);
        formData.append('title', title.trim());
        formData.append('department', department);
        formData.append('versionTag', versionTag.trim() || '1.0');
        formData.append('file', selectedFile);

        const response = await fetch('/api/gap-matrix/policies/ingest', {
          method: 'POST',
          body: formData,
        });

        const json = await response.json();
        if (response.status === 409 && json.data) {
          result = json.data;
        } else if (!response.ok) {
          throw new Error(json.error || 'Upload failed');
        } else {
          result = json.data;
        }
      } else {
        const response = await fetch('/api/gap-matrix/policies/ingest', {
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

        const json = await response.json();
        if (response.status === 409 && json.data) {
          result = json.data;
        } else if (!response.ok) {
          throw new Error(json.error || 'Ingestion failed');
        } else {
          result = json.data;
        }
      }

      onUploadSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Policy document ingestion failed. Please try again.');
    } finally {
      setIsIngesting(false);
    }
  };

  const loadSampleAmlPolicy = () => {
    setTitle('Standard Bank & FinTech Anti-Money Laundering (AML/CFT) Compliance Manual');
    setDepartment('COMPLIANCE_LEGAL');
    setVersionTag('2.4');
    setMode('TEXT');
    setRawText(`### Section 1.0: Purpose and Statutory Scope
This Operational Manual sets forth the binding procedures for Anti-Money Laundering, Combating Financing of Terrorism, and Countering Proliferation Financing across all institutional business units.

### Section 2.1: Customer Due Diligence (CDD) and Identification
The institution shall verify the identity of every customer before account creation using Bank Verification Number (BVN) or National Identity Number (NIN). Simplified due diligence is permitted for Tier-1 low-value digital accounts.

### Section 3.2: Enhanced Due Diligence (EDD) for Politically Exposed Persons (PEPs)
All prospective customers identified as domestic or foreign Politically Exposed Persons (PEPs), their family members, or known close associates must undergo Enhanced Due Diligence. The Chief Compliance Officer must review all PEP files annually.

### Section 4.1: Suspicious Transaction Reporting (STR) Window
Where any employee detects a suspicious transaction or pattern of unusual customer activity, the internal suspicious activity notification must be escalated to the AML Compliance Unit. All formal Suspicious Transaction Reports (STRs) shall be filed with the Nigerian Financial Intelligence Unit (NFIU) within seven (7) business days of detection.

### Section 5.1: Record Retention Standards
All customer identification files, account ledgers, and transaction records shall be maintained securely in electronic archives for a minimum period of five (5) years following the termination of the business relationship or completion of the transaction.`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0B0F1A]/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-white border-l border-[#DDE3EE] h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE3EE] bg-[#F9FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#2A4BFF]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B0F1A] tracking-tight">
                Upload Internal Policy Document
              </h2>
              <p className="text-xs text-[#4B5565]">
                Automated structural chunking and tenant-private vector indexing (Epic 14 & 15)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#4B5565] hover:text-[#0B0F1A] rounded-lg hover:bg-[#F5F6FA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Sample Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={loadSampleAmlPolicy}
              className="text-xs font-semibold text-[#2A4BFF] hover:text-[#1E3BD9] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Canonical AML Policy Sample
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B5565] uppercase tracking-wider mb-2">
              Policy Manual Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Information Security Policy, Customer Credit Policy, AML/CFT Manual"
              className="w-full px-3.5 py-2.5 bg-white border border-[#DDE3EE] rounded-lg text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-1 focus:ring-[#2A4BFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4B5565] uppercase tracking-wider mb-2">
                Responsible Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as OrgDepartment)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#DDE3EE] rounded-lg text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-1 focus:ring-[#2A4BFF]"
              >
                <option value="COMPLIANCE_LEGAL">Compliance & Legal</option>
                <option value="OPERATIONS">Operations</option>
                <option value="TREASURY_FINANCE">Treasury & Finance</option>
                <option value="GROWTH_MARKETING">Growth & Marketing</option>
                <option value="PRODUCT_MANAGEMENT">Product Management</option>
                <option value="ENGINEERING_TECH">Engineering & Tech</option>
                <option value="EXECUTIVE_LEADERSHIP">Executive Leadership</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B5565] uppercase tracking-wider mb-2">
                Version Tag
              </label>
              <input
                type="text"
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                placeholder="1.0"
                className="w-full px-3.5 py-2.5 bg-white border border-[#DDE3EE] rounded-lg text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-1 focus:ring-[#2A4BFF]"
              />
            </div>
          </div>

          {/* Input Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#4B5565] uppercase tracking-wider mb-2">
              Ingestion Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('TEXT')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  mode === 'TEXT'
                    ? 'bg-[#EEF2FF] text-[#2A4BFF] border-[#2A4BFF]'
                    : 'bg-white text-[#4B5565] border-[#DDE3EE] hover:text-[#0B0F1A] hover:bg-[#F9FAFC]'
                }`}
              >
                <FileText className="w-4 h-4" />
                Raw Text / Markdown Clauses
              </button>
              <button
                type="button"
                onClick={() => setMode('FILE')}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  mode === 'FILE'
                    ? 'bg-[#EEF2FF] text-[#2A4BFF] border-[#2A4BFF]'
                    : 'bg-white text-[#4B5565] border-[#DDE3EE] hover:text-[#0B0F1A] hover:bg-[#F9FAFC]'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Upload PDF / DOCX
              </button>
            </div>
          </div>

          {/* Mode Specific Input */}
          {mode === 'TEXT' ? (
            <div>
              <label className="block text-xs font-semibold text-[#4B5565] uppercase tracking-wider mb-2">
                Policy Document Text (Preserves Sections & Headings)
              </label>
              <textarea
                rows={12}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste internal policy manual text here. Include section numbers (e.g. 'Section 3.1') for structural clause extraction..."
                className="w-full px-3.5 py-2.5 bg-[#F9FAFC] border border-[#DDE3EE] rounded-lg text-xs font-mono text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-1 focus:ring-[#2A4BFF] leading-relaxed"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#4B5565] uppercase tracking-wider mb-2">
                Select PDF or DOCX File
              </label>
              <div className="border-2 border-dashed border-[#DDE3EE] hover:border-[#2A4BFF]/60 rounded-xl p-8 text-center bg-[#F9FAFC] cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-[#2A4BFF] mx-auto mb-3" />
                <p className="text-sm font-medium text-[#0B0F1A] mb-1">
                  {selectedFile ? selectedFile.name : 'Click or drag policy file to upload'}
                </p>
                <p className="text-xs text-[#4B5565]">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : 'PDF, DOCX, TXT up to 25MB'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#DDE3EE] bg-[#F9FAFC] flex items-center justify-between">
          <span className="text-xs text-[#4B5565]">
            Storage: <code className="text-[#2A4BFF] font-mono font-medium">policies/{organizationId.slice(0, 8)}/...</code>
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#4B5565] hover:text-[#0B0F1A] bg-white border border-[#DDE3EE] hover:bg-[#F5F6FA] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleIngest}
              disabled={isIngesting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {isIngesting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Chunking & Indexing...
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  Ingest & Extract Clauses
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
