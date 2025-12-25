'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { replaceOrgSlug, routes } from '@workspace/routes';
import { buttonVariants } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';

import { DocumentAvatar } from '~/components/organizations/slug/documents/details/document-avatar';
import { useActiveOrganization } from '~/hooks/use-active-organization';
import type { VisitedDocumentDto } from '~/types/dtos/visited-document-dto';

export type VisitedDocumentListProps = React.HTMLAttributes<HTMLDivElement> & {
  documents: VisitedDocumentDto[];
};

export function VisitedDocumentList({
  documents,
  className,
  ...other
}: VisitedDocumentListProps): React.JSX.Element {
  return (
    <div
      className={cn('flex flex-col space-y-1', className)}
      {...other}
    >
      {documents.map((document) => (
        <VisitedDocumentListItem
          key={document.id}
          document={document}
        />
      ))}
    </div>
  );
}

type VisitedDocumentListItemProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  document: VisitedDocumentDto;
};

function VisitedDocumentListItem({
  document,
  className,
  ...other
}: VisitedDocumentListItemProps): React.JSX.Element {
  const activeOrganization = useActiveOrganization();
  return (
    <Link
      href={`${replaceOrgSlug(routes.dashboard.organizations.slug.Documents, activeOrganization.slug)}/${document.id}`}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'default' }),
        'group w-full items-center justify-between px-3',
        className
      )}
      {...other}
    >
      <div className="flex flex-row items-center gap-2">
        <DocumentAvatar
          record={document.record}
          src={document.image}
        />
        <span className="text-sm font-normal">{document.name}</span>
      </div>
      <span className="group-hover:hidden">{document.pageVisits}</span>
      <ArrowRightIcon className="hidden size-4 shrink-0 group-hover:inline" />
    </Link>
  );
}
