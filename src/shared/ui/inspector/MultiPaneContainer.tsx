'use client';

import React, { useState, useEffect } from 'react';
import { DetailInspector } from './DetailInspector';
import { ReferencePane } from './ReferencePane';
import { InspectorItemData, StatutoryReferenceData } from './types';
import { UseInspectorReturn } from './inspectorStore';

export interface MultiPaneContainerProps {
  children: React.ReactNode;
  inspector: UseInspectorReturn;
  activeItem?: InspectorItemData | null;
  activeReference?: StatutoryReferenceData | null;
}

export function MultiPaneContainer({
  children,
  inspector,
  activeItem,
  activeReference,
}: MultiPaneContainerProps) {
  const {
    inspectId,
    refId,
    currentIndex,
    totalCount,
    isDualPane,
    closeInspector,
    closeReference,
    openReference,
    goToNext,
    goToPrevious,
  } = inspector;

  // On small viewports (< lg), allow toggling active view between inspector and reference pane
  const [mobileActivePane, setMobileActivePane] = useState<'inspector' | 'reference'>('inspector');

  useEffect(() => {
    if (refId) {
      setMobileActivePane('reference');
    } else {
      setMobileActivePane('inspector');
    }
  }, [refId]);

  const isInspectorOpen = Boolean(inspectId && activeItem);
  const isReferenceOpen = Boolean(refId && (activeReference || activeItem?.statutoryReference));

  // Resolved reference data
  const resolvedReference =
    activeReference || activeItem?.statutoryReference || null;

  return (
    <div className="relative min-h-full w-full">
      {/* 1. Underlying Base Table Workspace View */}
      <div
        className={`w-full transition-opacity duration-200 ${
          isInspectorOpen ? 'opacity-35 pointer-events-none select-none filter blur-[0.5px]' : 'opacity-100'
        }`}
      >
        {children}
      </div>

      {/* 2. Dim Backdrop when inspector is active (Zango / notic.webp / uio.mp4) */}
      {isInspectorOpen && (
        <div
          role="presentation"
          onClick={() => {
            if (isReferenceOpen) {
              closeReference();
            } else {
              closeInspector();
            }
          }}
          className="fixed inset-0 z-40 bg-[#0B0F1A]/25 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      {/* 3. Multi-Pane Drawer Stack (Layer 4 & Layer 5) */}
      {isInspectorOpen && activeItem && (
        <div className="fixed inset-y-0 right-0 z-50 flex max-w-full overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">
          {/* Mobile View Switcher Tab Strip if in Dual-Pane mode on small screens */}
          {isReferenceOpen && resolvedReference && (
            <div className="lg:hidden fixed top-3 left-3 z-50 flex items-center bg-white border border-[#DDE3EE] rounded-xl p-1 shadow-lg">
              <button
                onClick={() => setMobileActivePane('inspector')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  mobileActivePane === 'inspector'
                    ? 'bg-[#2A4BFF] text-white shadow-xs'
                    : 'text-[#4B5565] hover:text-[#0B0F1A]'
                }`}
              >
                Obligation
              </button>
              <button
                onClick={() => setMobileActivePane('reference')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  mobileActivePane === 'reference'
                    ? 'bg-[#2A4BFF] text-white shadow-xs'
                    : 'text-[#4B5565] hover:text-[#0B0F1A]'
                }`}
              >
                Gazette Evidence
              </button>
            </div>
          )}

          {/* Layer 5: Statutory Evidence Viewer (Left of DetailInspector on desktop lg+) */}
          {isReferenceOpen && resolvedReference && (
            <div
              className={`h-full animate-in slide-in-from-right-8 duration-200 ${
                mobileActivePane === 'reference' ? 'block' : 'hidden lg:block'
              }`}
            >
              <ReferencePane
                reference={resolvedReference}
                onClose={closeReference}
              />
            </div>
          )}

          {/* Layer 4: Contextual Detail Inspector */}
          <div
            className={`h-full ${
              isReferenceOpen && mobileActivePane === 'reference'
                ? 'hidden lg:block'
                : 'block'
            }`}
          >
            <DetailInspector
              item={activeItem}
              currentIndex={currentIndex}
              totalCount={totalCount}
              onNext={goToNext}
              onPrevious={goToPrevious}
              onClose={closeInspector}
              onOpenReference={openReference}
              isDualPaneOpen={isReferenceOpen}
            />
          </div>
        </div>
      )}
    </div>
  );
}
