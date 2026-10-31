'use client';

import React from 'react';
import { ActionItemsSection, ActionItemsSectionProps } from './ActionItemsSection';

export type ActionItemTrackerProps = ActionItemsSectionProps;

export function ActionItemTracker(props: ActionItemTrackerProps) {
  return <ActionItemsSection {...props} />;
}

export default ActionItemTracker;
