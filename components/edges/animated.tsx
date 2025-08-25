import {
  BaseEdge,
  type EdgeProps,
  getSmoothStepPath,
  type InternalNode,
  type Node,
  Position,
  useInternalNode,
} from '@xyflow/react';

const getHandleCoordsByPosition = (
  node: InternalNode<Node>,
  handlePosition: Position
) => {
  // Choose the handle type based on position - Left is for target, Right is for source
  const handleType = handlePosition === Position.Left ? 'target' : 'source';

  const handle = node.internals.handleBounds?.[handleType]?.find(
    (h) => h.position === handlePosition
  );

  if (!handle) {
    return [0, 0];
  }

  // For overlapping rectangular handles, connect directly to the node edge
  let x: number;
  let y: number;

  switch (handlePosition) {
    case Position.Left:
      // Connect to the left edge of the node
      x = node.internals.positionAbsolute.x;
      y = node.internals.positionAbsolute.y + (node.measured?.height || 0) / 2;
      break;
    case Position.Right:
      // Connect to the right edge of the node
      x = node.internals.positionAbsolute.x + (node.measured?.width || 0);
      y = node.internals.positionAbsolute.y + (node.measured?.height || 0) / 2;
      break;
    case Position.Top:
      x = node.internals.positionAbsolute.x + (node.measured?.width || 0) / 2;
      y = node.internals.positionAbsolute.y;
      break;
    case Position.Bottom:
      x = node.internals.positionAbsolute.x + (node.measured?.width || 0) / 2;
      y = node.internals.positionAbsolute.y + (node.measured?.height || 0);
      break;
    default:
      throw new Error(`Invalid handle position: ${handlePosition}`);
  }

  return [x, y];
};

const getEdgeParams = (
  source: InternalNode<Node>,
  target: InternalNode<Node>
) => {
  const sourcePos = Position.Right;
  const [sx, sy] = getHandleCoordsByPosition(source, sourcePos);
  const targetPos = Position.Left;
  const [tx, ty] = getHandleCoordsByPosition(target, targetPos);

  return {
    sx,
    sy,
    tx,
    ty,
    sourcePos,
    targetPos,
  };
};

export const AnimatedEdge = ({
  id,
  source,
  target,
  markerEnd,
  style,
}: EdgeProps) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!(sourceNode && targetNode)) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  );

  const [edgePath] = getSmoothStepPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  return (
    <>
      <defs>
        <linearGradient id={`gradient-${id}`}>
          <stop offset="0%" stopColor="transparent">
            <animate
              attributeName="offset"
              dur="2s"
              repeatCount="indefinite"
              values="0%;25%;0%"
            />
          </stop>
          <stop offset="20%" stopColor="var(--primary)" stopOpacity="0.8">
            <animate
              attributeName="offset"
              dur="2s"
              repeatCount="indefinite"
              values="20%;45%;20%"
            />
          </stop>
          <stop offset="40%" stopColor="var(--primary)">
            <animate
              attributeName="offset"
              dur="2s"
              repeatCount="indefinite"
              values="40%;65%;40%"
            />
          </stop>
          <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.8">
            <animate
              attributeName="offset"
              dur="2s"
              repeatCount="indefinite"
              values="60%;85%;60%"
            />
          </stop>
          <stop offset="80%" stopColor="transparent">
            <animate
              attributeName="offset"
              dur="2s"
              repeatCount="indefinite"
              values="80%;100%;80%"
            />
          </stop>
        </linearGradient>
      </defs>
      <BaseEdge id={id} markerEnd={markerEnd} path={edgePath} style={style} />
      <path
        d={edgePath}
        fill="none"
        opacity="0.8"
        stroke={`url(#gradient-${id})`}
        strokeLinecap="round"
        strokeWidth="4"
      />
    </>
  );
};
