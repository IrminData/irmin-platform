'use client';

import { useState } from 'react';

import Link from 'next/link';

import { BsChevronDown, BsChevronUp, BsPerson, BsTag } from 'react-icons/bs';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Repository } from '@/types/core/Repository';

import MDXViewer from './MDXViewer';
import RepositoryDocumentationDetails from './RepositoryDocumentationDetails';
import { ownerSummary, renderTags } from './utils';

interface RepositoryDocumentationCardProps {
  /** The repository to display */
  repository: Repository;
  /** Number of workflows referencing this repository (for schema page) */
  workflowUsageCount?: number;
  /** Whether to show documentation notes */
  showNotes?: boolean;
  /** Related workflows to display as links */
  relatedWorkflows?: { id: string; name: string; type: string }[];
  /** Related AI Applications to display as links */
  relatedAIApplications?: { id: string; name: string }[];
}

/**
 * Reusable repository documentation card with expandable details section.
 * Shows basic info always visible; branches, git tags, and schema objects are
 * lazy-loaded when the user expands the details section.
 */
export default function RepositoryDocumentationCard({
  repository,
  workflowUsageCount,
  showNotes,
  relatedWorkflows,
  relatedAIApplications,
}: RepositoryDocumentationCardProps) {
  const { locale, dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const [isOpen, setIsOpen] = useState(false);

  const owner = ownerSummary(repository.owner);
  const tags = renderTags(repository.tags);
  const repoHref = `/${locale}/workspace/${workspaceSlug}/repositories/${repository.slug}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link href={repoHref} className='hover:underline'>
            {repository.name}
          </Link>
        </CardTitle>
        {repository.description && (
          <CardDescription>{repository.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <dl className='space-y-3 text-sm'>
          {owner && (
            <div className='flex flex-col gap-1'>
              <dt className='flex items-center gap-2 text-muted-foreground'>
                <BsPerson className='size-4' />
                {dict.common.owner}
              </dt>
              <dd className='text-foreground'>
                {owner.name}
                {owner.email ? ` • ${owner.email}` : ''}
              </dd>
            </div>
          )}
          <div className='flex flex-col gap-1'>
            <dt className='text-muted-foreground'>
              {dict.catalog.defaultBranch}
            </dt>
            <dd>
              <Badge variant='secondary'>{repository.default_branch}</Badge>
            </dd>
          </div>
          <div className='flex flex-col gap-1'>
            <dt className='text-muted-foreground'>
              {dict.catalog.visibilityLabel}
            </dt>
            <dd>
              <StatusBadge
                status='private'
                label={dict.catalog.visibilityPrivate}
              />
            </dd>
          </div>
          {tags && (
            <div className='flex flex-col gap-1'>
              <dt className='flex items-center gap-2 text-muted-foreground'>
                <BsTag className='size-4' />
                {dict.repository.tags.tags}
              </dt>
              <dd className='flex flex-wrap gap-2'>{tags}</dd>
            </div>
          )}
          {relatedWorkflows && relatedWorkflows.length > 0 && (
            <div className='flex flex-col gap-1'>
              <dt className='text-muted-foreground'>
                {dict.catalog.relatedWorkflows}
              </dt>
              <dd className='flex flex-wrap gap-2'>
                {relatedWorkflows.map((wf) => (
                  <Link
                    key={wf.id}
                    href={`/${locale}/workspace/${workspaceSlug}/workflows/${wf.id}`}
                    className='hover:underline'
                  >
                    <Badge variant='outline'>{wf.name}</Badge>
                  </Link>
                ))}
              </dd>
            </div>
          )}
          {relatedAIApplications && relatedAIApplications.length > 0 && (
            <div className='flex flex-col gap-1'>
              <dt className='text-muted-foreground'>
                {dict.catalog.relatedAIApplications}
              </dt>
              <dd className='flex flex-wrap gap-2'>
                {relatedAIApplications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/${locale}/workspace/${workspaceSlug}/ai-applications/${app.id}`}
                    className='hover:underline'
                  >
                    <Badge variant='outline'>{app.name}</Badge>
                  </Link>
                ))}
              </dd>
            </div>
          )}
          {typeof workflowUsageCount === 'number' && (
            <div className='flex flex-col gap-1'>
              <dt className='text-muted-foreground'>
                {dict.catalog.referencedBy}
              </dt>
              <dd>
                {workflowUsageCount}{' '}
                {(workflowUsageCount === 1
                  ? dict.workflow.workflow
                  : dict.workflow.workflows
                ).toLocaleLowerCase(locale)}
              </dd>
            </div>
          )}
        </dl>

        {showNotes &&
          repository.documentation &&
          repository.documentation.length > 0 && (
            <div className='mt-4 space-y-4 border-t pt-4'>
              <h4 className='text-sm text-muted-foreground'>
                {dict.catalog.notesHeading}
              </h4>
              <MDXViewer content={repository.documentation} />
            </div>
          )}

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='mt-4 w-full justify-between'
            >
              {isOpen
                ? dict.catalog.collapseDetails
                : dict.catalog.expandDetails}
              {isOpen ? (
                <BsChevronUp className='size-4' />
              ) : (
                <BsChevronDown className='size-4' />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {isOpen && (
              <RepositoryDocumentationDetails
                repositorySlug={repository.slug}
                defaultBranch={repository.default_branch}
              />
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
