'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  FileText,
  ShieldCheck,
  Compass,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (url: string) => void;
}

interface CommandItem {
  id: string;
  category: 'Insight Circulars' | 'Marketing Shield' | 'Gap Matrix' | 'Regulatory Corpus';
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFAULT_COMMAND_ITEMS: CommandItem[] = [
  {
    id: 'cbn-bsd-01-2026',
    category: 'Insight Circulars',
    title: 'CBN/BSD/DIR/01/2026',
    subtitle: 'Prudential Guidelines for Tier-1 Banks & Super Agents',
    badge: 'CBN',
    href: '/insight?circular=cbn-bsd-01-2026',
    icon: Compass,
  },
  {
    id: 'sec-vasp-2026',
    category: 'Insight Circulars',
    title: 'SEC Digital Assets & VASP Directive 2026',
    subtitle: 'Custody, Capital Adequacy, & AML/CFT Oversight',
    badge: 'SEC',
    href: '/insight?circular=sec-vasp-2026',
    icon: Compass,
  },
  {
    id: 'mkt-quickkash',
    category: 'Marketing Shield',
    title: 'QuickKash Flash SMS Campaign',
    subtitle: 'Pre-Vetting finding: APR disclosure & ARCON preclearance',
    badge: 'ARCON',
    href: '/marketing',
    icon: ShieldCheck,
  },
  {
    id: 'mkt-primeyield',
    category: 'Marketing Shield',
    title: 'PrimeYield Wealth Social Post',
    subtitle: 'Claims Ledger match: Guaranteed return representation',
    badge: 'SEC',
    href: '/marketing',
    icon: ShieldCheck,
  },
  {
    id: 'gap-aml-manual',
    category: 'Gap Matrix',
    title: 'AML/CFT Operational Compliance Manual',
    subtitle: 'Concordance audit: 88% compliant with BOFIA 2020 Sec 57',
    badge: 'NFIU',
    href: '/gap',
    icon: Layers,
  },
  {
    id: 'lib-bofia',
    category: 'Regulatory Corpus',
    title: 'Banks and Other Financial Institutions Act (BOFIA) 2020',
    subtitle: 'Master statutory text, Sections 1 - 134',
    badge: 'LAW',
    href: '/library',
    icon: BookOpen,
  },
  {
    id: 'lib-arcon',
    category: 'Regulatory Corpus',
    title: 'ARCON Advertising Standards Code 2022',
    subtitle: 'Mandatory disclosures, vetting fees, and vetting exemptions',
    badge: 'LAW',
    href: '/library',
    icon: BookOpen,
  },
];

export function CommandPalette({ isOpen, onClose, onSelectAction }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via custom event or parent
        }
      }
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredItems = query.trim()
    ? DEFAULT_COMMAND_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          item.badge.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : DEFAULT_COMMAND_ITEMS;

  const handleSelect = (item: CommandItem) => {
    onClose();
    if (onSelectAction) {
      onSelectAction(item.href);
    } else {
      router.push(item.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 cogent-dim-backdrop animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-[#DDE3EE] rounded-2xl shadow-modal overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#DDE3EE] gap-3">
          <Search className="w-5 h-5 text-[#8D99AE] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search circulars, ads, policies, statutory clauses... (Press Esc to close)"
            className="w-full bg-transparent text-sm text-[#0B0F1A] placeholder:text-[#8D99AE] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#8D99AE] hover:text-[#0B0F1A] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F5F6FA] text-[#8D99AE] border border-[#DDE3EE] rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-[#F5F6FA]">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#4B5565] font-medium">No regulatory records found</p>
              <p className="text-xs text-[#8D99AE] mt-1">Try searching by circular number, regulator, or law.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#F9FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#2A4BFF] text-white shadow-xs'
                          : 'bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0B0F1A] truncate">
                          {item.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE]">
                          {item.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#4B5565] truncate">{item.subtitle}</span>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-[#2A4BFF] translate-x-1' : 'text-[#DDE3EE]'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#F9FAFC] border-t border-[#DDE3EE] flex items-center justify-between text-[11px] text-[#8D99AE]">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="px-1 py-0.5 bg-white border border-[#DDE3EE] rounded font-mono">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-white border border-[#DDE3EE] rounded font-mono">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-white border border-[#DDE3EE] rounded font-mono">↵</kbd> to select
            </span>
          </div>
          <span className="text-[10px] font-medium text-[#4B5565]">Cogent Instant Indexer</span>
        </div>
      </div>
    </div>
  );
}
