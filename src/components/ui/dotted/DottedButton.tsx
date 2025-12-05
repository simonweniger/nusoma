"use client";

import * as React from "react";
import { useState, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const dottedButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        secondary: "text-secondary-foreground",
        ghost: "text-foreground",
        outline: "text-foreground",
        destructive: "text-destructive-foreground",
        link: "text-foreground hover:underline",
      },
      size: {
        sm: "h-8 px-3 gap-1 text-sm",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

interface DottedButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dottedButtonVariants> {
  /** Number of dot columns */
  cols?: number;
  /** Number of dot rows */
  rows?: number;
  /** Dot size in pixels */
  dotSize?: number;
  /** Gap between dots */
  gap?: number;
  /** Loading state */
  isLoading?: boolean;
}

// Color mappings for variants
const variantColors = {
  default: {
    base: "rgb(59, 130, 246)", // blue-500 (primary)
    hover: "rgb(96, 165, 250)", // blue-400
    active: "rgb(37, 99, 235)", // blue-600
  },
  secondary: {
    base: "rgb(63, 63, 70)", // zinc-700
    hover: "rgb(82, 82, 91)", // zinc-600
    active: "rgb(39, 39, 42)", // zinc-800
  },
  ghost: {
    base: "rgb(113, 113, 122)", // zinc-500
    hover: "rgb(161, 161, 170)", // zinc-400
    active: "rgb(82, 82, 91)", // zinc-600
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
  link: {
    base: "rgb(161, 161, 170)", // zinc-400
    hover: "rgb(212, 212, 216)", // zinc-300
    active: "rgb(113, 113, 122)", // zinc-500
  },
};

// Grid configs based on size
const sizeGridConfigs = {
  sm: { cols: 24, rows: 8, dotSize: 2, gap: 1 },
  md: { cols: 28, rows: 9, dotSize: 2, gap: 1 },
  lg: { cols: 32, rows: 10, dotSize: 2, gap: 1 },
};

const DottedButton = forwardRef<HTMLButtonElement, DottedButtonProps>(
  function DottedButton(
    {
      className,
      variant = "default",
      size = "md",
      cols: customCols,
      rows: customRows,
      dotSize: customDotSize,
      gap: customGap,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [frame, setFrame] = useState(0);

    // Get config based on size, allow custom overrides
    const sizeConfig = sizeGridConfigs[size || "md"];
    const cols = customCols ?? sizeConfig.cols;
    const rows = customRows ?? sizeConfig.rows;
    const dotSize = customDotSize ?? sizeConfig.dotSize;
    const gap = customGap ?? sizeConfig.gap;

    useEffect(() => {
      if (!isLoading) return;
      const interval = setInterval(() => {
        setFrame((prev) => (prev + 1) % 16);
      }, 80);
      return () => clearInterval(interval);
    }, [isLoading]);

    const width = cols * (dotSize + gap) - gap;
    const height = rows * (dotSize + gap) - gap;

    const colors = variantColors[variant || "default"];

    const getColor = (): string => {
      if (isPressed) return colors.active;
      if (isHovered) return colors.hover;
      return colors.base;
    };

    const getOpacity = (row: number, col: number): number => {
      // Create rounded rectangle border pattern
      const isTopEdge = row === 0;
      const isBottomEdge = row === rows - 1;
      const isLeftEdge = col === 0;
      const isRightEdge = col === cols - 1;

      // Corner radius effect
      const cornerSize = 2;
      const isTopLeftCorner = row < cornerSize && col < cornerSize;
      const isTopRightCorner = row < cornerSize && col >= cols - cornerSize;
      const isBottomLeftCorner = row >= rows - cornerSize && col < cornerSize;
      const isBottomRightCorner =
        row >= rows - cornerSize && col >= cols - cornerSize;

      // Skip corners for rounded effect
      if (
        isTopLeftCorner ||
        isTopRightCorner ||
        isBottomLeftCorner ||
        isBottomRightCorner
      ) {
        const cornerRow =
          isTopLeftCorner || isTopRightCorner ? row : rows - 1 - row;
        const cornerCol =
          isTopLeftCorner || isBottomLeftCorner ? col : cols - 1 - col;
        if (cornerRow + cornerCol < cornerSize) {
          return 0;
        }
      }

      const isEdge = isTopEdge || isBottomEdge || isLeftEdge || isRightEdge;

      if (isLoading) {
        // Wave animation when loading
        const diagonalPosition = row + col;
        const wavePosition = (diagonalPosition + frame) % 12;
        if (wavePosition < 3) {
          return 0.2 + wavePosition * 0.25;
        } else if (wavePosition < 6) {
          return 0.95 - (wavePosition - 3) * 0.25;
        }
        return isEdge ? 0.15 : 0.05;
      }

      if (isPressed) {
        // Full fill when pressed
        return isEdge ? 0.9 : 0.6;
      }

      if (isHovered) {
        // Fill effect on hover (matching DottedBadge)
        return isEdge ? 0.6 : 0.25;
      }

      // Default states per variant
      if (variant === "link") {
        return 0; // No dots for link variant
      }

      if (variant === "ghost") {
        return isEdge ? 0.15 : 0.03;
      }

      if (variant === "outline") {
        return isEdge ? 0.4 : 0.05;
      }

      // Default/secondary/destructive - just border (matching DottedBadge)
      return isEdge ? 0.4 : 0.08;
    };

    return (
      <button
        ref={ref}
        className={cn(
          "isolate",
          dottedButtonVariants({ variant, size, className }),
        )}
        style={{ filter: "none", minWidth: width, minHeight: height }}
        disabled={disabled || isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        {...props}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0"
        >
          {Array.from({ length: rows }).map((_, row) =>
            Array.from({ length: cols }).map((_, col) => (
              <rect
                key={`${row}-${col}`}
                x={col * (dotSize + gap)}
                y={row * (dotSize + gap)}
                width={dotSize}
                height={dotSize}
                rx={dotSize / 3}
                fill={getColor()}
                opacity={getOpacity(row, col)}
                className="transition-opacity duration-75"
              />
            )),
          )}
        </svg>
        {children && (
          <div className="relative z-10 flex items-center gap-2">
            {children}
          </div>
        )}
      </button>
    );
  },
);

export { DottedButton, dottedButtonVariants };
export type { DottedButtonProps };
