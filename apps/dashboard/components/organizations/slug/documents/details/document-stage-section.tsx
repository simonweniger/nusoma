'use client';

import * as React from 'react';
import { type SubmitHandler } from 'react-hook-form';

import { DocumentStage } from '@workspace/database/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@workspace/ui/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@workspace/ui/components/select';
import { toast } from '@workspace/ui/components/sonner';
import { cn } from '@workspace/ui/lib/utils';

import { updateDocumentStage } from '~/actions/documents/update-document-status';
import { documentStageColor } from '~/components/organizations/slug/documents/document-stage-color';
import { useZodForm } from '~/hooks/use-zod-form';
import { documentStageLabel } from '~/lib/labels';
import {
  updateDocumentStageSchema,
  type UpdateDocumentStageSchema
} from '~/schemas/documents/update-document-stage-schema';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentStageSectionProps =
  React.HtmlHTMLAttributes<HTMLDivElement> & {
    document: DocumentDto;
  };

export function DocumentStageSection({
  document,
  ...others
}: DocumentStageSectionProps): React.JSX.Element {
  const methods = useZodForm({
    schema: updateDocumentStageSchema,
    mode: 'all',
    defaultValues: {
      id: document.id,
      stage: document.stage
    }
  });
  const onSubmit: SubmitHandler<UpdateDocumentStageSchema> = async (values) => {
    const result = await updateDocumentStage(values);
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Stage updated');
    } else {
      toast.error("Couldn't update stage");
    }
  };
  return (
    <Form {...methods}>
      <section {...others}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="flex h-14 flex-row items-center p-6">
            <h3 className="text-sm font-semibold tracking-tight">Stage</h3>
          </div>
          <div className="p-6 pt-0">
            <FormField
              name="stage"
              control={methods.control}
              render={({ field }) => (
                <FormItem className="flex w-full flex-col">
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value !== field.value) {
                          field.onChange(value);
                          onSubmit(methods.getValues());
                        }
                      }}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(DocumentStage).map(
                          (value: DocumentStage) => (
                            <SelectItem
                              key={value}
                              value={value}
                            >
                              <div className="flex flex-row items-center gap-2">
                                <div
                                  className={cn(
                                    'size-2.5 rounded-full border-2 bg-background',
                                    documentStageColor[value]
                                  )}
                                />
                                {documentStageLabel[value]}
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </section>
    </Form>
  );
}
