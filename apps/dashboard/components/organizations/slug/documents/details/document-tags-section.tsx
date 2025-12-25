'use client';

import * as React from 'react';
import { type SubmitHandler } from 'react-hook-form';

import {
  Form,
  FormControl,
  FormField,
  FormItem
} from '@workspace/ui/components/form';
import { toast } from '@workspace/ui/components/sonner';
import { TagInput } from '@workspace/ui/components/tag-input';

import { updateDocumentTags } from '~/actions/documents/update-document-tags';
import { useZodForm } from '~/hooks/use-zod-form';
import {
  UpdateDocumentTagsSchema,
  updateDocumentTagsSchema
} from '~/schemas/documents/update-document-tags-schema';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentTagsSectionProps =
  React.HtmlHTMLAttributes<HTMLDivElement> & {
    document: DocumentDto;
  };

export function DocumentTagsSection({
  document,
  ...other
}: DocumentTagsSectionProps): React.JSX.Element {
  const methods = useZodForm({
    schema: updateDocumentTagsSchema,
    mode: 'all',
    defaultValues: {
      id: document.id,
      tags: document.tags
    }
  });
  const onSubmit: SubmitHandler<UpdateDocumentTagsSchema> = async (values) => {
    const result = await updateDocumentTags(values);
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Tags updated');
    } else {
      toast.error("Couldn't update tags");
    }
  };
  return (
    <Form {...methods}>
      <section {...other}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="flex h-14 flex-row items-center p-6">
            <h3 className="text-sm font-semibold tracking-tight">Tags</h3>
          </div>
          <div className="p-6 pt-0">
            <FormField
              name="tags"
              control={methods.control}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-4">
                  <FormControl>
                    <TagInput
                      {...field}
                      allowDuplicates={false}
                      placeholder="Type your tag and press enter"
                      tags={field.value ?? []}
                      onTagsChange={(values) => {
                        field.onChange(values);
                        onSubmit(methods.getValues());
                      }}
                      size="sm"
                      variant="default"
                      shape="rounded"
                      borderStyle="default"
                      textCase={null}
                      textStyle="normal"
                      animation="fadeIn"
                      direction="row"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </form>
      </section>
    </Form>
  );
}
