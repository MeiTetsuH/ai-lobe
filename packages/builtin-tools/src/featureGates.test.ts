import { DashboardIdentifier, LegacyDashboardIdentifier } from '@lobechat/builtin-tool-dashboard';
import { VideoGenerationIdentifier } from '@lobechat/builtin-tool-video-generation';
import { WebhookIdentifier } from '@lobechat/builtin-tool-webhook';
import { describe, expect, it } from 'vitest';

import { getFeatureDisabledToolIds, isToolEnabledByFeatureFlags } from './featureGates';

describe('feature-gated builtin tools', () => {
  it('does not offer deployment-disabled video tools even when runtime flags are enabled', () => {
    expect(isToolEnabledByFeatureFlags(VideoGenerationIdentifier, { enableDashboard: true })).toBe(
      false,
    );
    expect(isToolEnabledByFeatureFlags('lobe-image-generation', {})).toBe(true);
  });

  it('drops the dashboard tool unless the dashboard flag is on', () => {
    expect(getFeatureDisabledToolIds(undefined)).toContain(DashboardIdentifier);
    expect(getFeatureDisabledToolIds(undefined)).toContain(LegacyDashboardIdentifier);
    expect(getFeatureDisabledToolIds({ enableDashboard: false })).toContain(DashboardIdentifier);
    expect(getFeatureDisabledToolIds({ enableDashboard: true })).not.toContain(DashboardIdentifier);
    expect(getFeatureDisabledToolIds({ enableDashboard: true })).not.toContain(
      LegacyDashboardIdentifier,
    );
  });

  it('only gates tools that declare a flag', () => {
    expect(isToolEnabledByFeatureFlags(DashboardIdentifier, {})).toBe(false);
    expect(isToolEnabledByFeatureFlags(DashboardIdentifier, { enableDashboard: true })).toBe(true);
    expect(isToolEnabledByFeatureFlags('lobe-web-browsing', {})).toBe(true);
  });

  it('drops the webhook tool unless the webhook flag is on', () => {
    expect(getFeatureDisabledToolIds(undefined)).toContain(WebhookIdentifier);
    expect(getFeatureDisabledToolIds({ enableWebhook: false })).toContain(WebhookIdentifier);
    expect(getFeatureDisabledToolIds({ enableWebhook: true })).not.toContain(WebhookIdentifier);
    expect(isToolEnabledByFeatureFlags(WebhookIdentifier, { enableDashboard: true })).toBe(false);
    expect(isToolEnabledByFeatureFlags(WebhookIdentifier, { enableWebhook: true })).toBe(true);
  });
});
