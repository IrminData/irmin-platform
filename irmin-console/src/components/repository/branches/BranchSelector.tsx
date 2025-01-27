'use client';

import { useMemo } from 'react';

import ReactSelect from 'react-select';

import { useLocale } from '@/context/LocaleContext';

import { Branch } from '@/types/core/Branch';

/**
 * Branch selector component for selecting branches in a repository
 *
 * @param props0 - BranchSelector props
 * @param props0.branches - List of branches to display
 * @param props0.label - (optional) Label for the branch selector
 * @param props0.currentRef - (optional) The currently selected ref (eg. branch)
 * @param props0.onSelect - (optional) Callback when branch is changed
 *
 * @returns BranchSelector component UI
 */
export default function BranchSelector({
  branches,
  label,
  currentRef,
  onSelect,
}: {
  branches: Branch[]; // List of branches to display
  label?: string; // Label for the branch selector
  currentRef?: string; // The currently selected branch
  onSelect?: (branch: { label: string; value: string }) => void; // Callback when branch is changed
}) {
  const { dict } = useLocale();

  // Convert branches to options
  const options = useMemo(
    () =>
      branches.map((branch) => ({
        label: branch.name,
        value: branch.name,
      })),
    [branches]
  );

  // Find the currently selected branch
  const selectedBranch = useMemo(
    () => options.find((option) => option.value === currentRef),
    [currentRef, options]
  );

  return (
    <div
      className='relative flex w-full min-w-max flex-col'
      id='branch-selector'
    >
      <span className='absolute -top-2 z-10 w-full pr-12 pl-2 text-xs text-gray-800 dark:text-gray-400'>
        {label ?? dict.repository.branches.branch}
      </span>
      <ReactSelect
        value={selectedBranch}
        onChange={(selectedOption) => {
          if (selectedOption && onSelect) {
            onSelect(selectedOption);
          }
        }}
        options={options}
        isSearchable
        placeholder={dict.repository.branches.branches}
        noOptionsMessage={() => dict.common.noOptionsMessage}
        className='react-select-container'
        classNamePrefix='react-select'
      />
    </div>
  );
}
