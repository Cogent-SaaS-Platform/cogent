'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  X,
  Sparkles,
  AlertTriangle,
  Clock,
  ExternalLink,
  CheckCircle2,
  Loader2,
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
  isRead?: boolean;
}

export function SmartInsightDrawer({ isOpen, onClose, onActionClick }: SmartInsightDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'smart'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [topInsight, setTopInsight] = useState<NotificationItem | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setTopInsight(data.topInsight || null);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const handleAction = async (item: NotificationItem) => {
    // Mark as read in DB
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }

    onClose();
    if (onActionClick) {
      onActionClick(item.actionUrl);
    } else {
      router.push(item.actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const displayedNotifications = notifications.filter((n) => {
    if (activeTab === 'smart') return n.isSmart;
    return true;
  });

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
          {/* Smart Insight Banner */}
          {topInsight && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#F5F6FA] border border-[#C7D2FE] space-y-3">
              <div className="flex items-center gap-2 text-[#2A4BFF]">
                <Sparkles className="w-4 h-4 text-[#2A4BFF]" />
                <span className="text-xs font-bold uppercase tracking-wider">Top Smart Insight</span>
              </div>
              <p className="text-xs text-[#0B0F1A] leading-relaxed">
                <span className="font-semibold text-[#2A4BFF]">{topInsight.target}: </span>
                {topInsight.title}
              </p>
              <button
                onClick={() => handleAction(topInsight)}
                className="btn-base btn-primary btn-sm btn-pill"
              >
                <span>Take Action</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          )}

          {/* Segmented Filter Control */}
          <div className="flex items-center justify-between">
            <div className="cogent-tab-group w-full max-w-[200px]">
              <button
                onClick={() => setActiveTab('all')}
                className={`cogent-tab-item flex-1 ${
                  activeTab === 'all' ? 'cogent-tab-item-active' : ''
                }`}
              >
                All {notifications.length}
              </button>
              <button
                onClick={() => setActiveTab('smart')}
                className={`cogent-tab-item flex-1 ${
                  activeTab === 'smart' ? 'cogent-tab-item-active' : ''
                }`}
              >
                Smart {notifications.filter((n) => n.isSmart).length}
              </button>
            </div>
          </div>

          {/* Notification Cards Feed */}
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-[#2A4BFF] animate-spin mx-auto" />
              <p className="text-xs text-[#4B5565]">Loading tenant notifications...</p>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-[#10B981] mx-auto" />
              <h4 className="text-sm font-semibold text-[#0B0F1A]">All caught up</h4>
              <p className="text-xs text-[#4B5565]">No pending compliance alerts for your institution.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedNotifications.map((notif) => {
                const isRead = notif.isRead;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleAction(notif)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isRead
                        ? 'bg-white border-[#DDE3EE] opacity-75'
                        : 'bg-white border-[#DDE3EE] shadow-sm hover:border-[#2A4BFF] hover:shadow-md'
                    }`}
                  >
                    {/* Card Title & Time */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-[#0B0F1A] font-medium leading-snug">
                        {notif.title}
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
                      {!isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2A4BFF]" />
                      )}
                    </div>

                    {/* AI Context Block */}
                    {notif.aiContext && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-[#F9FAFC] border border-[#E8EDF5] space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2A4BFF]">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Context</span>
                        </div>
                        <p className="text-[11px] text-[#4B5565] leading-relaxed">
                          {notif.aiContext}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer sticky bar */}
        <div className="p-4 border-t border-[#DDE3EE] bg-[#F9FAFC] flex items-center justify-between">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="text-xs font-medium text-[#4B5565] hover:text-[#0B0F1A] disabled:opacity-40 flex items-center gap-1.5 transition-colors"
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
