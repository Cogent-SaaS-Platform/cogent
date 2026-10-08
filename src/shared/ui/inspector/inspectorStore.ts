'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface InspectorState {
  inspectId: string | null;
  refId: string | null;
  itemIds: string[];
  currentIndex: number;
  totalCount: number;
  isDualPane: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface InspectorActions {
  openInspector: (id: string, allIds?: string[]) => void;
  closeInspector: () => void;
  openReference: (refId: string) => void;
  closeReference: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  setNavigableIds: (ids: string[]) => void;
  isInspecting: (id: string) => boolean;
  isReferencing: (referenceId: string) => boolean;
  clearAll: () => void;
}

export type UseInspectorReturn = InspectorState & InspectorActions;

/**
 * Enterprise URL-Synchronized Multi-Pane Inspector Hook
 * Implements the 6-Level Interaction Contract in docs/FRONTEND_MASTER_SPECIFICATION.md
 * 
 * - Level 4: ?inspect=<id> (Contextual Inspector)
 * - Level 5: ?ref=<refId> (Dual-Pane Statutory Reference)
 * 
 * Manages browser history stack & keyboard mechanics:
 * Back #1: Closes Level 5 reference pane (restores single Level 4 inspector)
 * Back #2: Closes Level 4 inspector (restores table view)
 * Arrow Left / Right: Stepper pagination (< 1 / N >)
 * Escape: Progressive dismissal
 */
export function useInspectorStore(initialItemIds: string[] = []): UseInspectorReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [itemIds, setItemIds] = useState<string[]>(initialItemIds);

  // Read state directly from URL search params
  const inspectId = searchParams?.get('inspect') || null;
  const refId = searchParams?.get('ref') || null;

  // Sync initialItemIds if updated by caller
  useEffect(() => {
    if (initialItemIds.length > 0) {
      setItemIds(initialItemIds);
    }
  }, [initialItemIds]);

  const currentIndex = inspectId ? Math.max(0, itemIds.indexOf(inspectId)) : 0;
  const totalCount = itemIds.length;
  const isDualPane = Boolean(inspectId && refId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalCount - 1;

  // Helper to update search params without re-rendering outer layout
  const updateParams = useCallback(
    (newParams: { inspect?: string | null; ref?: string | null }, pushToHistory = true) => {
      const current = new URLSearchParams(Array.from(searchParams?.entries() || []));

      if (newParams.inspect !== undefined) {
        if (newParams.inspect === null) {
          current.delete('inspect');
        } else {
          current.set('inspect', newParams.inspect);
        }
      }

      if (newParams.ref !== undefined) {
        if (newParams.ref === null) {
          current.delete('ref');
        } else {
          current.set('ref', newParams.ref);
        }
      }

      const queryString = current.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        if (pushToHistory) {
          router.push(targetUrl, { scroll: false });
        } else {
          router.replace(targetUrl, { scroll: false });
        }
      });
    },
    [pathname, router, searchParams]
  );

  const openInspector = useCallback(
    (id: string, allIds?: string[]) => {
      if (allIds && allIds.length > 0) {
        setItemIds(allIds);
      }
      updateParams({ inspect: id }, true);
    },
    [updateParams]
  );

  const closeInspector = useCallback(() => {
    updateParams({ inspect: null, ref: null }, true);
  }, [updateParams]);

  const openReference = useCallback(
    (referenceId: string) => {
      updateParams({ ref: referenceId }, true);
    },
    [updateParams]
  );

  const closeReference = useCallback(() => {
    updateParams({ ref: null }, true);
  }, [updateParams]);

  const goToIndex = useCallback(
    (idx: number) => {
      if (itemIds.length === 0) return;
      const safeIdx = Math.max(0, Math.min(idx, itemIds.length - 1));
      const nextId = itemIds[safeIdx];
      if (nextId) {
        updateParams({ inspect: nextId }, false);
      }
    },
    [itemIds, updateParams]
  );

  const goToNext = useCallback(() => {
    if (itemIds.length === 0) return;
    const nextIdx = (currentIndex + 1) % itemIds.length;
    goToIndex(nextIdx);
  }, [currentIndex, itemIds.length, goToIndex]);

  const goToPrevious = useCallback(() => {
    if (itemIds.length === 0) return;
    const prevIdx = (currentIndex - 1 + itemIds.length) % itemIds.length;
    goToIndex(prevIdx);
  }, [currentIndex, itemIds.length, goToIndex]);

  const setNavigableIds = useCallback((ids: string[]) => {
    setItemIds(ids);
  }, []);

  const isInspecting = useCallback(
    (id: string) => inspectId === id,
    [inspectId]
  );

  const isReferencing = useCallback(
    (referenceId: string) => refId === referenceId,
    [refId]
  );

  const clearAll = useCallback(() => {
    updateParams({ inspect: null, ref: null }, true);
  }, [updateParams]);

  // Keyboard navigation: Left/Right arrows for stepper, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (inspectId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (refId) {
            closeReference();
          } else {
            closeInspector();
          }
        } else if (e.key === 'ArrowRight' && !refId) {
          e.preventDefault();
          goToNext();
        } else if (e.key === 'ArrowLeft' && !refId) {
          e.preventDefault();
          goToPrevious();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectId, refId, closeReference, closeInspector, goToNext, goToPrevious]);

  return {
    inspectId,
    refId,
    itemIds,
    currentIndex,
    totalCount,
    isDualPane,
    hasPrevious,
    hasNext,
    openInspector,
    closeInspector,
    openReference,
    closeReference,
    goToNext,
    goToPrevious,
    goToIndex,
    setNavigableIds,
    isInspecting,
    isReferencing,
    clearAll,
  };
}
