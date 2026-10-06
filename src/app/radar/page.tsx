import React from 'react';
import { RadarCockpit } from '@/modules/radar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Regulatory Radar & Circular Impact Tracer | Cogent',
  description:
    'Continuous multi-regulator circular monitoring, relational license/rail impact evaluation, and multi-role executive action tracking.',
};

export default function RadarPage() {
  return <RadarCockpit />;
}
