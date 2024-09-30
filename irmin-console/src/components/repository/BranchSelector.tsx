'use client';

import ReactSelect from 'react-select';

import { useLocale } from '@/context/LocaleContext';

import { Branch } from '@/types/core/Branch';

/**
 * Branch selector component for selecting branches in a repository
 *
 * @param props0 - BranchSelector props
 * @param props0.branches - List of branches to display
 * @param props0.label - (optional) Label for the branch selector
 * @param props0.currentBranch - (optional) The currently selected branch
 * @param props0.onChangeBranch - (optional) Callback when branch is changed
 *
 * @returns BranchSelector component UI
 */
export default function BranchSelector({
  branches,
  label,
  currentBranch,
  onChangeBranch,
}: {
  branches: Branch[]; // List of branches to display
  label?: string; // Label for the branch selector
  currentBranch?: string; // The currently selected branch
  onChangeBranch?: (branch: { label: string; value: string }) => void; // Callback when branch is changed
}) {
  const { dict } = useLocale();

  // Convert branches to options
  const options = branches.map((branch) => ({
    label: branch.name,
    value: branch.name,
  }));

  // Find the currently selected branch
  const selectedBranch = options.find(
    (option) => option.value === currentBranch
  );

  return (
    <div
      className='relative flex w-full min-w-max flex-col'
      id='branch-selector'
    >
      <span className='absolute -top-2 z-10 w-full pl-2 pr-12 text-xs text-gray-800 dark:text-gray-400'>
        {label ?? dict.repository.branch}
      </span>
      <ReactSelect
        value={selectedBranch}
        onChange={(selectedOption) => {
          if (selectedOption && onChangeBranch) {
            onChangeBranch(selectedOption);
          }
        }}
        options={options}
        isSearchable
        placeholder={dict.repository.tabs.branches}
        noOptionsMessage={() => dict.misc.noOptionsMessage}
        className='react-select-container'
        classNamePrefix='react-select'
      />
    </div>
  );
}
