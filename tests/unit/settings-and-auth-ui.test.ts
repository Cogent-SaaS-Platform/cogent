import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ClerkAvatar, UserAvatar, OrgAvatar } from '@/shared/ui/ClerkAvatar';
import { AuthShowcasePanel } from '@/shared/ui/AuthShowcasePanel';

describe('Settings & Auth UI Components', () => {
  describe('ClerkAvatar Component (Marble #6C47FF Silhouette)', () => {
    it('renders marble gradient fallback with silhouette when Clerk is unauthenticated', () => {
      const html = renderToString(React.createElement(UserAvatar, { size: 'md', fallbackName: 'Folake Adeyemi' }));
      expect(html).toContain('linear-gradient(135deg, #6C47FF 0%, #8E6BFF 50%, #2A4BFF 100%)');
      expect(html).toContain('title="Folake Adeyemi"');
      // Silhouette circle and path
      expect(html).toContain('<circle');
      expect(html).toContain('<path');
    });

    it('renders organization emblem silhouette for organization avatar type', () => {
      const html = renderToString(React.createElement(OrgAvatar, { size: 'lg', fallbackName: 'Apex FinTech' }));
      expect(html).toContain('linear-gradient(135deg, #6C47FF 0%, #8E6BFF 50%, #2A4BFF 100%)');
      expect(html).toContain('title="Apex FinTech"');
      expect(html).toContain('<path');
    });
  });

  describe('AuthShowcasePanel (ui_ref/sign.JPG)', () => {
    it('renders the 3 regulator nodes (CBN, NDPC, ARCON) and SVG connector curves', () => {
      const html = renderToString(
        React.createElement(AuthShowcasePanel, {
          title: 'Connect with every regulator.',
          subtitle: 'Everything you need in an easily customizable regulatory intelligence dashboard.',
          activeDotIndex: 0,
        })
      );

      // 3 Regulatory nodes
      expect(html).toContain('CBN');
      expect(html).toContain('NDPC');
      expect(html).toContain('ARCON');

      // SVG connector curves
      expect(html).toContain('stroke="rgba(255, 255, 255, 0.45)"');
      expect(html).toContain('stroke="rgba(255, 255, 255, 0.65)"');

      // Floating card traffic lights
      expect(html).toContain('#FF5F56');
      expect(html).toContain('#FFBD2E');
      expect(html).toContain('#27C93F');

      // Headline and subtitle
      expect(html).toContain('Connect with every regulator.');
      expect(html).toContain('Everything you need in an easily customizable regulatory intelligence dashboard.');
    });
  });
});
