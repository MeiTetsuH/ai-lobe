'use client';

import { VIDEO_GENERATION_ENABLED } from '@lobechat/const/deploymentCapabilities';
import { memo } from 'react';

import { VideoGenerationInput as PromptInput } from '@/features/VideoGenerationInput';
import CreateGenerationPage from '@/routes/(main)/(create)/features/CreateGenerationPage';

import { useVideoReferenceUpload } from './features/PromptInput/useVideoReferenceUpload';
import VideoWorkspace from './features/VideoWorkspace';

const DesktopVideoPage = memo(() => {
  const { canDropImage, handleUploadFiles } = useVideoReferenceUpload();

  return (
    <CreateGenerationPage
      PromptInput={PromptInput}
      Workspace={VideoWorkspace}
      dragDisabled={!VIDEO_GENERATION_ENABLED || !canDropImage}
      path="/video"
      onUploadFiles={VIDEO_GENERATION_ENABLED ? handleUploadFiles : undefined}
    />
  );
});

DesktopVideoPage.displayName = 'DesktopVideoPage';

export default DesktopVideoPage;
