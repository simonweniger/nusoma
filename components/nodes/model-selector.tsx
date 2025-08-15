import {
  ChevronDownIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  ChevronUpIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { PriceBracket } from '@/lib/models/text';
import {
  type NusomaModel,
  type NusomaProvider,
  providers,
} from '@/lib/providers';
import { cn } from '@/lib/utils';
import {
  type SubscriptionContextType,
  useSubscription,
} from '@/providers/subscription';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type ModelSelectorProps = {
  id?: string;
  options: Record<string, NusomaModel>;
  value: string;
  width?: number | string;
  className?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

const getCostBracketIcon = (bracket: PriceBracket, className?: string) => {
  switch (bracket) {
    case 'lowest':
      return (
        <ChevronsDownIcon
          className={cn('text-green-500 dark:text-green-400', className)}
          size={16}
        />
      );
    case 'low':
      return (
        <ChevronDownIcon
          className={cn('text-blue-500 dark:text-blue-400', className)}
          size={16}
        />
      );
    case 'high':
      return (
        <ChevronUpIcon
          className={cn('text-orange-500 dark:text-orange-400', className)}
          size={16}
        />
      );
    case 'highest':
      return (
        <ChevronsUpIcon
          className={cn('text-red-500 dark:text-red-400', className)}
          size={16}
        />
      );
    default:
      return null;
  }
};

const getCostBracketLabel = (bracket: PriceBracket) => {
  switch (bracket) {
    case 'lowest':
      return 'This model uses a lot less credits.';
    case 'low':
      return 'This model uses less credits.';
    case 'high':
      return 'This model uses more credits.';
    case 'highest':
      return 'This model uses a lot of credits.';
    default:
      return '';
  }
};

const getModelDisabled = (
  model: NusomaModel,
  plan: SubscriptionContextType['plan']
) => {
  if (model.disabled) {
    return true;
  }

  if (
    (!plan || plan === 'hobby') &&
    (model.priceIndicator === 'highest' || model.priceIndicator === 'high')
  ) {
    return true;
  }

  return false;
};

const CommandGroupHeading = ({ data }: { data: NusomaProvider }) => (
  <div className="flex items-center gap-2">
    <data.icon className="size-4 shrink-0" />
    <span className="block truncate">{data.name}</span>
  </div>
);

const ModelIcon = ({
  data,
  chef,
  className,
}: {
  data: NusomaModel;
  chef: NusomaProvider;
  className?: string;
}) => {
  if (data.icon) {
    return <data.icon className={cn('size-4 shrink-0', className)} />;
  }

  return <chef.icon className={cn('size-4 shrink-0', className)} />;
};

export const ModelSelector = ({
  id,
  value,
  options,
  width = 250,
  className,
  onChange,
  disabled,
}: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { plan } = useSubscription();
  const activeModel = options[value];

  useEffect(() => {
    if (value && !options[value]) {
      onChange?.(Object.keys(options)[0]);
    }
  }, [value, options, onChange]);

  const groupedOptions = Object.entries(options).reduce(
    (acc, [id, model]) => {
      const chef = model.chef.id;

      if (!acc[chef]) {
        acc[chef] = {};
      }

      acc[chef][id] = model;
      return acc;
    },
    {} as Record<string, Record<string, NusomaModel>>
  );

  const sortedChefs = Object.keys(groupedOptions).sort((a, b) => {
    const aName = Object.values(providers)
      .find((provider) => provider.id === a)
      ?.name.toLowerCase();
    const bName = Object.values(providers)
      .find((provider) => provider.id === b)
      ?.name.toLowerCase();

    return aName?.localeCompare(bName ?? '') ?? 0;
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        asChild
        className={className}
        disabled={disabled}
        id={id}
        style={{ width }}
      >
        <Button className="w-full" variant="outline">
          {activeModel && (
            <div className="flex w-full items-center gap-2 overflow-hidden">
              <ModelIcon chef={activeModel.chef} data={activeModel} />
              <span className="block truncate">{activeModel.label}</span>
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Select a model</DialogTitle>
        </DialogHeader>
        <Command>
          <div className="[&>div]:h-12">
            <CommandInput placeholder="Search for a model..." />
          </div>
          <CommandList>
            <CommandEmpty />
            {sortedChefs.map((chef) => (
              <CommandGroup
                heading={
                  <CommandGroupHeading
                    data={providers[chef as keyof typeof providers]}
                  />
                }
                key={chef}
              >
                {Object.entries(groupedOptions[chef]).map(([id, model]) => (
                  <CommandItem
                    className={cn(
                      value === id &&
                        'bg-primary text-primary-foreground data-[selected=true]:bg-primary/80 data-[selected=true]:text-primary-foreground'
                    )}
                    disabled={getModelDisabled(model, plan)}
                    key={id}
                    onSelect={() => {
                      onChange?.(id);
                      setOpen(false);
                    }}
                    value={id}
                  >
                    <div className="flex flex-1 items-center gap-2 overflow-hidden">
                      <ModelIcon
                        chef={providers[chef as keyof typeof providers]}
                        className={
                          value === id ? 'text-primary-foreground' : ''
                        }
                        data={model}
                      />
                      <span className="block truncate">{model.label}</span>
                    </div>
                    {model.providers.map((provider, index) => (
                      <div
                        className={cn(index && 'opacity-50')}
                        key={provider.id}
                      >
                        <div
                          className={cn(
                            'flex size-4 items-center justify-center rounded-full bg-secondary',
                            value === id && 'bg-primary-foreground/10'
                          )}
                        >
                          <provider.icon
                            className={cn(
                              'size-3 shrink-0',
                              value === id
                                ? 'text-primary-foreground'
                                : 'text-muted-foreground'
                            )}
                          />
                        </div>
                      </div>
                    ))}
                    {model.priceIndicator ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            {getCostBracketIcon(
                              model.priceIndicator,
                              value === id ? 'text-primary-foreground' : ''
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{getCostBracketLabel(model.priceIndicator)}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div className="size-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
