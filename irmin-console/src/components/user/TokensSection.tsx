'use client';

import { useCallback } from 'react';

import { IoInformationCircle } from 'react-icons/io5';
import { TbTrash } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/loading/TableSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useCredentials } from '@/hooks/api';

import APITokenDisplay from './APITokenDisplay';
import CreateTokenModalContent from './CreateTokenModalContent';

/**
 * User tokens section
 *
 * Displays the user's API tokens, allows one to create new ones and revoke existing ones.
 */
export default function TokensSection() {
  const { dict, locale } = useLocale();
  const { irminModal } = usePopup();
  const {
    credentialsQuery,
    createCredentialMutation,
    deleteCredentialMutation,
  } = useCredentials();

  /**
   * Handle the creation of a new API token.
   */
  const handleCreateToken = useCallback(() => {
    irminModal.show(
      dict.tokens.createAPIToken,
      <CreateTokenModalContent
        onCreate={async (validFor, name) => {
          await createCredentialMutation.mutateAsync({
            name,
            expiry: validFor,
          });
          irminModal.close();
        }}
        onClose={() => {
          irminModal.close();
        }}
      />
    );
  }, [irminModal, dict, createCredentialMutation]);

  return (
    <ContentWrapper wrapperClassName='max-w-7xl py-4'>
      {/* Explainer section */}
      <div
        className={`
          mb-4 flex items-start gap-3 rounded-lg border
          border-accent-foreground/10 bg-accent/10 p-3
          dark:border-accent-foreground dark:bg-accent/10
        `}
      >
        <IoInformationCircle className={`mt-0.5 size-5 shrink-0 text-accent`} />
        <div className={`flex-1 text-sm text-accent-foreground`}>
          <p>{dict.tokens.explainer}</p>
          {process.env.NEXT_PUBLIC_API_DOCS_URL && (
            <a
              href={process.env.NEXT_PUBLIC_API_DOCS_URL}
              target='_blank'
              rel='noopener noreferrer'
              className={`
                mt-1 inline-block text-accent underline
                hover:no-underline
              `}
            >
              {dict.tokens.learnMoreApiDocs}
            </a>
          )}
        </div>
      </div>
      {/* Row with the create token button */}
      <div className='mb-4 flex flex-row items-center justify-end px-2'>
        <Button size='sm' variant='default' onClick={handleCreateToken}>
          {dict.tokens.createAPIToken}
        </Button>
      </div>
      {createCredentialMutation.isSuccess &&
        createCredentialMutation.data?.data?.token && (
          <div className='pt-4 pb-8'>
            <APITokenDisplay token={createCredentialMutation.data.data.token} />
          </div>
        )}
      {credentialsQuery.isLoading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : (
        <></>
      )}
      {credentialsQuery.data?.data?.length === 0 &&
      !credentialsQuery.isLoading ? (
        <EmptyState
          title={dict.list.emptyState.tokens.title}
          description={dict.list.emptyState.tokens.description}
          action={{
            label: dict.tokens.createAPIToken,
            onClick: handleCreateToken,
            variant: 'gradient',
          }}
          className='py-16'
        />
      ) : (
        <></>
      )}
      {credentialsQuery.data?.data?.length && !credentialsQuery.isLoading ? (
        <Table className='min-w-full'>
          <TableHeader>
            <TableRow
              className={`
                border-b
                dark:border-gray-800
              `}
            >
              <TableHead
                className={`
                  px-4 py-2 text-left text-xs font-normal
                  md:text-sm
                `}
              >
                {dict.common.description}
              </TableHead>
              <TableHead
                className={`
                  hidden p-2 text-left text-sm font-normal
                  md:table-cell
                `}
              >
                {dict.tokens.expiresAt}
              </TableHead>
              <TableHead
                className={`
                  px-4 py-2 text-center text-xs font-normal
                  md:text-right md:text-sm
                `}
              >
                {/* Actions */}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentialsQuery.data?.data?.map((token) => (
              <TableRow
                key={`user-api-token-${token.id}`}
                className={`
                  h-14 border-b
                  dark:border-gray-800
                `}
              >
                <TableCell
                  className={`
                    px-4 py-2 text-sm text-gray-700
                    dark:text-gray-400
                  `}
                >
                  {token.name}
                </TableCell>
                <TableCell
                  className={`
                    px-4 py-2 text-sm text-gray-700
                    dark:text-gray-400
                  `}
                >
                  {new Date(token.expiry).toLocaleDateString(locale)}
                </TableCell>
                <TableCell className='px-4 py-2 text-right'>
                  <div
                    className={`
                      flex w-full flex-row justify-end gap-2 align-middle
                    `}
                  >
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      aria-label='Revoke token'
                      icon={<TbTrash size={14} />}
                      tooltip={dict.tokens.revokeToken}
                      onClick={() =>
                        void deleteCredentialMutation.mutateAsync(token.id)
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <></>
      )}
    </ContentWrapper>
  );
}
