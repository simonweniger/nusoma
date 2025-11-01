import React, { useState, useEffect } from "react";
import { Group, Rect } from "react-konva";
import { Html } from "react-konva-utils";
import type { PlacedImage } from "@/types/canvas";

export type PlaceholderState = "submitting" | "running" | "success";

interface GeneratingPlaceholderProps {
  image: PlacedImage;
  outputType: "image" | "video";
  state?: PlaceholderState;
}

// Running animation - rotating pixel pattern that fills the placeholder
function RunningAnimation({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 5);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const cellWidth = width / 8;
  const cellHeight = height / 8;

  // Define the rotation pattern across 5 frames
  const getPattern = (frame: number) => {
    const patterns = [
      // Frame 0 - all faded
      Array(8)
        .fill(null)
        .map(() => Array(8).fill(0.08)),
      // Frame 1 - center square active
      [
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 1.0, 1.0, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 1.0, 1.0, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
      ],
      // Frame 2 - corners active
      [
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
      ],
      // Frame 3 - sides active
      [
        [0.08, 0.08, 0.08, 1.0, 1.0, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
        [0.08, 0.08, 0.08, 1.0, 1.0, 0.08, 0.08, 0.08],
      ],
      // Frame 4 - full border active
      [
        [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [1.0, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 1.0],
        [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      ],
    ];
    return patterns[frame];
  };

  const pattern = getPattern(frame);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 8 8"
      fill="none"
      preserveAspectRatio="none"
    >
      {pattern.map((row, rowIndex) =>
        row.map((opacity, colIndex) => (
          <rect
            key={`${rowIndex}-${colIndex}`}
            x={colIndex}
            y={rowIndex}
            width={0.9}
            height={0.9}
            fill={color}
            opacity={opacity}
          />
        )),
      )}
    </svg>
  );
}

// Success animation - expanding grid from center
function SuccessAnimation({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 8);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 8 8"
      fill="none"
      preserveAspectRatio="none"
    >
      {/* Generate expanding grid pattern */}
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => {
          const centerX = 3.5;
          const centerY = 3.5;
          // Use Manhattan distance for diamond expansion
          const distance = Math.abs(row - centerY) + Math.abs(col - centerX);
          const shouldShow = distance <= frame;

          // Calculate opacity based on how recently this cell was activated
          const opacity = shouldShow
            ? Math.max(0.3, 1 - (frame - distance) * 0.15)
            : 0;

          return (
            <rect
              key={`${row}-${col}`}
              x={col}
              y={row}
              width={0.9}
              height={0.9}
              fill={color}
              opacity={opacity}
            />
          );
        }),
      )}
    </svg>
  );
}

// Submitting animation - wave pattern across the grid
function SubmittingAnimation({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 12);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 8 8"
      fill="none"
      preserveAspectRatio="none"
    >
      {/* Generate wave pattern */}
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => {
          // Create a diagonal wave pattern
          const diagonalPosition = row + col;
          const wavePosition = (diagonalPosition + frame) % 12;

          // Calculate opacity based on wave position
          let opacity = 0.08;
          if (wavePosition < 3) {
            opacity = 0.3 + wavePosition * 0.25;
          } else if (wavePosition >= 3 && wavePosition < 6) {
            opacity = 1.0 - (wavePosition - 3) * 0.25;
          }

          return (
            <rect
              key={`${row}-${col}`}
              x={col}
              y={row}
              width={0.9}
              height={0.9}
              fill={color}
              opacity={opacity}
            />
          );
        }),
      )}
    </svg>
  );
}

export function GeneratingPlaceholder({
  image,
  outputType,
  state = "running",
}: GeneratingPlaceholderProps) {
  const color = "#335CFF";
  const successColor = "#22c55e"; // green-500

  // Determine colors based on state
  const strokeColor = state === "success" ? successColor : color;
  const fillColor =
    state === "success"
      ? "rgba(34, 197, 94, 0.1)" // green with opacity
      : "rgba(51, 92, 225, 0.1)"; // red with opacity

  // Determine which animation to show
  const renderAnimation = () => {
    switch (state) {
      case "submitting":
        return (
          <SubmittingAnimation
            color={color}
            width={image.width}
            height={image.height}
          />
        );
      case "success":
        return (
          <SuccessAnimation
            color={successColor}
            width={image.width}
            height={image.height}
          />
        );
      case "running":
      default:
        return (
          <RunningAnimation
            color={color}
            width={image.width}
            height={image.height}
          />
        );
    }
  };

  return (
    <Group x={image.x} y={image.y}>
      {/* Background frame with dashed border */}
      <Rect
        width={image.width}
        height={image.height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
        dash={state === "success" ? undefined : [10, 5]}
        //cornerRadius={8}
      />

      {/* Full-size grid animation */}
      <Html
        divProps={{
          style: {
            width: `${image.width}px`,
            height: `${image.height}px`,
            pointerEvents: "none",
          },
        }}
      >
        {renderAnimation()}
      </Html>
    </Group>
  );
}
