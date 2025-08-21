import {
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
  // Get node bounds for seamless edge blending
  const nodeWidth = node.measured?.width || 200;
  const nodeHeight = node.measured?.height || 100;
  const nodeX = node.internals.positionAbsolute.x;
  const nodeY = node.internals.positionAbsolute.y;

  // Calculate connection point at the edge of the node for seamless blending
  switch (handlePosition) {
    case Position.Left:
      return [nodeX, nodeY + nodeHeight / 2];
    case Position.Right:
      return [nodeX + nodeWidth, nodeY + nodeHeight / 2];
    case Position.Top:
      return [nodeX + nodeWidth / 2, nodeY];
    case Position.Bottom:
      return [nodeX + nodeWidth / 2, nodeY + nodeHeight];
    default:
      throw new Error(`Invalid handle position: ${handlePosition}`);
  }
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

export const MorphingEdge = ({ id, source, target, style }: EdgeProps) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!(sourceNode && targetNode)) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  );

  // Calculate distance and create gummy connection
  const distance = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2);
  const verticalDiff = Math.abs(ty - sy);
  const isHorizontallyAligned = verticalDiff < 30;

  // Use larger offset for horizontally aligned nodes
  const dynamicOffset = isHorizontallyAligned
    ? Math.max(80, distance * 0.3)
    : Math.max(40, verticalDiff * 0.2);

  const [edgePath] = getSmoothStepPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
    offset: dynamicOffset,
  });

  // Calculate width once for use in both connection and end caps
  const baseWidth = Math.min(Math.max(20, distance / 8), 25); // Max width of 25px
  const midWidth = baseWidth * 0.3;

  // Create smooth step connection with rounded edges
  const createSmoothStepConnection = () => {
    // Parse the smooth step path to get the actual path points
    const pathCommands = edgePath.split(/(?=[ML])/);
    const pathPoints = [];

    for (const command of pathCommands) {
      if (command.startsWith('M') || command.startsWith('L')) {
        const coords = command
          .slice(1)
          .trim()
          .split(/[\s,]+/);
        if (coords.length >= 2) {
          pathPoints.push({
            x: Number.parseFloat(coords[0]),
            y: Number.parseFloat(coords[1]),
          });
        }
      }
    }

    if (pathPoints.length < 2) {
      pathPoints.push({ x: sx, y: sy }, { x: tx, y: ty });
    }

    // Create variable width along the smooth step path
    const widthPoints = [];
    for (let i = 0; i < pathPoints.length; i++) {
      const t = pathPoints.length > 1 ? i / (pathPoints.length - 1) : 0;
      const point = pathPoints[i];

      // Create dramatic liquid droplet shape with higher exponential effect
      // Use a stronger curve that creates more visible "blob" effect
      const distanceFromCenter = Math.abs(t - 0.5) * 2; // 0 at center, 1 at ends
      const widthMultiplier = distanceFromCenter ** 4; // Higher exponent for more dramatic effect

      const currentWidth = midWidth + (baseWidth - midWidth) * widthMultiplier;

      // Calculate perpendicular direction
      let perpX = 0,
        perpY = 0;

      if (i === 0 && pathPoints.length > 1) {
        const dx = pathPoints[1].x - pathPoints[0].x;
        const dy = pathPoints[1].y - pathPoints[0].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          perpX = -dy / len;
          perpY = dx / len;
        }
      } else if (i === pathPoints.length - 1) {
        const dx = pathPoints[i].x - pathPoints[i - 1].x;
        const dy = pathPoints[i].y - pathPoints[i - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          perpX = -dy / len;
          perpY = dx / len;
        }
      } else {
        const dx1 = pathPoints[i].x - pathPoints[i - 1].x;
        const dy1 = pathPoints[i].y - pathPoints[i - 1].y;
        const dx2 = pathPoints[i + 1].x - pathPoints[i].x;
        const dy2 = pathPoints[i + 1].y - pathPoints[i].y;
        const avgDx = (dx1 + dx2) / 2;
        const avgDy = (dy1 + dy2) / 2;
        const len = Math.sqrt(avgDx * avgDx + avgDy * avgDy);
        if (len > 0) {
          perpX = -avgDy / len;
          perpY = avgDx / len;
        }
      }

      widthPoints.push({
        ...point,
        width: currentWidth,
        perpX,
        perpY,
      });
    }

    // Create smooth curves for top and bottom edges
    const topPoints = widthPoints.map((p) => ({
      x: p.x + p.perpX * p.width,
      y: p.y + p.perpY * p.width,
    }));

    const bottomPoints = widthPoints
      .map((p) => ({
        x: p.x - p.perpX * p.width,
        y: p.y - p.perpY * p.width,
      }))
      .reverse();

    // Create clean, simple path
    const topCurve = topPoints.map((p) => `${p.x},${p.y}`).join(' L ');
    const bottomCurve = bottomPoints.map((p) => `${p.x},${p.y}`).join(' L ');

    return `M ${topCurve} L ${bottomCurve} Z`;
  };

  return (
    <>
      <defs>
        <filter colorInterpolationFilters="sRGB" id={`subtle-smooth-${id}`}>
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="1" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            result="smooth"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 8 -3"
          />
        </filter>
      </defs>

      <g filter={`url(#subtle-smooth-${id})`} style={style}>
        {/* Clean smooth step connection with variable width */}
        <path
          d={createSmoothStepConnection()}
          fill="var(--card)"
          style={{
            fillOpacity: 1,
          }}
        />
      </g>
    </>
  );
};
