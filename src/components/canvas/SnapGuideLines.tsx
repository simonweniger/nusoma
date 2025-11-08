import React from "react";
import { Line } from "react-konva";

interface SnapGuide {
  lineGuide: number;
  offset: number;
  orientation: "V" | "H";
  snap: "start" | "center" | "end";
}

interface SnapGuideLinesProps {
  guides: SnapGuide[];
}

export const SnapGuideLines: React.FC<SnapGuideLinesProps> = ({ guides }) => {
  return (
    <>
      {guides.map((guide, index) => {
        if (guide.orientation === "H") {
          // Horizontal line
          return (
            <Line
              key={`guide-h-${index}`}
              points={[-6000, guide.lineGuide, 6000, guide.lineGuide]}
              stroke="rgb(0, 161, 255)"
              strokeWidth={0.5}
              //dash={[4, 6]}
              listening={false}
            />
          );
        } else {
          // Vertical line
          return (
            <Line
              key={`guide-v-${index}`}
              points={[guide.lineGuide, -6000, guide.lineGuide, 6000]}
              stroke="rgb(0, 161, 255)"
              strokeWidth={0.5}
              //dash={[4, 6]}
              listening={false}
            />
          );
        }
      })}
    </>
  );
};
