import {
  BaseEdge,
  type EdgeProps,
  getBezierPath,
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

  let offsetX = handle.width / 2;
  let offsetY = handle.height / 2;

  // this is a tiny detail to make the markerEnd of an edge visible.
  // The handle position that gets calculated has the origin top-left, so depending which side we are using, we add a little offset
  // when the handlePosition is Position.Right for example, we need to add an offset as big as the handle itself in order to get the correct position
  switch (handlePosition) {
    case Position.Left:
      offsetX = 0;
      break;
    case Position.Right:
      offsetX = handle.width;
      break;
    case Position.Top:
      offsetY = 0;
      break;
    case Position.Bottom:
      offsetY = handle.height;
      break;
    default:
      throw new Error(`Invalid handle position: ${handlePosition}`);
  }

  const x = node.internals.positionAbsolute.x + handle.x + offsetX;
  const y = node.internals.positionAbsolute.y + handle.y + offsetY;

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

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  return (
    <>
      <BaseEdge
        className="!opacity-80"
        id={id}
        markerEnd={markerEnd}
        path={edgePath}
        style={style}
      />

      {/* Main gradient flare */}
      <path
        d={edgePath}
        fill="none"
        filter={`url(#glow-${id})`}
        opacity="1"
        stroke={`url(#flare-gradient-${id})`}
        strokeDasharray="60 1000"
        strokeLinecap="round"
        strokeWidth="1"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="4s"
          repeatCount="indefinite"
          values="1060;0"
        />
      </path>

      {/* Outer glow layer */}
      <path
        d={edgePath}
        fill="none"
        filter={`url(#glow-${id})`}
        opacity="0.6"
        stroke="oklch(0.555 0.2449 266.68)"
        strokeDasharray="80 1000"
        strokeLinecap="round"
        strokeWidth="1"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="4s"
          repeatCount="indefinite"
          values="1080;0"
        />
      </path>

      {/* Subtle background glow */}
      <path
        d={edgePath}
        fill="none"
        filter={`url(#glow-${id})`}
        opacity="0.2"
        stroke="oklch(0.7 0.15 266.68)"
        strokeDasharray="100 1000"
        strokeLinecap="round"
        strokeWidth="1"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="4s"
          repeatCount="indefinite"
          values="1100;0"
        />
      </path>
    </>
  );
};
