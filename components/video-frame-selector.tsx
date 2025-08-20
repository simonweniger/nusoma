'use client';

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  PlusIcon,
  UploadIcon,
  X,
} from 'lucide-react';

import type React from 'react';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MediaItemRow } from './media-panel';

type TimelineImage = {
  id: string;
  src: string;
  startFrame: number;
  name: string;
};

type ImageLibraryItem = {
  id: string;
  src: string | File;
  name: string;
};

type VideoFrameSelectorProps = {
  minFrame?: number;
  maxFrame?: number;
  mediaItems: MediaItem[];
  onChange: (
    images: {
      start_frame_num: number;
      image_url: string | File;
    }[]
  ) => void;
};

export default function VideoFrameSelector({
  minFrame = 0,
  maxFrame = 120,
  mediaItems,
  onChange,
}: VideoFrameSelectorProps) {
  const [open, setOpen] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(minFrame);
  const [images, _setImages] = useState<TimelineImage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setImages = (images: TimelineImage[]) => {
    _setImages(images);
    onChange(
      images.map((img) => ({
        start_frame_num: img.startFrame,
        image_url: img.src,
      }))
    );
  };

  const addImageToTimeline = (libraryItem: ImageLibraryItem) => {
    const newImage: TimelineImage = {
      id: `timeline-${Date.now()}`,
      src: libraryItem.src as string,
      startFrame: currentFrame,
      name: libraryItem.name,
    };

    setImages([...images, newImage]);
    setIsDialogOpen(false);
  };

  const removeImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
  };

  const getFrameFromMousePosition = (clientX: number): number => {
    if (!timelineRef.current) {
      return currentFrame;
    }

    const frameMultiplier = 8;
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const relativeX = clientX - timelineRect.left;
    const framePosition =
      (relativeX / timelineRect.width) * (maxFrame - minFrame) + minFrame;

    const roundedFrame =
      Math.round(framePosition / frameMultiplier) * frameMultiplier;

    return Math.max(minFrame, Math.min(maxFrame, roundedFrame));
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[draggable="true"]')) {
      return;
    }

    const newFrame = getFrameFromMousePosition(e.clientX);
    setCurrentFrame(newFrame);
  };

  const handlePlayheadDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newFrame = getFrameFromMousePosition(moveEvent.clientX);
      setCurrentFrame(newFrame);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSelectMedia = (item: MediaItem) => {
    addImageToTimeline({
      id: item.id,
      src: item.output?.images?.[0]?.url || item.url,
      name: item.output?.prompt || 'Untitled',
    });
  };

  const renderTimelineMarkers = () => {
    const markers: React.ReactNode[] = [];
    const majorStep = Math.ceil((maxFrame - minFrame) / 12);

    for (let i = minFrame; i <= maxFrame; i += majorStep) {
      markers.push(
        <div
          className="flex flex-col items-center"
          key={`major-${i}`}
          style={{
            position: 'absolute',
            left: `${((i - minFrame) / (maxFrame - minFrame)) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="h-6 w-0.5 bg-neutral-600" />
          <span className="text-neutral-500 text-xs">{i}</span>
        </div>
      );
    }

    const minorStep = Math.ceil(majorStep / 5);
    for (let i = minFrame; i <= maxFrame; i += minorStep) {
      if ((i - minFrame) % majorStep !== 0) {
        markers.push(
          <div
            className="flex flex-col items-center rounded"
            key={`minor-${i}`}
            style={{
              position: 'absolute',
              left: `${((i - minFrame) / (maxFrame - minFrame)) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="h-3 w-[1px] bg-neutral-500/50" />
          </div>
        );
      }
    }

    return markers;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    addImageToTimeline({
      id: `file-${Date.now()}`,
      src: file,
      name: file.name,
    });
  };

  const handleTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className={cn(
        'mx-auto w-full border-neutral-800 border-t py-3',
        open ? 'min-h-52' : ''
      )}
    >
      {/* Header */}
      <div
        className="mb-6 flex select-none items-center justify-between"
        onClick={() => setOpen(!open)}
        role="button"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Select Image for Frames</span>
        </div>
        <Button className="text-white" size="icon" variant="ghost">
          {open ? (
            <ChevronUp className="h-6 w-6" />
          ) : (
            <ChevronDown className="h-6 w-6" />
          )}
        </Button>
      </div>
      {open && (
        <>
          <Slider
            className="hidden"
            max={maxFrame}
            min={minFrame}
            onValueChange={(value) => setCurrentFrame(value[0])}
            step={8}
            value={[currentFrame]}
          />

          <div className="w-full">
            <div
              className="-mb-1 relative h-2 cursor-pointer"
              onClick={handleTimelineClick}
              onDragOver={handleTimelineDragOver}
              ref={timelineRef}
            >
              <div
                className={cn(
                  '-top-8 absolute bottom-0 z-20 flex h-[52px] flex-col items-center',
                  isDraggingPlayhead ? 'cursor-grabbing' : 'cursor-grab'
                )}
                onMouseDown={handlePlayheadDragStart}
                style={{
                  left: `${
                    ((currentFrame - minFrame) / (maxFrame - minFrame)) * 100
                  }%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <span className="mt-1 text-red-500 text-xs">
                  {currentFrame}
                </span>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                  <GripVertical className="h-3 w-3 text-white" />
                </div>
                <div className="h-full w-0.5 bg-red-500" />
              </div>

              {/* Images on timeline */}
              {images.map((image) => {
                const startPercent =
                  ((image.startFrame - minFrame) / (maxFrame - minFrame)) * 100;
                const widthPercent =
                  ((Math.min(image.startFrame + 10, maxFrame) -
                    image.startFrame) /
                    (maxFrame - minFrame)) *
                  100;

                return (
                  <div
                    className={
                      'absolute top-2 mt-10 flex aspect-square h-12 min-w-12 max-w-12 flex-col items-center rounded-md bg-neutral-300'
                    }
                    key={image.id}
                    style={{
                      left: `${startPercent - widthPercent / 2}%`,
                      width: `${widthPercent}%`,
                    }}
                  >
                    <div className="relative flex w-full">
                      <div className="-translate-x-1/2 -top-1 absolute left-1/2 h-3 w-3 rotate-45 bg-neutral-300" />
                    </div>
                    <div className="group relative aspect-square h-full w-full overflow-hidden p-1">
                      <img
                        className="h-full w-full object-cover"
                        src={
                          typeof image?.src !== 'string'
                            ? URL.createObjectURL(image.src)
                            : image.src || '/placeholder.svg'
                        }
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-opacity group-hover:bg-opacity-20">
                        <Button
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(image.id);
                          }}
                          size="icon"
                          variant="destructive"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pointer-events-none relative h-12 w-full select-none">
              {renderTimelineMarkers()}
            </div>
          </div>

          <div className="mt-16 flex items-center justify-center gap-2">
            <input
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              ref={fileInputRef}
              type="file"
            />
            <Button
              className="flex items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              <UploadIcon size={16} />
              Upload Image
            </Button>

            <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" variant="outline">
                  <PlusIcon size={16} />
                  Select Image
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Select an Image</DialogTitle>
                </DialogHeader>
                <div className="flex max-h-80 flex-wrap items-center gap-2 divide-y divide-border overflow-y-auto">
                  {mediaItems
                    .filter((media) => {
                      if (media.mediaType === 'image') return true;
                    })
                    .map((job) => (
                      <MediaItemRow
                        className="cursor-pointer"
                        data={job}
                        draggable={false}
                        key={job.id}
                        onOpen={handleSelectMedia}
                      />
                    ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </div>
  );
}
