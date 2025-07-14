'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { TbPlus, TbSearch, TbTag } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import TagBadge from '@/components/ui/TagBadge';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useWorkspaceTags } from '@/hooks/useWorkspaceTags';

import type { Tag } from '@/types/core/Tag';

import { WorkspaceTagModal } from './WorkspaceTagModal';

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => Promise<Tag[]>;
  loading: boolean;
  disabled: boolean;
}

export function WorkspaceTagSelector({
  selectedTags,
  onTagsChange,
  loading,
  disabled,
}: TagSelectorProps) {
  const { dict } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { workspaceTagsQuery, createWorkspaceTagMutation } = useWorkspaceTags();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const filteredTags = useMemo(
    () =>
      workspaceTagsQuery.data?.data?.filter(
        (tag) =>
          !selectedTags.some((selectedTag) => selectedTag.id === tag.id) &&
          tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [workspaceTagsQuery.data?.data, selectedTags, searchQuery]
  );

  const handleSelectTag = useCallback(
    async (tag: Tag) => {
      await onTagsChange([...selectedTags, tag]);
      setSearchQuery('');
    },
    [onTagsChange, selectedTags]
  );

  const handleCreateTag = useCallback(
    async (newTag: Tag) => {
      const tagCreateResult =
        await createWorkspaceTagMutation.mutateAsync(newTag);
      if (tagCreateResult.data) {
        await onTagsChange([...selectedTags, tagCreateResult.data]);
      }
      setShowCreateTag(false);
      setOpen(false);
      setSearchQuery('');
    },
    [createWorkspaceTagMutation, onTagsChange, selectedTags]
  );

  const handleRemoveTag = useCallback(
    async (tagToRemove: Tag) => {
      await onTagsChange(
        selectedTags.filter((tag) => tag.id !== tagToRemove.id)
      );
    },
    [onTagsChange, selectedTags]
  );

  const handleGoToTag = useCallback(
    (tag: Tag) => {
      router.push(`${workspaceUrl}/settings/tags/${tag.id}`);
    },
    [router, workspaceUrl]
  );

  return (
    <div className='flex flex-row items-center gap-2'>
      {/* Selected Tags Display */}
      <div
        className={`
          flex w-full flex-wrap gap-2 rounded-lg border border-border
          bg-background p-3
        `}
      >
        {selectedTags.length === 0 ? (
          <div className='flex items-center text-sm text-muted-foreground'>
            <TbTag className='mr-2 size-4' />
            {dict.workspace.tags}
          </div>
        ) : (
          selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              size='sm'
              onClick={() => handleGoToTag(tag)}
              showDelete
              onDelete={() => handleRemoveTag(tag)}
            />
          ))
        )}
      </div>

      {/* Add Tags Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='gray'
            disabled={loading || disabled}
            icon={<TbPlus />}
          >
            {dict.workspace.addTags}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-80 p-0' align='start'>
          {showCreateTag ? (
            <div className='p-4'>
              <WorkspaceTagModal
                onSubmit={handleCreateTag}
                onCancel={() => setShowCreateTag(false)}
              />
            </div>
          ) : (
            <div className='p-2'>
              {/* Search Input */}
              <div className='relative mb-2'>
                <TbSearch
                  className={`
                    absolute top-1/2 left-3 size-4 -translate-y-1/2 transform
                    text-muted-foreground
                  `}
                />
                <Input
                  placeholder={dict.common.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='h-9 pl-9'
                />
              </div>

              {/* Available Tags */}
              <div className='max-h-48 overflow-y-auto'>
                {filteredTags && filteredTags.length > 0 ? (
                  <div className='space-y-1'>
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        disabled={loading || disabled}
                        onClick={() => handleSelectTag(tag)}
                        className={`
                          flex w-full items-center gap-2 rounded-md p-2
                          text-left transition-colors
                          hover:bg-accent
                        `}
                      >
                        <div
                          className='size-3 shrink-0 rounded-full'
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className='text-sm'>{tag.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`py-4 text-center text-sm text-muted-foreground`}
                  >
                    {dict.list.noItemsFound}
                  </div>
                )}
              </div>

              {/* Create New Tag Button */}
              <div className='mt-2 border-t border-border pt-2'>
                <button
                  disabled={loading || disabled}
                  onClick={() => setShowCreateTag(true)}
                  className={`
                    flex w-full items-center gap-2 rounded-md p-2 text-left
                    text-sm transition-colors
                    hover:bg-accent
                  `}
                >
                  <TbPlus className='size-4' />
                  {dict.common.create}
                </button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
