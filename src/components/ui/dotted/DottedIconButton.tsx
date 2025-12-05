"use client";

import * as React from "react";
import {
  useState,
  useEffect,
  forwardRef,
  useMemo,
  useRef,
  useCallback,
  memo,
} from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const dottedIconButtonVariants = cva(
  "relative inline-flex items-center justify-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "text-primary",
        secondary: "text-secondary-foreground",
        ghost: "text-foreground",
        outline: "text-foreground",
        destructive: "text-destructive",
      },
      size: {
        sm: "h-8 px-3 gap-1",
        md: "h-9 px-4",
        lg: "h-10 px-5",
        "icon-sm": "size-8",
        icon: "size-9",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "icon",
    },
  },
);

interface DottedIconButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dottedIconButtonVariants> {
  /** Grid size (square) */
  gridSize?: number;
  /** Dot size in pixels */
  dotSize?: number;
  /** Gap between dots */
  gap?: number;
  /** Loading state - shows animated pattern */
  isLoading?: boolean;
  /** Icon to render in center */
  icon?: React.ReactNode;
}

// Color mappings for variants
const variantColors = {
  default: {
    base: "rgb(59, 130, 246)", // blue-500 (primary)
    hover: "rgb(96, 165, 250)", // blue-400
    active: "rgb(37, 99, 235)", // blue-600
  },
  secondary: {
    base: "rgb(113, 113, 122)", // zinc-500
    hover: "rgb(161, 161, 170)", // zinc-400
    active: "rgb(82, 82, 91)", // zinc-600
  },
  ghost: {
    base: "rgb(161, 161, 170)", // zinc-400
    hover: "rgb(212, 212, 216)", // zinc-300
    active: "rgb(113, 113, 122)", // zinc-500
  },
  outline: {
    base: "rgb(161, 161, 170)", // zinc-400
    hover: "rgb(212, 212, 216)", // zinc-300
    active: "rgb(113, 113, 122)", // zinc-500
  },
  destructive: {
    base: "rgb(239, 68, 68)", // red-500
    hover: "rgb(248, 113, 113)", // red-400
    active: "rgb(220, 38, 38)", // red-600
  },
};

// Grid sizes based on button size
const sizeGridConfigs = {
  sm: { gridSize: 8, dotSize: 2, gap: 1 },
  md: { gridSize: 10, dotSize: 2, gap: 1 },
  lg: { gridSize: 12, dotSize: 2, gap: 1 },
  "icon-sm": { gridSize: 10, dotSize: 2, gap: 1 },
  icon: { gridSize: 12, dotSize: 2, gap: 1 },
  "icon-lg": { gridSize: 14, dotSize: 2, gap: 1 },
};

// Memoized grid for icon button
const IconButtonGrid = memo(function IconButtonGrid({
  gridSize,
  dotSize,
  gap,
  color,
  variant,
  isHovered,
  isPressed,
  isLoading,
  frame,
}: {
  gridSize: number;
  dotSize: number;
  gap: number;
  color: string;
  variant: string;
  isHovered: boolean;
  isPressed: boolean;
  isLoading: boolean;
  frame: number;
}) {
  const width = gridSize * (dotSize + gap) - gap;
  const height = gridSize * (dotSize + gap) - gap;
  const rx = dotSize / 3;

  // Pre-compute grid positions and distances
  const gridData = useMemo(() => {
    const centerX = (gridSize - 1) / 2;
    const centerY = (gridSize - 1) / 2;
    const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));

    const result: Array<{
      x: number;
      y: number;
      distance: number;
      normalizedDistance: number;
      angle: number;
      row: number;
      col: number;
    }> = [];

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const distance = Math.sqrt(
          Math.pow(col - centerX, 2) + Math.pow(row - centerY, 2),
        );

        // Skip if outside circle mask
        if (distance > maxDistance * 0.92) continue;

        result.push({
          x: col * (dotSize + gap),
          y: row * (dotSize + gap),
          distance,
          normalizedDistance: distance / maxDistance,
          angle: Math.atan2(row - centerY, col - centerX),
          row,
          col,
        });
      }
    }

    return { positions: result, maxDistance };
  }, [gridSize, dotSize, gap]);

  // Calculate opacities
  const rects = useMemo(() => {
    return gridData.positions.map((pos) => {
      let opacity: number;
      const { distance, normalizedDistance, angle } = pos;
      const { maxDistance } = gridData;

      if (isLoading) {
        const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
        const rotationOffset = frame / 16;
        const wavePosition = (normalizedAngle + rotationOffset) % 1;

        if (distance > maxDistance * 0.4 && distance < maxDistance * 0.85) {
          if (wavePosition < 0.3) {
            opacity = 0.3 + wavePosition * 1.5;
          } else {
            opacity = 0.06;
          }
        } else {
          opacity = 0.06;
        }
      } else if (isPressed) {
        opacity = distance < maxDistance * 0.85 ? 0.7 : 0.4;
      } else if (isHovered) {
        if (normalizedDistance < 0.35) {
          opacity = 0.06;
        } else {
          const ringStrength = Math.sin(
            ((normalizedDistance - 0.35) * Math.PI) / 0.55,
          );
          opacity = 0.15 + ringStrength * 0.4;
        }
      } else if (variant === "outline") {
        const isRing =
          distance > maxDistance * 0.7 && distance < maxDistance * 0.88;
        opacity = isRing ? 0.2 : 0.03;
      } else if (variant === "ghost") {
        opacity = 0.04;
      } else {
        const isOuterRing =
          distance > maxDistance * 0.75 && distance < maxDistance * 0.9;
        opacity = isOuterRing ? 0.15 : 0.05;
      }

      return { ...pos, opacity };
    });
  }, [gridData, isLoading, isPressed, isHovered, variant, frame]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 m-auto"
    >
      {rects.map(({ x, y, opacity }, i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={dotSize}
          height={dotSize}
          rx={rx}
          fill={color}
          opacity={opacity}
        />
      ))}
    </svg>
  );
});

const DottedIconButton = memo(
  forwardRef<HTMLButtonElement, DottedIconButtonProps>(
    function DottedIconButton(
      {
        className,
        variant = "default",
        size = "icon",
        gridSize: customGridSize,
        dotSize: customDotSize,
        gap: customGap,
        isLoading = false,
        icon,
        disabled,
        children,
        ...props
      },
      ref,
    ) {
      const [isHovered, setIsHovered] = useState(false);
      const [isPressed, setIsPressed] = useState(false);
      const [frame, setFrame] = useState(0);
      const rafRef = useRef<number>(0);
      const lastTimeRef = useRef<number>(0);

      // Get config based on size, allow custom overrides
      const sizeConfig = sizeGridConfigs[size || "icon"];
      const gridSize = customGridSize ?? sizeConfig.gridSize;
      const dotSize = customDotSize ?? sizeConfig.dotSize;
      const gap = customGap ?? sizeConfig.gap;

      // Use requestAnimationFrame for smoother loading animation
      useEffect(() => {
        if (!isLoading) return;

        const animate = (timestamp: number) => {
          if (timestamp - lastTimeRef.current >= 80) {
            setFrame((prev) => (prev + 1) % 16);
            lastTimeRef.current = timestamp;
          }
          rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
          }
        };
      }, [isLoading]);

      const colors = variantColors[variant || "default"];

      const currentColor = useMemo(() => {
        if (isPressed) return colors.active;
        if (isHovered) return colors.hover;
        return colors.base;
      }, [isPressed, isHovered, colors]);

      const handleMouseEnter = useCallback(() => setIsHovered(true), []);
      const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        setIsPressed(false);
      }, []);
      const handleMouseDown = useCallback(() => setIsPressed(true), []);
      const handleMouseUp = useCallback(() => setIsPressed(false), []);

      return (
        <button
          ref={ref}
          className={cn(
            "isolate",
            dottedIconButtonVariants({ variant, size, className }),
          )}
          style={{ filter: "none" }}
          disabled={disabled || isLoading}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          {...props}
        >
          <IconButtonGrid
            gridSize={gridSize}
            dotSize={dotSize}
            gap={gap}
            color={currentColor}
            variant={variant || "default"}
            isHovered={isHovered}
            isPressed={isPressed}
            isLoading={isLoading}
            frame={frame}
          />
          {(icon || children) && (
            <div className="relative z-10 flex items-center justify-center">
              {icon || children}
            </div>
          )}
        </button>
      );
    },
  ),
);

export { DottedIconButton, dottedIconButtonVariants };
export type { DottedIconButtonProps };
