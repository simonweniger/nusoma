import { VideoTableNode } from './table-node';

export type VideoNodeProps = {
  type: string;
  data: {
    content?: {
      url: string;
      type: string;
    };
    generated?: {
      url: string;
      type: string;
    };
    updatedAt?: string;
    model?: string;
    falEndpoint?: string;
    instructions?: string;
    width?: number;
    height?: number;
  };
  id: string;
};

export const VideoNode = (props: VideoNodeProps) => (
  <VideoTableNode {...props} title="Video" />
);
