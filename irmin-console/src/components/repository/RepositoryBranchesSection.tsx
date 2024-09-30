'use client';

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import IrminCore from '@/services/core/IrminCore';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import NormalList from '@/components/common/list/NormalList';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { GridRow } from '@/types/internal/ListProps';

import CreateBranchModalContent from './CreateBranchModalContent';

/**
 * Section to display the branches of a repository.
 */
export default function RepositoryBranchesSection() {
  const router = useRouter();
  const { dict, locale } = useLocale();
  const { irminAlert, irminModal } = usePopup();
  const {
    branches,
    fetchBranches,
    currentRepository,
    loadingBranches,
    currentBranch,
    setCurrentBranch,
    defaultBranch,
  } = useData();

  const { branchService } = useMemo(() => new IrminCore(locale), [locale]);

  const handleDeleteBranch = async (branch: string) => {
    if (!currentRepository) return;
    if (branch === defaultBranch) {
      irminAlert('error', dict.repository.cannotDeletePrimaryBranch);
      return;
    }
    try {
      // Delete the branch
      const result = await branchService.deleteBranch(
        branch,
        currentRepository
      );
      irminAlert('success', result.message ?? dict.repository.branchDeleted);
      // Change to the primary branch just in case
      if (defaultBranch) setCurrentBranch(defaultBranch);
      // Refetch the branches
      fetchBranches();
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? dict.repository.branchDeleteFailed
      );
    }
  };

  const handleCreateBranch = async (branchName: string, fromBranch: string) => {
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
      fetchBranches();
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? dict.repository.branchCreateFailed
      );
    }
  };

  const createBranch = () => {
    if (!branches) return;
    irminModal.show(
      dict.repository.createBranch,
      <CreateBranchModalContent
        branches={branches.map((branch) => branch.name) ?? []}
        createBranch={handleCreateBranch}
      />
    );
  };

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
              {dict.repository.primary}
            </span>
          )}
          {branch.name === currentBranch && (
            <span className='h-max rounded-lg bg-gray-300 px-1 text-xs leading-4 text-irmin_black dark:bg-gray-600 dark:text-white'>
              {dict.repository.currentBranch}
            </span>
          )}
        </div>,
      ],
      actions: [
        {
          label: dict.list.view,
          primary: true,
          onClick: () => {
            setCurrentBranch(branch.name);
            router.push('./');
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
    <div className='container relative mx-auto max-w-6xl px-2 md:px-4'>
      <div className='mb-4 flex flex-row items-center justify-end gap-4'>
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
