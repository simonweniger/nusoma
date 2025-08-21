import { Handle, type Position, useStore } from '@xyflow/react';
import { useMemo } from 'react';

type CustomHandleProps = {
  position: Position;
  type: 'source' | 'target';
  nodeId: string;
};

export const CustomHandle = ({ position, type, nodeId }: CustomHandleProps) => {
  const edges = useStore((store) => store.edges);

  const isConnected = useMemo(() => {
    return edges.some((edge) => {
      if (type === 'source') {
        return edge.source === nodeId;
      }
      return edge.target === nodeId;
    });
  }, [edges, nodeId, type]);

  return (
    <Handle
      className={`
        ${isConnected ? '!opacity-0 !pointer-events-none' : '!opacity-100 !pointer-events-auto'}!transition-opacity !duration-200`}
      position={position}
      type={type}
    />
  );
};
