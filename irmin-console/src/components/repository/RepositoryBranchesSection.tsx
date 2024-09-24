'use client';

import { useCallback, useMemo } from 'react';

import IrminCore from '@/services/core/IrminCore';

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
  const { dict, locale } = useLocale();
  const { irminAlert, irminModal } = usePopup();
  const { branches, fetchBranches, currentRepository, loadingBranches } =
    useData();

  const { branchService } = useMemo(() => new IrminCore(locale), [locale]);

  const deleteBranch = useCallback(
    async (branch: string) => {
      if (!currentRepository) return;
      const currentDefaultBranch = branches?.find((b) => b.default)?.name;
      if (branch === currentDefaultBranch) {
        irminAlert('error', dict.repository.cannotDeleteMainBranch);
        return;
      }
      try {
        // Delete the branch
        const result = await branchService.deleteBranch(
          branch,
          currentRepository
        );
        irminAlert('success', result.message ?? dict.repository.branchDeleted);
        fetchBranches(currentRepository);
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? dict.repository.branchDeleteFailed
        );
      }
    },
    [
      branches,
      irminAlert,
      dict,
      currentRepository,
      branchService,
      fetchBranches,
    ]
  );

  const handleCreateBranch = useCallback(
    async (branchName: string, fromBranch: string) => {
      irminModal.close();

      if (!currentRepository) return;
      const exists = branches?.find((b) => b.name === branchName);
      const fromExists = branches?.find((b) => b.name === fromBranch);
      if (
        exists ||
        !fromExists ||
        branchName.length === 0 ||
        fromBranch.length === 0
      ) {
        irminAlert('error', dict.repository.branchCreateFailed);
        return;
      }
      try {
        // Delete the branch
        const result = await branchService.createBranch(
          branchName,
          fromBranch,
          currentRepository
        );
        irminAlert('success', result.message ?? dict.repository.branchCreated);
        fetchBranches(currentRepository);
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? dict.repository.branchCreateFailed
        );
      }
    },
    [
      branches,
      irminModal,
      irminAlert,
      dict,
      currentRepository,
      fetchBranches,
      branchService,
    ]
  );

  const createBranch = useCallback(() => {
    if (!branches) return;
    irminModal.show(
      dict.repository.createBranch,
      <CreateBranchModalContent
        branches={branches.map((branch) => branch.name) ?? []}
        createBranch={handleCreateBranch}
      />
    );
  }, [irminModal, dict, handleCreateBranch, branches]);

  const rows: GridRow[] = useMemo(() => {
    if (!branches) return [];
    return (
      branches.map((branch, i) => {
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
  }, [branches, dict.repository.primary, dict.list.delete, deleteBranch]);

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
      <div id='branches-list'>
        <NormalList
          headers={[dict.list.name, dict.list.actions]}
          hideHeaders={false}
          loading={loadingBranches}
          rows={rows}
        />
      </div>
    </div>
  );
}
