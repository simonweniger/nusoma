import type { Node } from '@xyflow/react';
import type { AudioNodeProps } from '@/components/nodes/audio';
import type { CodeNodeProps } from '@/components/nodes/code';
import type { FileNodeProps } from '@/components/nodes/file';
import type { ImageNodeProps } from '@/components/nodes/image';
import type { MusicNodeProps } from '@/components/nodes/music';
import type { TextNodeProps } from '@/components/nodes/text';
import type { TweetNodeProps } from '@/components/nodes/tweet';

export const getTextFromTextNodes = (nodes: Node[]) => {
  const sourceTexts = nodes
    .filter((node) => node.type === 'text')
    .map((node) => (node.data as TextNodeProps['data']).text);

  const generatedTexts = nodes
    .filter((node) => node.type === 'text' && node.data.generated)
    .map((node) => (node.data as TextNodeProps['data']).generated?.text);

  return [...sourceTexts, ...generatedTexts].filter(Boolean) as string[];
};

export const getTranscriptionFromAudioNodes = (nodes: Node[]) => {
  const transcripts = nodes
    .filter((node) => node.type === 'audio')
    .map((node) => (node.data as AudioNodeProps['data']).transcript)
    .filter(Boolean) as string[];

  return transcripts;
};

export const getDescriptionsFromImageNodes = (nodes: Node[]) => {
  const descriptions = nodes
    .filter((node) => node.type === 'image')
    .map((node) => (node.data as ImageNodeProps['data']).description)
    .filter(Boolean) as string[];

  return descriptions;
};

export const getImagesFromImageNodes = (nodes: Node[]) => {
  const sourceImages = nodes
    .filter((node) => node.type === 'image')
    .map((node) => (node.data as ImageNodeProps['data']).content)
    .filter(Boolean) as { url: string; type: string }[];

  const generatedImages = nodes
    .filter((node) => node.type === 'image')
    .map((node) => (node.data as ImageNodeProps['data']).generated)
    .filter(Boolean) as { url: string; type: string }[];

  return [...sourceImages, ...generatedImages];
};

export const isValidSourceTarget = (source: Node, target: Node) => {
  if (source.type === 'video' || source.type === 'drop') {
    return false;
  }

  if (target.type === 'audio' && source.type !== 'text') {
    return false;
  }

  if (target.type === 'file') {
    return false;
  }

  return true;
};

export const getCodeFromCodeNodes = (nodes: Node[]) => {
  const sourceCodes = nodes
    .filter((node) => node.type === 'code')
    .map((node) => (node.data as CodeNodeProps['data']).content)
    .filter(Boolean) as { text: string; language: string }[];

  const generatedCodes = nodes
    .filter((node) => node.type === 'code' && node.data.generated)
    .map((node) => (node.data as CodeNodeProps['data']).generated)
    .filter(Boolean) as { text: string; language: string }[];

  return [...sourceCodes, ...generatedCodes];
};

export const getFilesFromFileNodes = (nodes: Node[]) => {
  const files = nodes
    .filter((node) => node.type === 'file')
    .map((node) => (node.data as FileNodeProps['data']).content)
    .filter(Boolean) as { url: string; type: string; name: string }[];

  return files;
};

export const getTweetContentFromTweetNodes = (nodes: Node[]) => {
  const tweets = nodes
    .filter((node) => node.type === 'tweet')
    .map((node) => (node.data as TweetNodeProps['data']).content)
    .filter(Boolean) as NonNullable<TweetNodeProps['data']['content']>[];

  const tweetContent = tweets.map(
    (tweet) => `On ${tweet.date}, ${tweet.author} tweeted: ${tweet.text}`
  );

  return tweetContent;
};

export const getAudioFromAudioNodes = (nodes: Node[]) => {
  const sourceAudio = nodes
    .filter((node) => node.type === 'audio')
    .map((node) => (node.data as AudioNodeProps['data']).content)
    .filter(Boolean) as { url: string; type: string }[];

  const generatedAudio = nodes
    .filter((node) => node.type === 'audio')
    .map((node) => (node.data as AudioNodeProps['data']).generated)
    .filter(Boolean) as { url: string; type: string }[];

  return [...sourceAudio, ...generatedAudio];
};

export const getAudioFromMusicNodes = (nodes: Node[]) => {
  const sourceMusic = nodes
    .filter((node) => node.type === 'music')
    .map((node) => (node.data as MusicNodeProps['data']).content)
    .filter(Boolean) as { url: string; type: string }[];

  const generatedMusic = nodes
    .filter((node) => node.type === 'music')
    .map((node) => (node.data as MusicNodeProps['data']).generated)
    .filter(Boolean) as { url: string; type: string }[];

  return [...sourceMusic, ...generatedMusic];
};
