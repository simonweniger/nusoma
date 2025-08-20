import { AudioNode } from './audio';
import { CodeNode } from './code';
import { DropNode } from './drop';
import { FileNode } from './file';
import { ImageNode } from './image';
import { MusicNode } from './music';
import { TextNode } from './text';
import { TweetNode } from './tweet';
import { VideoNode } from './video';

export const nodeTypes = {
  image: ImageNode,
  text: TextNode,
  drop: DropNode,
  video: VideoNode,
  audio: AudioNode,
  music: MusicNode,
  code: CodeNode,
  file: FileNode,
  tweet: TweetNode,
};
