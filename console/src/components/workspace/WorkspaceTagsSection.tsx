'use client';

import { useCallback, useState } from 'react';

import { TbPencil, TbPlus, TbTrash } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import { QueryError } from '@/components/ui/error/QueryError';
import { TableSkeleton } from '@/components/ui/loading/TableSkeleton';
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

import { useWorkspaceTags } from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import type { Tag } from '@/types/core/Tag';

import { WorkspaceTagModal } from './WorkspaceTagModal';

/**
 * Workspace tags section
 *
 * This component is used to display the list of tags in the workspace.
 * It allows one to create, edit, and delete tags in the workspace.
 */
const WorkspaceTagsSection = () => {
  const { dict } = useLocale();
  const { irminModal, irminConfirm } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const {
    workspaceTagsQuery,
    createWorkspaceTagMutation,
    updateWorkspaceTagMutation,
    deleteWorkspaceTagMutation,
  } = useWorkspaceTags(workspaceSlug);

  const { isResourceAllowed } = useResourceAllowed();

  const [updatingTag, setUpdatingTag] = useState<string | null>(null);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);

  const handleCreateTag = useCallback(
    async (tag: Tag) => {
      await createWorkspaceTagMutation.mutateAsync(tag);
      irminModal.close();
    },
    [createWorkspaceTagMutation, irminModal]
  );

  const handleEditTag = useCallback(
    async (tag: Tag) => {
      setUpdatingTag(tag.id);
      await updateWorkspaceTagMutation.mutateAsync(tag);
      irminModal.close();
      setUpdatingTag(null);
    },
    [updateWorkspaceTagMutation, irminModal]
  );

  const handleDeleteTag = useCallback(
    async (tagId: string) => {
      const confirmed = await irminConfirm(
        'warning',
        dict.common.areYouSureYouWantToDelete
      );

      if (confirmed) {
        setDeletingTag(tagId);
        await deleteWorkspaceTagMutation.mutateAsync(tagId);
        setDeletingTag(null);
      }
    },
    [
      irminConfirm,
      deleteWorkspaceTagMutation,
      dict.common.areYouSureYouWantToDelete,
    ]
  );

  const openCreateModal = useCallback(() => {
    irminModal.show(
      dict.common.create,
      <WorkspaceTagModal
        onSubmit={handleCreateTag}
        onCancel={irminModal.close}
      />
    );
  }, [irminModal, dict.common.create, handleCreateTag]);

  const openEditModal = useCallback(
    (tag: Tag) => {
      irminModal.show(
        dict.common.edit,
        <WorkspaceTagModal
          initialTag={tag}
          onSubmit={handleEditTag}
          onCancel={irminModal.close}
        />
      );
    },
    [irminModal, dict.common.edit, handleEditTag]
  );

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  if (workspaceTagsQuery.isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <div className='flex items-center justify-end px-4'>
          <div
            className={`
              h-10 w-28 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>
        <ContentWrapper>
          <TableSkeleton rows={5} columns={3} />
        </ContentWrapper>
      </div>
    );
  }

  if (workspaceTagsQuery.error) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <ContentWrapper>
          <QueryError
            error={workspaceTagsQuery.error}
            onRetry={() => workspaceTagsQuery.refetch()}
            title={dict.workspace.failedToLoadTags}
          />
        </ContentWrapper>
      </div>
    );
  }

  return (
    <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
      <div className='flex items-center justify-end px-4'>
        <ButtonWithTooltip
          size='lg'
          icon={<TbPlus size={16} />}
          tooltip={dict.common.create}
          variant='default'
          onClick={openCreateModal}
          disabled={!isResourceAllowed('workspace_tag', 'create')}
          loading={createWorkspaceTagMutation.isPending}
          className='w-28'
        >
          {dict.common.create}
        </ButtonWithTooltip>
      </div>
      <ContentWrapper>
        <Table className='min-w-full'>
          <TableHeader>
            <TableRow
              className={`
                border-b
                dark:border-gray-800
              `}
            >
              <TableHead
                className={`
                  px-4 py-2 text-left text-xs font-normal
                  md:text-sm
                `}
              >
                {dict.common.name}
              </TableHead>
              <TableHead
                className={`
                  hidden p-2 text-left text-sm font-normal
                  md:table-cell
                `}
              >
                {dict.common.description}
              </TableHead>
              <TableHead
                className={`
                  px-4 py-2 text-center text-xs font-normal
                  md:text-right md:text-sm
                `}
              >
                {dict.common.actions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaceTagsQuery.data?.data?.map((tag) => (
              <TableRow
                key={`workspace-tag-${tag.id}`}
                className={`
                  h-14 border-b
                  dark:border-gray-800
                `}
              >
                <TableCell
                  className={`
                    px-4 py-2 text-sm text-gray-700
                    dark:text-gray-400
                  `}
                >
                  <div className='flex items-center gap-2'>
                    <div
                      className='size-8 rounded-full border border-gray-300'
                      style={{ backgroundColor: tag.color }}
                    />
                    <p className='text-base font-medium'>{tag.name}</p>
                  </div>
                  {/* Mobile screen details */}
                  <span
                    className={`
                      block text-xs opacity-70
                      md:hidden
                    `}
                  >
                    {tag.description}
                  </span>
                </TableCell>
                <TableCell
                  className={`
                    hidden p-2 text-sm text-gray-700
                    md:table-cell
                    dark:text-gray-400
                  `}
                >
                  {tag.description}
                </TableCell>
                <TableCell className='px-4 py-2 text-right'>
                  <div
                    className={`
                      flex w-full flex-row justify-end gap-2 align-middle
                    `}
                  >
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      aria-label={dict.common.edit}
                      onClick={() => openEditModal(tag)}
                      icon={<TbPencil size={14} />}
                      tooltip={dict.common.edit}
                      disabled={
                        !isResourceAllowed('workspace_tag', 'update', tag.id)
                      }
                      loading={
                        updatingTag === tag.id &&
                        updateWorkspaceTagMutation.isPending
                      }
                    />
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      aria-label={dict.common.delete}
                      onClick={() => handleDeleteTag(tag.id)}
                      icon={<TbTrash size={14} />}
                      tooltip={dict.common.delete}
                      disabled={
                        !isResourceAllowed('workspace_tag', 'delete', tag.id)
                      }
                      loading={
                        deletingTag === tag.id &&
                        deleteWorkspaceTagMutation.isPending
                      }
                    />
                    <Button
                      variant='secondary'
                      size='sm'
                      className='w-20'
                      aria-label={dict.common.view}
                      href={`${workspaceUrl}/settings/tags/${tag.id}`}
                    >
                      {dict.common.view}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ContentWrapper>
    </div>
  );
};

export default WorkspaceTagsSection;
