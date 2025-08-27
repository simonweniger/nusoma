import { Position, useReactFlow } from '@xyflow/react';
import { CodeIcon, CopyIcon, EyeIcon, TrashIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
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
import { BaseHandle } from '@/components/ui/reactflow/base-handle';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/ui/reactflow/base-node';
import {
  type NodeStatus,
  NodeStatusIndicator,
  type NodeStatusVariant,
} from '@/components/ui/reactflow/node-status-indicator';
import { cn } from '@/lib/utils';
import { useNodeOperations } from '@/providers/node-operations';
import { NodeToolbar } from './toolbar';

// Utility function to map media status to node status
export const mapMediaStatusToNodeStatus = (
  mediaStatus?: {
    status: string;
    isGenerating?: boolean;
    isCompleted?: boolean;
  } | null
): NodeStatus => {
  if (!mediaStatus) {
    return 'initial';
  }

  if (mediaStatus.isGenerating) {
    switch (mediaStatus.status) {
      case 'pending':
      case 'running':
        return 'loading';
      case 'failed':
        return 'error';
      default:
        return 'loading';
    }
  }

  if (mediaStatus.isCompleted) {
    return 'success';
  }

  return 'initial';
};

// Utility function to map chat status to node status
export const mapChatStatusToNodeStatus = (
  chatStatus?: 'submitted' | 'streaming' | 'idle' | 'error' | 'ready'
): NodeStatus => {
  switch (chatStatus) {
    case 'submitted':
    case 'streaming': {
      return 'loading';
    }
    case 'error': {
      return 'error';
    }
    default: {
      return 'initial';
    }
  }
};

type NodeLayoutProps = {
  children: ReactNode;
  id: string;
  data?: Record<string, unknown> & {
    model?: string;
    source?: string;
    generated?: object;
  };
  title: string;
  type: string;
  toolbar?: {
    tooltip?: string;
    children: ReactNode;
  }[];
  className?: string;
  headerActions?: ReactNode;
  showHeader?: boolean;
  status?: NodeStatus;
  statusVariant?: NodeStatusVariant;
};

export const NodeLayout = ({
  children,
  type,
  id,
  data,
  toolbar,
  title,
  className,
  headerActions,
  showHeader = true,
  status,
  statusVariant = 'border',
}: NodeLayoutProps) => {
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
      {type !== 'file' && type !== 'tweet' && type !== 'text' && (
        <BaseHandle position={Position.Left} type="target" />
      )}
      <BaseNodeHeaderTitle className="mb-1 font-mono text-muted-foreground text-xs tracking-tighter">
        {title}
      </BaseNodeHeaderTitle>
      <ContextMenu onOpenChange={handleSelect}>
        <ContextMenuTrigger>
          <div className="relative">
            <NodeStatusIndicator status={status} variant={statusVariant}>
              <BaseNode className={cn('w-sm transition-all', className)}>
                {showHeader && type !== 'drop' && (
                  <BaseNodeHeader>
                    {/*<BaseNodeHeaderTitle className="font-mono text-muted-foreground text-xs tracking-tighter">
                      {title}
                    </BaseNodeHeaderTitle>*/}
                    {headerActions}
                  </BaseNodeHeader>
                )}
                <BaseNodeContent>{children}</BaseNodeContent>
              </BaseNode>
            </NodeStatusIndicator>
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
      <BaseHandle position={Position.Right} type="source" />
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
            {JSON.stringify(data, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};
