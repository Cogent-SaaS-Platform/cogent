'use client';

import React from 'react';

export interface DualStateIconProps {
  isActive?: boolean;
  className?: string;
  size?: number;
}

/**
 * 1. Overview Command Center Icon
 * Resting: Geometric outline grid
 * Active: Solid filled Cobalt grid (matching icon.webp style)
 */
export function OverviewIcon({ isActive = false, className = 'w-5 h-5', size = 20 }: DualStateIconProps) {
  if (isActive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="8" height="8" rx="2.5" />
        <rect x="13" y="3" width="8" height="8" rx="2.5" />
        <rect x="3" y="13" width="8" height="8" rx="2.5" />
        <rect x="13" y="13" width="8" height="8" rx="2.5" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="8" height="8" rx="2.5" />
      <rect x="13" y="3" width="8" height="8" rx="2.5" />
      <rect x="3" y="13" width="8" height="8" rx="2.5" />
      <rect x="13" y="13" width="8" height="8" rx="2.5" />
    </svg>
  );
}

/**
 * 2. Insight & Horizon Scanning Icon (formerly Radar)
 * Resting: Radar / Compass geometric outline
 * Active: Solid filled beacon / compass
 */
export function InsightIcon({ isActive = false, className = 'w-5 h-5', size = 20 }: DualStateIconProps) {
  if (isActive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9.5" />
        <path
          d="M12 4.5V12L17.5 17.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" strokeDasharray="2 2" />
    </svg>
  );
}

/**
 * 3. Marketing Shield Icon
 * Resting: Shield with check outline
 * Active: Solid filled shield with knock-out check
 */
export function MarketingIcon({ isActive = false, className = 'w-5 h-5', size = 20 }: DualStateIconProps) {
  if (isActive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z" />
        <path
          d="M9 11.5L11 13.5L15 9.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z" />
      <path d="M9 11.5L11 13.5L15 9.5" />
    </svg>
  );
}

/**
 * 4. Gap Matrix & Policy Concordance Icon
 * Resting: Layers / 5-W decision matrix outline
 * Active: Solid filled stacked matrix
 */
export function GapIcon({ isActive = false, className = 'w-5 h-5', size = 20 }: DualStateIconProps) {
  if (isActive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 2L2 7L12 12L22 7L12 2Z" />
        <path d="M2 12L12 17L22 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M2 17L12 22L22 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2L2 7L12 12L22 7L12 2Z" />
      <path d="M2 12L12 17L22 12" />
      <path d="M2 17L12 22L22 17" />
    </svg>
  );
}

/**
 * 5. Regulatory Library (Master Statutory Corpus)
 * Resting: Book / Gazette outline
 * Active: Solid filled book
 */
export function LibraryIcon({ isActive = false, className = 'w-5 h-5', size = 20 }: DualStateIconProps) {
  if (isActive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5V19.5Z" />
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20V17H6.5A2.5 2.5 0 0 0 4 19.5Z" opacity="0.8" />
        <line x1="8" y1="8" x2="16" y2="8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="12" x2="14" y2="12" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

/**
 * 6. Audit Ledger (Immutable CAMA 2020 SHA-256 Logs)
 * Resting: Stamp / Certificate / Ledger outline
 * Active: Solid filled certificate / seal
 */
export function AuditIcon({ isActive = false, className = 'w-5 h-5', size = 20 }: DualStateIconProps) {
  if (isActive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
        <path
          d="M9 14L11 16L15 12"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

/**
 * 7. Settings Hub
 * Resting: Sliders / Settings outline
 * Active: Solid filled gear
 */
export function SettingsIcon({ isActive = false, className = 'w-5 h-5', size = 20 }: DualStateIconProps) {
  if (isActive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M19.14 12.94C19.18 12.63 19.2 12.32 19.2 12C19.2 11.68 19.18 11.37 19.14 11.06L21.16 9.48C21.34 9.34 21.39 9.08 21.28 8.88L19.36 5.56C19.25 5.36 19 5.28 18.79 5.36L16.42 6.32C15.92 5.94 15.39 5.62 14.81 5.38L14.45 2.85C14.42 2.62 14.22 2.45 13.98 2.45H10.02C9.78 2.45 9.58 2.62 9.55 2.85L9.19 5.38C8.61 5.62 8.08 5.94 7.58 6.32L5.21 5.36C5 5.28 4.75 5.36 4.64 5.56L2.72 8.88C2.61 9.08 2.66 9.34 2.84 9.48L4.86 11.06C4.82 11.37 4.8 11.68 4.8 12C4.8 12.32 4.82 12.63 4.86 12.94L2.84 14.52C2.66 14.66 2.61 14.92 2.72 15.12L4.64 18.44C4.75 18.64 5 18.72 5.21 18.64L7.58 17.68C8.08 18.06 8.61 18.38 9.19 18.62L9.55 21.15C9.58 21.38 9.78 21.55 10.02 21.55H13.98C14.22 21.55 14.42 21.38 14.45 21.15L14.81 18.62C15.39 18.38 15.92 18.06 16.42 17.68L18.79 18.64C19 18.72 19.25 18.64 19.36 18.44L21.28 15.12C21.39 14.92 21.34 14.66 21.16 14.52L19.14 12.94ZM12 15.5C10.07 15.5 8.5 13.93 8.5 12C8.5 10.07 10.07 8.5 12 8.5C13.93 8.5 15.5 10.07 15.5 12C15.5 13.93 13.93 15.5 12 15.5Z" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
