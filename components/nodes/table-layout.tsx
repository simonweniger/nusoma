import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  CodeIcon,
  CopyIcon,
  EyeIcon,
  MoreVerticalIcon,
  TrashIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useNodeOperations } from '@/providers/node-operations';
import { NodeToolbar } from './toolbar';

export type TableField = {
  name: string;
  type: string;
  value?: string | number | boolean;
  options?: string[]; // For select fields
  isHandle?: boolean;
  handleType?: 'source' | 'target';
  handlePosition?: Position;
  isConnected?: boolean;
  disabled?: boolean;
};

type TableNodeLayoutProps = {
  children: ReactNode; // Media content (image, video, etc.)
  id: string;
  data?: Record<string, unknown> & {
    model?: string;
    source?: string;
    generated?: object;
    fields?: TableField[];
  };
  title: string;
  type: string;
  toolbar?: {
    tooltip?: string;
    children: ReactNode;
  }[];
  className?: string;
  fields: TableField[];
  onFieldChange?: (fieldName: string, value: string | number | boolean) => void;
};

export const TableNodeLayout = ({
  children,
  type,
  id,
  data,
  toolbar,
  title,
  className,
  fields,
  onFieldChange,
}: TableNodeLayoutProps) => {
  const { deleteElements, setCenter, getNode, updateNode } = useReactFlow();
  const { duplicateNode } = useNodeOperations();
  const [showData, setShowData] = useState(false);

  const handleFocus = () => {
    const node = getNode(id);

    if (!node) {
      return;
    }

    const { x, y } = node.position;
    const width = node.measured?.width ?? 0;

    setCenter(x + width / 2, y, {
      duration: 1000,
    });
  };

  const handleDelete = () => {
    deleteElements({
      nodes: [{ id }],
    });
  };

  const handleShowData = () => {
    setTimeout(() => {
      setShowData(true);
    }, 100);
  };

  const handleSelect = (open: boolean) => {
    if (!open) {
      return;
    }

    const node = getNode(id);

    if (!node) {
      return;
    }

    if (!node.selected) {
      updateNode(id, { selected: true });
    }
  };

  return (
    <>
      {type !== 'drop' && toolbar?.length && (
        <NodeToolbar id={id} items={toolbar} />
      )}
      <ContextMenu onOpenChange={handleSelect}>
        <ContextMenuTrigger>
          <div
            className={cn(
              'node-container w-72 rounded-xl bg-card font-mono shadow-[0_1px_1px_rgba(0,0,0,0.02),_0_2px_2px_rgba(0,0,0,0.02),_0_4px_4px_rgba(0,0,0,0.02),_0_8px_8px_rgba(0,0,0,0.02),_0_16px_16px_rgba(0,0,0,0.02),_0_32px_32px_rgba(0,0,0,0.02)]',
              className
            )}
          >
            {/* Header with title and menu */}
            <div className="flex items-center justify-between rounded-t-xl border-border/80 border-b bg-gradient-to-b from-muted/30 to-background/50 px-4 py-3 backdrop-blur-sm">
              <div className="text-[13px]">
                <span className="text-muted-foreground/80">/</span>{' '}
                <span className="font-medium">{title}</span>
              </div>
              <Button
                aria-label="Open edit menu"
                className="-my-2 -me-2 text-muted-foreground/60 shadow-none hover:bg-transparent hover:text-muted-foreground"
                size="icon"
                variant="ghost"
              >
                <MoreVerticalIcon aria-hidden="true" className="size-5" />
              </Button>
            </div>

            {/* Media content area */}
            <div className="relative z-10 overflow-hidden border-b bg-card">
              {children}
            </div>

            {/* Model parameters table */}
            <div className="py-2 text-xs">
              {fields.map((field: TableField, index) => (
                <div className="group relative px-4" key={field.name}>
                  <div
                    className={cn(
                      'flex items-center justify-between gap-2 border-dashed py-2',
                      index < fields.length - 1 ? 'border-b' : ''
                    )}
                  >
                    {/* Left handle for inputs */}
                    {field.isHandle && field.handleType === 'target' && (
                      <Handle
                        id={field.name}
                        isConnectable={!field.disabled}
                        position={Position.Left}
                        type="target"
                      />
                    )}

                    <span className="truncate font-medium">{field.name}</span>

                    {/* Field value/input */}
                    {(() => {
                      if (field.type === 'select') {
                        return (
                          <select
                            className="border-none bg-transparent text-right text-muted-foreground/60 text-xs focus:outline-none"
                            disabled={field.disabled}
                            onChange={(e) =>
                              onFieldChange?.(field.name, e.target.value)
                            }
                            value={(field.value as string) || ''}
                          >
                            {field.options ? (
                              field.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))
                            ) : (
                              <option value="">{field.type}</option>
                            )}
                          </select>
                        );
                      }

                      if (field.type === 'number') {
                        return (
                          <input
                            className="w-16 border-none bg-transparent text-right text-muted-foreground/60 text-xs focus:outline-none"
                            disabled={field.disabled}
                            onChange={(e) =>
                              onFieldChange?.(
                                field.name,
                                Number(e.target.value)
                              )
                            }
                            type="number"
                            value={(field.value as number) || ''}
                          />
                        );
                      }

                      if (field.type === 'boolean') {
                        return (
                          <input
                            checked={field.value as boolean}
                            className="text-muted-foreground/60"
                            disabled={field.disabled}
                            onChange={(e) =>
                              onFieldChange?.(field.name, e.target.checked)
                            }
                            type="checkbox"
                          />
                        );
                      }

                      return (
                        <span className="text-right text-muted-foreground/60">
                          {field.value || field.type}
                        </span>
                      );
                    })()}

                    {/* Right handle for outputs */}
                    {field.isHandle && field.handleType === 'source' && (
                      <Handle
                        id={field.name}
                        isConnectable={!field.disabled}
                        position={Position.Right}
                        type="source"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={() => duplicateNode(id)}>
            <CopyIcon size={12} />
            <span>Duplicate</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleFocus}>
            <EyeIcon size={12} />
            <span>Focus</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} variant="destructive">
            <TrashIcon size={12} />
            <span>Delete</span>
          </ContextMenuItem>
          {process.env.NODE_ENV === 'development' && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleShowData}>
                <CodeIcon size={12} />
                <span>Show data</span>
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Dialog onOpenChange={setShowData} open={showData}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Node data</DialogTitle>
            <DialogDescription>
              Data for node{' '}
              <code className="rounded-sm bg-secondary px-2 py-1 font-mono">
                {id}
              </code>
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded bg-black p-4 text-sm text-white">
            {JSON.stringify({ ...data, fields }, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};
