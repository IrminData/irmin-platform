'use client';

import { useCallback } from 'react';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import NormalList from '@/components/common/list/NormalList';
import StatusBadge from '@/components/common/status/StatusBadge';
import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Repository } from '@/types/api/Repository';
import { GridRow } from '@/types/internal/ListProps';

import CreateBranchModalContent from './CreateBranchModalContent';

/**
 * Section to display the branches of a repository.
 * @param repository Repository to display branches for.
 */
export default function RepositoryBranchesSection({
  repository,
}: {
  repository?: Repository;
}) {
  const { dict } = useLocale();
  const { irminAlert, irminModal } = usePopup();

  const deleteBranch = (branch: string) => {
    if (branch === 'main') {
      irminAlert('error', dict.repository.cannotDeleteMainBranch);
      return;
    }
    // TODO: Implement delete branch functionality
    console.log('Delete branch', branch);
  };

  const createBranch = useCallback(() => {
    irminModal.show(
      dict.repository.createBranch,
      <CreateBranchModalContent branches={repository?.branches ?? []} />
    );
  }, [irminModal, dict.repository.createBranch, repository?.branches]);

  const rows: GridRow[] =
    repository?.branches.map((branch, i) => {
      return {
        columns: [
          <div key={`branch-${i}-name`} className='inline-flex flex-row gap-4'>
            <p className='text-base'>{branch}</p>
            {branch === 'main' && (
              <StatusBadge statusLabel={dict.repository.primary} />
            )}
          </div>,
        ],
        actions: [
          {
            label: dict.list.delete,
            primary: false,
            onClick: () => {
              deleteBranch(branch);
            },
          },
        ],
      };
    }) ?? [];

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='flex flex-row items-center justify-between gap-4 px-2 md:px-4'>
        <PortalTitle title={dict.repository.tabs.branches} />
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
        loading={false}
        rows={rows}
      />
    </div>
  );
}
