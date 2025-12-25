'use client';

import * as React from 'react';
import NiceModal from '@ebay/nice-modal-react';
import {
  IdCardIcon,
  LayoutListIcon,
  MailIcon,
  PhoneIcon,
  SquareDashedKanbanIcon,
  TrashIcon,
  UploadIcon
} from 'lucide-react';
import { Form, type SubmitHandler } from 'react-hook-form';

import { DocumentRecord } from '@workspace/database/schema';
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { Button } from '@workspace/ui/components/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@workspace/ui/components/form';
import { ImageDropzone } from '@workspace/ui/components/image-dropzone';
import { Input } from '@workspace/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@workspace/ui/components/select';
import { toast } from '@workspace/ui/components/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@workspace/ui/components/tooltip';
import { cn } from '@workspace/ui/lib/utils';

import { updateDocumentImage } from '~/actions/documents/update-document-image';
import { updateDocumentProperties } from '~/actions/documents/update-document-properties';
import { CropPhotoModal } from '~/components/organizations/slug/settings/account/profile/crop-photo-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import { FileUploadAction, MAX_IMAGE_SIZE } from '~/lib/file-upload';
import { documentRecordLabel } from '~/lib/labels';
import {
  updateDocumentPropertiesSchema,
  type UpdateDocumentPropertiesSchema
} from '~/schemas/documents/update-document-properties-schema';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentDetailsSectionProps =
  React.HtmlHTMLAttributes<HTMLDivElement> & {
    document: DocumentDto;
  };

export function DocumentDetailsSection({
  document,
  ...others
}: DocumentDetailsSectionProps): React.JSX.Element {
  return (
    <section {...others}>
      <DocumentImage {...document} />
      <Properties {...document} />
    </section>
  );
}

function DocumentImage(document: DocumentDto): React.JSX.Element {
  const handleDrop = async (files: File[]): Promise<void> => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(
          `Uploaded image shouldn't exceed ${MAX_IMAGE_SIZE / 1000000} MB size limit`
        );
      } else {
        const base64Image: string = await NiceModal.show(CropPhotoModal, {
          file,
          aspectRatio: 1,
          circularCrop: document.record === DocumentRecord.PERSON
        });
        if (base64Image) {
          const result = await updateDocumentImage({
            id: document.id,
            action: FileUploadAction.Update,
            image: base64Image
          });
          if (!result?.serverError && !result?.validationErrors) {
            toast.success('Image updated');
          } else {
            toast.error("Couldn't update image");
          }
        }
      }
    }
  };
  const handleRemoveImage = async (): Promise<void> => {
    const result = await updateDocumentImage({
      id: document.id,
      action: FileUploadAction.Delete,
      image: undefined
    });
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Image removed');
    } else {
      toast.error("Couldn't remove image");
    }
  };
  return (
    <div className="flex items-center justify-center p-6">
      <div className="relative">
        <ImageDropzone
          accept={{ 'image/*': [] }}
          multiple={false}
          onDrop={handleDrop}
          borderRadius={
            document.record === DocumentRecord.PERSON ? 'full' : 'md'
          }
          src={document.image}
          className="max-h-[120px] min-h-[120px] w-[120px] p-0.5"
        >
          <Avatar
            className={cn(
              'size-28',
              document.record === DocumentRecord.PERSON
                ? 'rounded-full'
                : 'rounded-md'
            )}
          >
            <AvatarFallback
              className={cn(
                'size-28 text-2xl',
                document.record === DocumentRecord.PERSON
                  ? 'rounded-full'
                  : 'rounded-md'
              )}
            >
              <UploadIcon className="size-5 shrink-0 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        </ImageDropzone>
        {document.image && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -bottom-1 -right-1 z-10 size-8 rounded-full bg-background"
                onClick={handleRemoveImage}
              >
                <TrashIcon className="size-4 shrink-0" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Remove image</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function Properties(document: DocumentDto): React.JSX.Element {
  const [editMode, setEditMode] = React.useState<boolean>(false);
  const methods = useZodForm({
    schema: updateDocumentPropertiesSchema,
    mode: 'onSubmit',
    defaultValues: {
      id: document.id,
      record: document.record,
      name: document.name,
      email: document.email,
      phone: document.phone,
      address: document.address
    }
  });
  const canSubmit = !methods.formState.isSubmitting;
  const handleEnableEditMode = async (): Promise<void> => {
    setEditMode(true);
  };
  const handleCancel = async (): Promise<void> => {
    methods.reset(methods.formState.defaultValues);
    setEditMode(false);
  };
  const onSubmit: SubmitHandler<UpdateDocumentPropertiesSchema> = async (
    values
  ) => {
    if (!canSubmit) {
      return;
    }
    const result = await updateDocumentProperties(values);
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Properties updated');
      setEditMode(false);
    } else {
      toast.error("Couldn't update properties");
    }
  };
  return (
    <Form {...methods}>
      <form
        className="space-y-2 px-6 pb-6"
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Properties</h3>
          {editMode ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-success hover:text-success min-w-fit"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-success hover:text-success min-w-fit"
                disabled={!canSubmit}
                onClick={methods.handleSubmit(onSubmit)}
              >
                Save
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-success hover:text-success min-w-fit"
              disabled={methods.formState.isSubmitting}
              onClick={handleEnableEditMode}
            >
              Edit
            </Button>
          )}
        </div>
        <dl className="space-y-1 text-sm">
          <Property
            icon={<SquareDashedKanbanIcon className="size-3 shrink-0" />}
            term="Record"
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name="record"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col">
                      <FormControl>
                        <Select
                          required
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={methods.formState.isSubmitting}
                        >
                          <SelectTrigger className="h-7! w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(DocumentRecord).map((value) => (
                              <SelectItem
                                key={value}
                                value={value}
                              >
                                {documentRecordLabel[value as DocumentRecord]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                documentRecordLabel[document.record]
              )
            }
            placeholder="No type available"
          />
          <Property
            icon={<IdCardIcon className="size-3 shrink-0" />}
            term="Name"
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col">
                      <FormControl>
                        <Input
                          type="text"
                          maxLength={70}
                          required
                          className="h-7"
                          disabled={methods.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                document.name
              )
            }
            placeholder="No name available"
          />
          <Property
            icon={<MailIcon className="size-3 shrink-0" />}
            term="Email"
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col">
                      <FormControl>
                        <Input
                          type="email"
                          maxLength={255}
                          required
                          className="h-7"
                          disabled={methods.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                document.email
              )
            }
            placeholder="No email available"
          />
          <Property
            icon={<PhoneIcon className="size-3 shrink-0" />}
            term="Phone"
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col">
                      <FormControl>
                        <Input
                          type="tel"
                          maxLength={70}
                          required
                          className="h-7"
                          disabled={methods.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                document.phone
              )
            }
            placeholder="No phone available"
          />
          <Property
            icon={<LayoutListIcon className="size-3 shrink-0" />}
            term="Address"
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col">
                      <FormControl>
                        <Input
                          type="text"
                          maxLength={255}
                          required
                          className="h-7"
                          disabled={methods.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                document.address
              )
            }
            placeholder="No address available"
          />
        </dl>
      </form>
    </Form>
  );
}

type PropertyProps = {
  icon: React.ReactNode;
  term: string;
  details?: React.ReactNode;
  placeholder: string;
};

function Property({
  icon,
  term,
  details,
  placeholder
}: PropertyProps): React.JSX.Element {
  return (
    <div className="flex h-7 flex-row items-center whitespace-nowrap">
      <dt className="flex h-7 min-w-24 flex-row items-center gap-2 text-muted-foreground">
        {icon}
        {term}
      </dt>
      <dd className="flex h-7 w-full max-w-[196px] flex-row items-center overflow-hidden text-ellipsis">
        {details ? (
          details
        ) : (
          <p className="text-muted-foreground opacity-65">{placeholder}</p>
        )}
      </dd>
    </div>
  );
}
