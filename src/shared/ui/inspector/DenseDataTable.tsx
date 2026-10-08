'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  X,
  FileSpreadsheet,
  Download,
  CheckCircle,
} from 'lucide-react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

export interface BatchAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRows: T[]) => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface DenseDataTableProps<T extends { id: string }> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  selectedId?: string | null;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  showRelevantOnlyToggle?: boolean;
  onRelevantOnlyToggle?: (enabled: boolean) => void;
  filterOptions?: { label: string; key: string; options: string[] }[];
  onFilterChange?: (filterKey: string, value: string) => void;
  topAction?: React.ReactNode;
  batchActions?: BatchAction<T>[];
  totalRecordsCount?: number;
  emptyMessage?: string;
}

export function DenseDataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  selectedId,
  searchPlaceholder = 'Search records...',
  onSearchChange,
  showRelevantOnlyToggle = true,
  onRelevantOnlyToggle,
  filterOptions,
  onFilterChange,
  topAction,
  batchActions,
  totalRecordsCount,
  emptyMessage = 'No regulatory records found in active enclave.',
}: DenseDataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [relevantOnly, setRelevantOnly] = useState(true);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearchChange?.(val);
  };

  const handleToggleRelevant = () => {
    const nextVal = !relevantOnly;
    setRelevantOnly(nextVal);
    onRelevantOnlyToggle?.(nextVal);
  };

  const handleSelectAll = () => {
    if (selectedRowIds.size === data.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(data.map((d) => d.id)));
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(columnKey);
      setSortOrder('asc');
    }
  };

  // Sort data if sortKey is set
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey];
      const valB = (b as Record<string, unknown>)[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const comp = valA < valB ? -1 : 1;
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [data, sortKey, sortOrder]);

  const total = totalRecordsCount ?? sortedData.length;
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const selectedRows = useMemo(
    () => data.filter((d) => selectedRowIds.has(d.id)),
    [data, selectedRowIds]
  );

  return (
    <div className="space-y-3">
      {/* 1. Header Filter & Search Strip (per Zango 0:33 & uio.mp4) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#DDE3EE] shadow-xs">
        {/* Left Search & Toggle */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8D99AE] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="cogent-input pl-9 pr-8 text-xs w-full"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  onSearchChange?.('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8D99AE] hover:text-[#0B0F1A]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showRelevantOnlyToggle && (
            <div className="flex items-center gap-2 border-l border-[#DDE3EE] pl-3 shrink-0">
              <label className="text-xs font-semibold text-[#0B0F1A] cursor-pointer select-none">
                Relevant Only
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={relevantOnly}
                onClick={handleToggleRelevant}
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                  relevantOnly ? 'bg-[#2A4BFF]' : 'bg-[#DDE3EE]'
                }`}
                aria-label="Toggle relevant only filter"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                    relevantOnly ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Right Actions & Pagination */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-between lg:justify-end">
          {filterOptions && filterOptions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterOptions.map((f) => (
                <select
                  key={f.key}
                  onChange={(e) => onFilterChange?.(f.key, e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-[#F5F6FA] border border-[#DDE3EE] rounded-lg text-[#4B5565] focus:outline-none focus:border-[#2A4BFF]"
                  aria-label={f.label}
                >
                  <option value="">{f.label}</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}

          {topAction}

          {/* Pagination Counter */}
          <div className="flex items-center gap-1.5 border-l border-[#DDE3EE] pl-3">
            <span className="text-xs font-mono text-[#8D99AE]">
              {total > 0 ? `${startIdx}-${endIdx} of ${total}` : '0 of 0'}
            </span>
            <div className="flex items-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded text-[#4B5565] hover:bg-[#F5F6FA] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={endIdx >= total}
                className="p-1 rounded text-[#4B5565] hover:bg-[#F5F6FA] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Action Bar if items are checked */}
      {selectedRowIds.size > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-[#2A4BFF] font-semibold">
            <CheckSquare className="w-4 h-4" />
            <span>
              {selectedRowIds.size} record{selectedRowIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {batchActions?.map((b) => (
              <button
                key={b.id}
                onClick={() => b.onClick(selectedRows)}
                className={`btn-base btn-xs gap-1.5 ${
                  b.variant === 'primary'
                    ? 'btn-primary'
                    : b.variant === 'danger'
                    ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                    : 'btn-secondary bg-white'
                }`}
              >
                {b.icon}
                <span>{b.label}</span>
              </button>
            ))}
            <button
              onClick={() => setSelectedRowIds(new Set())}
              className="text-[#4B5565] hover:text-[#0B0F1A] text-xs font-semibold px-2 py-1"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* 2. Dense Tabular Records (per uio.mp4 & Zango 0:33) */}
      <div className="cogent-table-container overflow-x-auto">
        <table className="cogent-table">
          <thead>
            <tr>
              <th className="w-10 text-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="p-1 text-[#8D99AE] hover:text-[#0B0F1A]"
                  aria-label="Select all rows"
                >
                  {selectedRowIds.size === data.length && data.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[#2A4BFF]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={col.sortable ? 'cursor-pointer hover:bg-[#EEF2FF] transition-colors select-none' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-[#8D99AE]">
                        {sortKey === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#2A4BFF]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#2A4BFF]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-16 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="text-center py-12 text-[#8D99AE]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const isSelected = selectedId === row.id;
                const isChecked = selectedRowIds.has(row.id);

                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'row-selected bg-[#EEF2FF]'
                        : isChecked
                        ? 'bg-[#F0F4FF]'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <td className="text-center" onClick={(e) => handleSelectRow(row.id, e)}>
                      <button
                        type="button"
                        className="p-1 text-[#8D99AE] hover:text-[#0B0F1A]"
                        aria-label="Select row"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#2A4BFF]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}

                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onRowClick?.(row)}
                        className="p-1.5 text-[#8D99AE] hover:text-[#2A4BFF] hover:bg-[#EEF2FF] rounded-lg transition-colors"
                        title="Inspect Record (Level 4)"
                        aria-label="Inspect record"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
