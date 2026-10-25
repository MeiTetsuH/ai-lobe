import { VIDEO_GENERATION_ENABLED } from '@lobechat/const/deploymentCapabilities';
import { TRPCError } from '@trpc/server';

export const assertVideoGenerationEnabled = () => {
  if (!VIDEO_GENERATION_ENABLED) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Video generation is disabled on this deployment.',
    });
  }
};
