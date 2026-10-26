import React from 'react';
import { Metadata } from 'next';
import { SupervisoryTelemetryDashboard } from '@/modules/operations/ui/SupervisoryTelemetryDashboard';

export const metadata: Metadata = {
  title: 'Supervisory Telemetry & Operations Cockpit | Cogent RegTech',
  description:
    'Institutional supervisory telemetry dashboard displaying live portal freshness, model latency, cascade event throughput, and sealed golden benchmark accuracy.',
};

export default function TelemetryPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 max-w-7xl mx-auto">
      <SupervisoryTelemetryDashboard />
    </div>
  );
}
