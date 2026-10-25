// This deployment omits video callbacks and ffmpeg. Restore those before enabling creation.
export const VIDEO_GENERATION_ENABLED = false;

export const isGenerationTypeEnabled = (type: string): boolean =>
  type !== 'video' || VIDEO_GENERATION_ENABLED;
