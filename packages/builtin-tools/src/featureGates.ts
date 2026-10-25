import { DashboardIdentifier } from '@lobechat/builtin-tool-dashboard';
import { VideoGenerationIdentifier } from '@lobechat/builtin-tool-video-generation';
import { VIDEO_GENERATION_ENABLED } from '@lobechat/const/deploymentCapabilities';
import type { IFeatureFlagsState } from '@lobechat/types';

export const getDeploymentDisabledToolIds = (): string[] =>
  VIDEO_GENERATION_ENABLED ? [] : [VideoGenerationIdentifier];

/** Builtin tools that exist only while a runtime feature flag is on for the user. */
export const FEATURE_GATED_TOOLS: Record<string, keyof IFeatureFlagsState> = {
  [DashboardIdentifier]: 'enableDashboard',
};

/**
 * Identifiers to drop from a run's tool pool for the user's resolved flags.
 * Fails closed: a flag that is unset or anything but `true` hides its tool.
 * Hosts add these to the run's disabled identifiers, which leave the pool
 * outright — explicit activation cannot bring them back.
 */
export const getFeatureDisabledToolIds = (flags: Partial<IFeatureFlagsState> | undefined) =>
  Object.entries(FEATURE_GATED_TOOLS)
    .filter(([, flag]) => flags?.[flag] !== true)
    .map(([identifier]) => identifier);

/** Whether a builtin tool may be offered / listed for the user's resolved flags. */
export const isToolEnabledByFeatureFlags = (
  identifier: string,
  flags: Partial<IFeatureFlagsState> | undefined,
) => {
  if (getDeploymentDisabledToolIds().includes(identifier)) return false;
  const flag = FEATURE_GATED_TOOLS[identifier];
  return !flag || flags?.[flag] === true;
};
