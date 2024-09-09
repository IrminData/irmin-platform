'use client';

import React from 'react';

import ReactSelect from 'react-select';

import { useLocale } from '@/context/LocaleContext';

interface BranchOption {
  label: string;
  value: string;
}

/**
 * Branch selector component for selecting branches in a repository
 *
 * @param props0 - BranchSelector props
 * @param props0.branches - List of branches to display
 * @param props0.currentBranch - The currently selected branch
 * @param props0.onChangeBranch - Callback when branch is changed
 *
 * @returns BranchSelector component UI
 */
export default function BranchSelector({
  branches,
  currentBranch,
  onChangeBranch,
}: {
  branches: BranchOption[]; // List of branches to display
  currentBranch: string; // The currently selected branch
  onChangeBranch: (branch: BranchOption) => void; // Callback when branch is changed
}) {
  const { dict } = useLocale();

  // Find the currently selected branch
  const selectedBranch = branches.find(
    (branch) => branch.value === currentBranch
  );

  return (
    <div className='flex w-60 flex-col'>
      <span className='z-10 -mb-2 px-2 text-xs text-gray-400 dark:text-gray-600'>
        {dict.repository.branch}
      </span>
      <ReactSelect
        value={selectedBranch}
        onChange={(selectedOption) => {
          if (selectedOption) {
            onChangeBranch(selectedOption);
          }
        }}
        options={branches}
        isSearchable
        placeholder={dict.repository.tabs.branches}
        noOptionsMessage={() => dict.misc.noOptionsMessage}
        className='react-select-container'
        classNamePrefix='react-select'
      />
    </div>
  );
}
