'use client';

import { useCallback, useMemo } from 'react';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import NormalList from '@/components/common/list/NormalList';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { GridRow } from '@/types/internal/ListProps';

import CreateBranchModalContent from './CreateBranchModalContent';

/**
 * Section to display the branches of a repository.
 */
export default function RepositoryBranchesSection() {
  const { dict } = useLocale();
  const { irminAlert, irminModal } = usePopup();
  const { branchesResults, loadingBranches } = useData();

  const deleteBranch = useCallback(
    (branch: string) => {
      if (branch === 'main') {
        irminAlert('error', dict.repository.cannotDeleteMainBranch);
        return;
      }
      // TODO: Implement delete branch functionality
      console.log('Delete branch', branch);
    },
    [irminAlert, dict.repository.cannotDeleteMainBranch]
  );

  const createBranch = useCallback(() => {
    if (!branchesResults) return;
    irminModal.show(
      dict.repository.createBranch,
      <CreateBranchModalContent
        branches={
          branchesResults.data.branches.map((branch) => branch.name) ?? []
        }
      />
    );
  }, [irminModal, dict.repository.createBranch, branchesResults]);

  const rows: GridRow[] = useMemo(() => {
    if (!branchesResults) return [];
    return (
      branchesResults.data.branches.map((branch, i) => {
        return {
          columns: [
            <div
              key={`branch-${i}-name`}
              className='inline-flex flex-row gap-4'
            >
              <p className='text-base'>{branch.name}</p>
              {branch.default && (
                <StatusBadge statusLabel={dict.repository.primary} />
              )}
            </div>,
          ],
          actions: [
            {
              label: dict.list.delete,
              primary: false,
              onClick: () => {
                deleteBranch(branch.name);
              },
            },
          ],
        };
      }) ?? []
    );
  }, [
    branchesResults,
    dict.repository.primary,
    dict.list.delete,
    deleteBranch,
  ]);

  return (
    <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
      <div className='mb-4 flex flex-row items-center justify-between gap-4'>
        <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
          {dict.repository.tabs.branches}
        </h2>
        <Button
          variant='solid'
          colorScheme='primary'
          size='sm'
          icon={<IoAdd size={18} />}
          onClick={() => {
            createBranch();
          }}
        >
          {dict.repository.createBranch}
        </Button>
      </div>
      <NormalList
        headers={[dict.list.name, dict.list.actions]}
        hideHeaders={false}
        loading={loadingBranches}
        rows={rows}
      />
    </div>
  );
}
