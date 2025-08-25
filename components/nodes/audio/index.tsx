import { AudioTableNode } from './table-node';

export type AudioNodeProps = {
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
    voice?: string;
    transcript?: string;
    instructions?: string;
  };
  id: string;
};

export const AudioNode = (props: AudioNodeProps) => (
  <AudioTableNode {...props} title="Audio" />
);
