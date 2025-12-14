'use client';

import { useCallback, useMemo } from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { Branch } from '@/types/core/Branch';
import type { GitTag } from '@/types/core/GitTag';

import CustomRefModalContent from './CustomRefModalContent';

const CUSTOM_REF_OPTION = '__custom_ref__';

interface RefOption {
  label: string;
  value: string;
  type: 'branch' | 'tag' | 'custom';
}

/**
 * Ref selector component for selecting branches, tags, or custom refs in a repository
 *
 * @param props0 - RefSelector props
 * @param props0.branches - List of branches to display
 * @param props0.tags - List of tags to display
 * @param props0.loading - (optional) Whether the refs are loading
 * @param props0.label - (optional) Label for the ref selector
 * @param props0.currentRef - (optional) The currently selected ref
 * @param props0.onSelect - (optional) Callback when ref is changed
 * @param props0.id - (optional) Unique ID for the ref selector element
 *
 * @returns RefSelector component UI
 */
export default function RefSelector({
  branches,
  tags,
  loading,
  label,
  currentRef,
  onSelect,
  id,
}: {
  branches: Branch[];
  tags: GitTag[];
  loading?: boolean;
  label?: string;
  currentRef?: string;
  onSelect?: (ref: { label: string; value: string }) => void;
  id?: string;
}) {
  const { dict } = useLocale();
  const { irminModal } = usePopup();

  // Convert branches and tags to options
  const branchOptions: RefOption[] = useMemo(
    () =>
      branches.map((branch) => ({
        label: branch.name,
        value: branch.name,
        type: 'branch' as const,
      })),
    [branches]
  );

  const tagOptions: RefOption[] = useMemo(
    () =>
      tags.map((tag) => ({
        label: tag.name,
        value: tag.name,
        type: 'tag' as const,
      })),
    [tags]
  );

  // Find the currently selected ref and determine its display label
  const selectedRef = useMemo(() => {
    const branchMatch = branchOptions.find(
      (option) => option.value === currentRef
    );
    if (branchMatch) return branchMatch;

    const tagMatch = tagOptions.find((option) => option.value === currentRef);
    if (tagMatch) return tagMatch;

    // If it's a custom ref (not in branches or tags), display it as is
    if (currentRef) {
      return {
        label: currentRef,
        value: currentRef,
        type: 'custom' as const,
      };
    }

    return undefined;
  }, [currentRef, branchOptions, tagOptions]);

  /**
   * Handle showing the custom ref modal
   */
  const handleShowCustomRefModal = useCallback(() => {
    irminModal.show(
      dict.repository.compare.customRef,
      <CustomRefModalContent
        onSubmit={(customRef) => {
          if (onSelect) {
            onSelect({ label: customRef, value: customRef });
          }
          irminModal.close();
        }}
        onCancel={() => {
          irminModal.close();
        }}
      />
    );
  }, [dict, irminModal, onSelect]);

  /**
   * Handle value change from select
   */
  const handleValueChange = useCallback(
    (value: string) => {
      const allOptions = [...branchOptions, ...tagOptions];
      const selectedOption = allOptions.find(
        (option) => option.value === value
      );

      // Only treat as custom ref modal trigger if it matches CUSTOM_REF_OPTION
      // AND is not an actual branch/tag name
      if (value === CUSTOM_REF_OPTION && !selectedOption) {
        handleShowCustomRefModal();
        return;
      }

      if (selectedOption && onSelect) {
        onSelect({ label: selectedOption.label, value: selectedOption.value });
      }
    },
    [branchOptions, tagOptions, onSelect, handleShowCustomRefModal]
  );

  // Use currentRef as value if it exists in dropdown options, otherwise use empty string
  // to keep the Select controlled
  const selectValue = useMemo(() => {
    if (!currentRef) return '';

    // Check if currentRef exists in branches or tags
    const existsInOptions =
      branchOptions.some((option) => option.value === currentRef) ||
      tagOptions.some((option) => option.value === currentRef);

    return existsInOptions ? currentRef : '';
  }, [currentRef, branchOptions, tagOptions]);

  return (
    <div className='relative flex w-full min-w-max flex-col' id={id ?? 'ref-selector'}>
      <span
        className={`
          absolute -top-2 z-10 w-full pr-12 pl-2 text-xs text-gray-800
          dark:text-gray-400
        `}
      >
        {label ?? dict.repository.compare.baseBranch}
      </span>
      <Select
        disabled={loading}
        value={selectValue}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder={dict.repository.branches.branches}>
            {selectedRef?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {branchOptions.length > 0 && (
            <SelectGroup>
              <SelectLabel>{dict.repository.branches.branches}</SelectLabel>
              {branchOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {tagOptions.length > 0 && (
            <SelectGroup>
              <SelectLabel>{dict.repository.tags.tags}</SelectLabel>
              {tagOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          <SelectGroup>
            <SelectLabel>{dict.repository.compare.customRef}</SelectLabel>
            <SelectItem value={CUSTOM_REF_OPTION}>
              {dict.repository.compare.enterCustomRef}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
