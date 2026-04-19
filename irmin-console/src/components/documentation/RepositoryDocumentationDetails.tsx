'use client';

import Link from 'next/link';

import { TbDatabase, TbFile, TbFolder } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useRepositoryBranches } from '@/hooks/api/useRepositoryBranches';
import { useRepositoryObjectSchema } from '@/hooks/api/useRepositoryObjectSchema';
import { useRepositoryTags } from '@/hooks/api/useRepositoryTags';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

const MAX_OBJECTS = 10;

const OBJECT_ICON: Record<string, typeof TbFile> = {
  group: TbFolder,
  structured: TbDatabase,
  binary: TbFile,
};

interface RepositoryDocumentationDetailsProps {
  /** Slug of the repository */
  repositorySlug: string;
  /** Default branch name */
  defaultBranch: string;
}

/**
 * Inner component that fetches and displays branches, git tags, and schema objects.
 * Mounted only when the user expands the collapsible section of RepositoryDocumentationCard.
 */
export default function RepositoryDocumentationDetails({
  repositorySlug,
  defaultBranch,
}: RepositoryDocumentationDetailsProps) {
  const { locale, dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const { repositoryBranchesQuery } = useRepositoryBranches(repositorySlug);
  const { repositoryTagsQuery } = useRepositoryTags(repositorySlug);
  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    repositorySlug,
    defaultBranch,
    ''
  );

  const branches = repositoryBranchesQuery.data?.data ?? [];
  const gitTags = repositoryTagsQuery.data?.data ?? [];
  const objects: ObjectSchema[] =
    repositoryObjectSchemaQuery.data?.data?.children ?? [];

  const isLoading =
    repositoryBranchesQuery.isLoading ||
    repositoryTagsQuery.isLoading ||
    repositoryObjectSchemaQuery.isLoading;

  const repoBase = `/${locale}/workspace/${workspaceSlug}/repositories/${repositorySlug}`;

  if (isLoading) {
    return (
      <div className='mt-4 border-t pt-4'>
        <p className='animate-pulse text-sm text-muted-foreground'>
          {dict.catalog.loadingDetails}
        </p>
      </div>
    );
  }

  return (
    <div className='mt-4 space-y-4 border-t pt-4 text-sm'>
      {/* Branches */}
      <div className='space-y-2'>
        <h4 className='text-muted-foreground'>{dict.catalog.branches}</h4>
        {branches.length === 0 ? (
          <p className='text-xs text-muted-foreground'>
            {dict.catalog.noBranches}
          </p>
        ) : (
          <ul className='flex flex-wrap gap-2'>
            {branches.map((branch) => (
              <li key={branch.name}>
                <Link
                  href={`${repoBase}?ref=${encodeURIComponent(branch.name)}`}
                >
                  <Badge
                    variant={
                      branch.name === defaultBranch ? 'default' : 'outline'
                    }
                  >
                    {branch.name}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Git Tags */}
      <div className='space-y-2'>
        <h4 className='text-muted-foreground'>{dict.catalog.gitTags}</h4>
        {gitTags.length === 0 ? (
          <p className='text-xs text-muted-foreground'>
            {dict.catalog.noGitTags}
          </p>
        ) : (
          <ul className='flex flex-wrap gap-2'>
            {gitTags.map((tag) => (
              <li key={tag.name}>
                <Badge variant='outline'>
                  {tag.name}
                  {tag.ref && (
                    <span className='ml-1 text-xs text-muted-foreground'>
                      ({tag.ref.slice(0, 8)})
                    </span>
                  )}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Schema Objects */}
      <div className='space-y-2'>
        <h4 className='text-muted-foreground'>{dict.catalog.schemaObjects}</h4>
        {objects.length === 0 ? (
          <p className='text-xs text-muted-foreground'>
            {dict.catalog.noObjects}
          </p>
        ) : (
          <>
            <ul className='space-y-1'>
              {objects.slice(0, MAX_OBJECTS).map((obj) => {
                const Icon = OBJECT_ICON[obj.type] ?? TbFile;
                return (
                  <li key={obj.path} className='flex items-center gap-2'>
                    <Icon className='size-4 text-muted-foreground' />
                    <span>{obj.name}</span>
                    {obj.content_type && (
                      <span className='text-xs text-muted-foreground'>
                        {obj.content_type}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {objects.length > MAX_OBJECTS && (
              <Link
                href={`${repoBase}/schema`}
                className='
                  text-xs text-muted-foreground
                  hover:underline
                '
              >
                {dict.catalog.andMoreObjects.replace(
                  '{count}',
                  String(objects.length - MAX_OBJECTS)
                )}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
