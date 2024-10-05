'use client';

import NormalList from '@/components/common/list/NormalList';

import { useLocale } from '@/context/LocaleContext';

import { Branch } from '@/types/core/Branch';
import { GridRow } from '@/types/internal/ListProps';

/**
 * Component to display a list of branches
 *
 * @param props - The props
 * @param props.currentRef - (optional) The current ref
 * @param props.branches - The list of branches to display
 * @param props.handleViewBranch - The function to handle the viewing of a branch
 * @param props.handleDeleteBranch - The function to handle the deletion of a branch
 * @param props.loading - Whether the branches are loading
 */
export default function BranchList({
  currentRef,
  branches,
  handleViewBranch,
  handleDeleteBranch,
  loading,
}: {
  currentRef?: string;
  branches: Branch[];
  handleViewBranch: (branch: string) => void;
  handleDeleteBranch: (branch: string) => void;
  loading: boolean;
}) {
  const { dict } = useLocale();

  const rows: GridRow[] =
    branches?.map((branch, i) => ({
      columns: [
        <div
          key={`branch-${i}-name`}
          className='inline-flex flex-row items-center gap-2'
        >
          <p className='text-base'>{branch.name}</p>
          {branch.default && (
            <span className='h-max rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
              {dict.repository.branches.primary}
            </span>
          )}
          {branch.name === currentRef && (
            <span className='h-max rounded-lg bg-gray-300 px-1 text-xs leading-4 text-irmin_black dark:bg-gray-600 dark:text-white'>
              {dict.repository.branches.currentBranch}
            </span>
          )}
        </div>,
      ],
      actions: [
        {
          label: dict.list.view,
          primary: true,
          onClick: () => {
            handleViewBranch(branch.name);
          },
        },
        {
          label: dict.list.delete,
          primary: false,
          onClick: () => {
            handleDeleteBranch(branch.name);
          },
        },
      ],
    })) ?? [];

  return (
    <div id='branches-list'>
      <NormalList
        headers={[dict.list.name, dict.list.actions]}
        hideHeaders={false}
        loading={loading}
        rows={rows}
      />
    </div>
  );
}
