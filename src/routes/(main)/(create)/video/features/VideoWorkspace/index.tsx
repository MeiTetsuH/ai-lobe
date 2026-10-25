'use client';

import { VideoGenerationInput as PromptInput } from '@/features/VideoGenerationInput';
import GenerationWorkspace from '@/routes/(main)/(create)/features/GenerationWorkspace';
import { useVideoStore } from '@/store/video';
import { generationBatchSelectors, videoGenerationTopicSelectors } from '@/store/video/selectors';

import GenerationFeed from '../GenerationFeed';
import SkeletonList from './SkeletonList';

interface VideoWorkspaceProps {
  embedInput?: boolean;
}

const VideoWorkspace = ({ embedInput = true }: VideoWorkspaceProps) => (
  <GenerationWorkspace
    GenerationFeed={GenerationFeed}
    PromptInput={PromptInput}
    SkeletonList={SkeletonList}
    embedInput={embedInput}
    useStore={useVideoStore}
    selectors={{
      activeGenerationTopicId: videoGenerationTopicSelectors.activeGenerationTopicId,
      currentGenerationBatches: generationBatchSelectors.currentGenerationBatches,
      generationTopics: videoGenerationTopicSelectors.generationTopics,
      isCurrentGenerationTopicLoaded: generationBatchSelectors.isCurrentGenerationTopicLoaded,
    }}
  />
);

export default VideoWorkspace;
