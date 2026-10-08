'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  X,
  Sparkles,
  AlertTriangle,
  Clock,
  ExternalLink,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';

export interface SmartInsightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onActionClick?: (href: string) => void;
}

interface NotificationItem {
  id: string;
  title: string;
  target: string;
  time: string;
  category: string;
  isHighPriority?: boolean;
  isSmart: boolean;
  aiContext: string;
  actionUrl: string;
}

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'New mandatory circular issued by',
    target: 'Central Bank of Nigeria (CBN)',
    time: '2h ago',
    category: 'Insight Hub',
    isHighPriority: true,
    isSmart: true,
    aiContext:
      'CBN/BSD/DIR/01/2026 introduces strict capital adequacy timelines for Tier-1 institutions. ₦25M fine exposure if attestations are not delivered by Day 30.',
    actionUrl: '/insight?circular=cbn-bsd-01-2026',
  },
  {
    id: 'n-2',
    title: 'Post-publish drift detected on',
    target: 'QuickKash SMS Flash Campaign',
    time: '4h ago',
    category: 'Marketing Shield',
    isHighPriority: true,
    isSmart: true,
    aiContext:
      'Active broadcast copy omitted the mandatory APR disclosure clause required under ARCON Act 2022 Section 5(2). Immediate copy revocation advised.',
    actionUrl: '/marketing',
  },
  {
    id: 'n-3',
    title: 'Policy clause divergence identified in',
    target: 'Apex AML/CFT Operational Manual',
    time: '6h ago',
    category: 'Gap Matrix',
    isHighPriority: false,
    isSmart: true,
    aiContext:
      'NDPA 2023 Section 24 compliance has dropped to 88% due to outdated data retention rules in Section 4.2 of the internal manual.',
    actionUrl: '/gap',
  },
  {
    id: 'n-4',
    title: 'Immutable CAMA 2020 SHA-256 seal verified for',
    target: 'Q3 Board Attestation Dossier',
    time: '1d ago',
    category: 'Audit Ledger',
    isHighPriority: false,
    isSmart: false,
    aiContext:
      'All 42 executive attestation signatures have been cryptographically verified against the audit ledger ledger state.',
    actionUrl: '/audit',
  },
];

export function SmartInsightDrawer({ isOpen, onClose, onActionClick }: SmartInsightDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'smart'>('all');
  const [readItems, setReadItems] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleAction = (url: string) => {
    onClose();
    if (onActionClick) {
      onActionClick(url);
    } else {
      router.push(url);
    }
  };

  const handleMarkAllRead = () => {
    setReadItems(new Set(NOTIFICATIONS.map((n) => n.id)));
  };

  const displayedNotifications = NOTIFICATIONS.filter((n) => {
    if (activeTab === 'smart') return n.isSmart;
    return true;
  });

  const unreadCount = NOTIFICATIONS.filter((n) => !readItems.has(n.id)).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Smart Insight & Notifications"
      className="fixed inset-0 z-50 flex justify-end cogent-dim-backdrop animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] h-full bg-white border-l border-[#DDE3EE] shadow-drawer flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#DDE3EE] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0B0F1A]">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-[#F5F6FA] rounded-lg transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Smart Insight Banner (matching notic.webp) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#F5F6FA] border border-[#C7D2FE] space-y-3">
            <div className="flex items-center gap-2 text-[#2A4BFF]">
              <Sparkles className="w-4 h-4 text-[#2A4BFF]" />
              <span className="text-xs font-bold uppercase tracking-wider">Smart Insight</span>
            </div>
            <p className="text-xs text-[#0B0F1A] leading-relaxed">
              CBN Circular <span className="font-semibold text-[#2A4BFF]">CBN/BSD/DIR/01/2026</span> requires mandatory capital adequacy disclosures within 14 days. 2 internal policies require concordance review to avert statutory fines.
            </p>
            <button
              onClick={() => handleAction('/insight?circular=cbn-bsd-01-2026')}
              className="btn-base btn-primary btn-sm btn-pill"
            >
              <span>Take Action</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center justify-between">
            <div className="cogent-tab-group w-full max-w-[200px]">
              <button
                onClick={() => setActiveTab('all')}
                className={`cogent-tab-item flex-1 ${
                  activeTab === 'all' ? 'cogent-tab-item-active' : ''
                }`}
              >
                All {NOTIFICATIONS.length}
              </button>
              <button
                onClick={() => setActiveTab('smart')}
                className={`cogent-tab-item flex-1 ${
                  activeTab === 'smart' ? 'cogent-tab-item-active' : ''
                }`}
              >
                Smart {NOTIFICATIONS.filter((n) => n.isSmart).length}
              </button>
            </div>
          </div>

          {/* Notification Cards Feed */}
          <div className="space-y-3">
            {displayedNotifications.map((notif) => {
              const isRead = readItems.has(notif.id);
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    setReadItems((prev) => new Set(prev).add(notif.id));
                    handleAction(notif.actionUrl);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isRead
                      ? 'bg-white border-[#DDE3EE] opacity-75'
                      : 'bg-white border-[#DDE3EE] shadow-sm hover:border-[#2A4BFF] hover:shadow-md'
                  }`}
                >
                  {/* Card Title & Time */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-[#0B0F1A] font-medium leading-snug">
                      {notif.title} <span className="font-semibold">{notif.target}</span>
                    </p>
                    <span className="text-[10px] text-[#8D99AE] shrink-0 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {notif.time}
                    </span>
                  </div>

                  {/* Pills */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE]">
                      {notif.category}
                    </span>
                    {notif.isHighPriority && (
                      <span className="pill-status pill-critical">
                        <span className="pill-dot pill-dot-critical" />
                        High Priority
                      </span>
                    )}
                  </div>

                  {/* AI Context Block */}
                  <div className="mt-2.5 p-2.5 rounded-lg bg-[#F9FAFC] border border-[#E8EDF5] space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2A4BFF]">
                      <Sparkles className="w-3 h-3" />
                      <span>AI Context</span>
                    </div>
                    <p className="text-[11px] text-[#4B5565] leading-relaxed">
                      {notif.aiContext}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer sticky bar */}
        <div className="p-4 border-t border-[#DDE3EE] bg-[#F9FAFC] flex items-center justify-between">
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-[#4B5565] hover:text-[#0B0F1A] flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>Mark all as read</span>
          </button>
          <span className="text-[10px] text-[#8D99AE]">Autonomous Monitoring Engine</span>
        </div>
      </div>
    </div>
  );
}
