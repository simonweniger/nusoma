import { useNodeConnections } from '@xyflow/react';
import { MusicPrimitive } from './primitive';
import { MusicTransform } from './transform';

export type MusicNodeProps = {
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
    duration?: number;
    instructions?: string;
  };
  id: string;
};

export const MusicNode = (props: MusicNodeProps) => {
  const connections = useNodeConnections({
    id: props.id,
    handleType: 'target',
  });
  const Component = connections.length ? MusicTransform : MusicPrimitive;

  return <Component {...props} title="Music" />;
};
