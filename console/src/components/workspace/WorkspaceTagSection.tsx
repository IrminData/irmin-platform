'use client';

import { useCallback } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { TbArrowLeft, TbPencil, TbTrash } from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useWorkspaceTag, useWorkspaceTags } from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import type { Tag } from '@/types/core/Tag';

import { WorkspaceTagModal } from './WorkspaceTagModal';

/**
 * Workspace tag section
 *
 * This component displays the details of a specific tag, including its properties
 * and all related assets. It allows editing and deletion of the tag, and provides
 * a back button for navigation.
 */
const WorkspaceTagSection = ({ tagId }: { tagId: string }) => {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const router = useRouter();

  const { workspaceTagQuery } = useWorkspaceTag(tagId);
  const { updateWorkspaceTagMutation, deleteWorkspaceTagMutation } =
    useWorkspaceTags(workspaceSlug);

  const { isResourceAllowed } = useResourceAllowed();

  const tag = workspaceTagQuery.data?.data?.tag;
  const assets = workspaceTagQuery.data?.data?.assets;

  const handleEditTag = useCallback(
    async (updatedTag: Tag) => {
      await updateWorkspaceTagMutation.mutateAsync(updatedTag);
      irminModal.close();
    },
    [updateWorkspaceTagMutation, irminModal]
  );

  const handleDeleteTag = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      dict.common.areYouSureYouWantToDelete
    );

    if (confirmed && tag) {
      deleteWorkspaceTagMutation.mutate(tag.id, {
        onSuccess: () => {
          router.push('../');
        },
      });
    }
  }, [
    irminConfirm,
    deleteWorkspaceTagMutation,
    dict.common.areYouSureYouWantToDelete,
    tag,
    router,
  ]);

  const openEditModal = useCallback(() => {
    if (!tag) return;

    irminModal.show(
      dict.common.edit,
      <WorkspaceTagModal
        initialTag={tag}
        onSubmit={handleEditTag}
        onCancel={irminModal.close}
      />
    );
  }, [irminModal, dict.common.edit, handleEditTag, tag]);

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const handleBack = useCallback(() => {
    router.push(`${workspaceUrl}/settings/tags`);
  }, [router, workspaceUrl]);

  if (workspaceTagQuery.isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  if (workspaceTagQuery.isError) {
    return (
      <ContentWrapper wrapperClassName='max-w-7xl py-4'>
        <QueryError
          error={workspaceTagQuery.error}
          onRetry={() => workspaceTagQuery.refetch()}
          title={dict.common.errors.failedToLoadTag}
          description={dict.common.errors.failedToLoadAgain}
        />
      </ContentWrapper>
    );
  }

  if (!tag) {
    return (
      <ContentWrapper wrapperClassName='max-w-7xl py-4'>
        <LocalizedErrorDisplay
          variant='section'
          showHome={true}
          title={dict.common.errors.tagNotFound}
          description={dict.common.errors.tagNotFoundDescription}
        />
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper wrapperClassName='max-w-7xl py-4'>
      {/* Header with back button and actions */}
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <ButtonWithTooltip
            variant='secondary'
            icon={<TbArrowLeft size={16} />}
            tooltip={dict.common.back}
            onClick={handleBack}
          >
            {dict.common.back}
          </ButtonWithTooltip>
          <div className='flex items-center gap-2'>
            <div
              className='size-8 rounded-full border border-gray-300'
              style={{ backgroundColor: tag.color }}
            />
            <h1 className='text-xl font-medium'>{tag.name}</h1>
          </div>
        </div>

        <div className='flex gap-2'>
          <ButtonWithTooltip
            variant='secondary'
            icon={<TbPencil size={16} />}
            tooltip={dict.common.edit}
            onClick={openEditModal}
            disabled={!isResourceAllowed('workspace_tag', 'update', tag.id)}
            loading={updateWorkspaceTagMutation.isPending}
          >
            {dict.common.edit}
          </ButtonWithTooltip>
          <ButtonWithTooltip
            variant='secondary'
            icon={<TbTrash size={16} />}
            tooltip={dict.common.delete}
            onClick={handleDeleteTag}
            disabled={!isResourceAllowed('workspace_tag', 'delete', tag.id)}
            loading={deleteWorkspaceTagMutation.isPending}
          >
            {dict.common.delete}
          </ButtonWithTooltip>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        {/* Related assets */}
        {(assets?.queries && assets.queries.length > 0) ||
        (assets?.scripts && assets.scripts.length > 0) ||
        (assets?.repositories && assets.repositories.length > 0) ||
        (assets?.workflows && assets.workflows.length > 0) ||
        (assets?.connections && assets.connections.length > 0) ||
        (assets?.repository_objects && assets.repository_objects.length > 0) ? (
          <div className='space-y-6'>
            {/* Queries */}
            {assets?.queries && assets.queries.length > 0 && (
              <div>
                <h3
                  className={`
                    mb-3 pl-2 text-gray-700
                    dark:text-gray-300
                  `}
                >
                  {dict.consoleNavigation.queries} ({assets.queries.length})
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.common.name}</TableHead>
                      <TableHead>{dict.common.description}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.queries.map((query) => (
                      <TableRow key={query.id}>
                        <TableCell>
                          <Link
                            href={`${workspaceUrl}/queries?query=${query.id}`}
                            className={`
                              text-accent
                              hover:underline
                            `}
                          >
                            {query.name}
                          </Link>
                        </TableCell>
                        <TableCell>{query.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Scripts */}
            {assets?.scripts && assets.scripts.length > 0 && (
              <div>
                <h3
                  className={`
                    mb-3 pl-2 text-gray-700
                    dark:text-gray-300
                  `}
                >
                  {dict.consoleNavigation.scripts} ({assets.scripts.length})
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.common.name}</TableHead>
                      <TableHead>{dict.common.description}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.scripts.map((script) => (
                      <TableRow key={script.id}>
                        <TableCell>
                          <Link
                            href={`${workspaceUrl}/scripts?script=${script.id}`}
                            className={`
                              text-accent
                              hover:underline
                            `}
                          >
                            {script.name}
                          </Link>
                        </TableCell>
                        <TableCell>{script.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Repositories */}
            {assets?.repositories && assets.repositories.length > 0 && (
              <div>
                <h3
                  className={`
                    mb-3 pl-2 text-gray-700
                    dark:text-gray-300
                  `}
                >
                  {dict.repository.repositories} ({assets.repositories.length})
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.common.name}</TableHead>
                      <TableHead>{dict.common.description}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.repositories.map((repo) => (
                      <TableRow key={repo.id}>
                        <TableCell>
                          <Link
                            href={`${workspaceUrl}/repositories/${repo.slug}`}
                            className={`
                              text-accent
                              hover:underline
                            `}
                          >
                            {repo.name}
                          </Link>
                        </TableCell>
                        <TableCell>{repo.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Workflows */}
            {assets?.workflows && assets.workflows.length > 0 && (
              <div>
                <h3
                  className={`
                    mb-3 pl-2 text-gray-700
                    dark:text-gray-300
                  `}
                >
                  {dict.workflow.workflows} ({assets.workflows.length})
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.common.name}</TableHead>
                      <TableHead>{dict.common.description}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.workflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <Link
                            href={`${workspaceUrl}/workflows/${workflow.id}`}
                            className={`
                              text-accent
                              hover:underline
                            `}
                          >
                            {workflow.name}
                          </Link>
                        </TableCell>
                        <TableCell>{workflow.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Connections */}
            {assets?.connections && assets.connections.length > 0 && (
              <div>
                <h3
                  className={`
                    mb-3 pl-2 text-gray-700
                    dark:text-gray-300
                  `}
                >
                  {dict.connections.connections} ({assets.connections.length})
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.common.name}</TableHead>
                      <TableHead>{dict.connectors.connector}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.connections.map((connection) => (
                      <TableRow key={connection.id}>
                        <TableCell>
                          <Link
                            href={`${workspaceUrl}/connections/${connection.id}`}
                            className={`
                              text-accent
                              hover:underline
                            `}
                          >
                            {connection.name}
                          </Link>
                        </TableCell>
                        <TableCell>{connection.connector.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Repository Objects */}
            {assets?.repository_objects &&
              assets.repository_objects.length > 0 && (
                <div>
                  <h3
                    className={`
                      mb-3 pl-2 text-gray-700
                      dark:text-gray-300
                    `}
                  >
                    {dict.repository.objects.objects} (
                    {assets.repository_objects.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.common.name}</TableHead>
                        <TableHead>{dict.repository.objects.path}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.repository_objects.map((obj) => (
                        <TableRow key={obj.id}>
                          <TableCell>
                            <Link
                              href={`${workspaceUrl}/repositories/${obj.repository_slug}?path=${encodeURIComponent(obj.path)}&ref=${encodeURIComponent(obj.ref)}`}
                              className={`
                                text-accent
                                hover:underline
                              `}
                            >
                              {obj.name}
                            </Link>
                          </TableCell>
                          <TableCell>{obj.path}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
          </div>
        ) : (
          <p
            className={`
              py-12 text-center text-2xl text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.list.noItemsFound}
          </p>
        )}
      </div>
    </ContentWrapper>
  );
};

export default WorkspaceTagSection;
