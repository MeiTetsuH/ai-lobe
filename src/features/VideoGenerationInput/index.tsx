'use client';

import { VIDEO_GENERATION_ENABLED } from '@lobechat/const/deploymentCapabilities';
import { Text } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';

import PromptInput from '@/routes/(main)/(create)/video/features/PromptInput';

export const VideoGenerationInput = (props: {
  disableAnimation?: boolean;
  showTitle?: boolean;
}) => {
  const { t } = useTranslation('video');
  if (VIDEO_GENERATION_ENABLED) return <PromptInput {...props} />;
  return <Text type="secondary">{t('generation.disabled')}</Text>;
};
