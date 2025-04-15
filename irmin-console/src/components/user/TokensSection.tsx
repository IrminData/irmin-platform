'use client';

import { useCallback } from 'react';

import { TbTrash } from 'react-icons/tb';

import Button, { ButtonWithTooltip } from '@/components/ui/button';
import ContentWrapper from '@/components/ui/ContentWrapper';
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

import { useSystemTokens } from '@/hooks/useSystemTokens';

import { APIToken } from '@/types/core/APIToken';

import APITokenDisplay from './APITokenDisplay';
import CreateTokenModalContent from './CreateTokenModalContent';

/**
 * User tokens section
 *
 * Displays the user's API tokens, allows one to create new ones and revoke existing ones.
 *
 * @param props - The component props.
 * @param props.initialTokens - The initial tokens to display.
 * @returns {JSX.Element} The tokens section component.
 */
export default function TokensSection({
  initialTokens,
}: {
  initialTokens: APIToken[];
}) {
  const { dict, locale } = useLocale();
  const { irminModal } = usePopup();
  const { tokens, createdToken, createToken, revokeToken } = useSystemTokens({
    initialTokens,
  });

  /**
   * Handle the creation of a new API token.
   */
  const handleCreateToken = useCallback(() => {
    irminModal.show(
      dict.tokens.createAPIToken,
      <CreateTokenModalContent
        onCreate={async (validFor, name) => {
          await createToken(validFor, name);
          irminModal.close();
        }}
        onClose={() => {
          irminModal.close();
        }}
      />
    );
  }, [irminModal, dict, createToken]);

  return (
    <ContentWrapper wrapperClassName='max-w-7xl py-4'>
      {/* Row with the create token button */}
      <div className='flex flex-row items-center justify-end px-2'>
        <Button size='sm' variant='default' onClick={handleCreateToken}>
          {dict.tokens.createAPIToken}
        </Button>
      </div>
      {createdToken && createToken.length > 0 && (
        <div className='pt-4 pb-8'>
          <APITokenDisplay token={createdToken} />
        </div>
      )}
      {tokens.length === 0 ? (
        <div className='py-12 text-center text-lg text-gray-500 lg:text-2xl dark:text-gray-400'>
          {dict.tokens.noTokens}
        </div>
      ) : (
        <Table className='min-w-full'>
          <TableHeader>
            <TableRow className='border-b dark:border-gray-800'>
              <TableHead className='px-4 py-2 text-left text-xs font-normal md:text-sm'>
                {dict.common.description}
              </TableHead>
              <TableHead className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
                {dict.tokens.expiresAt}
              </TableHead>
              <TableHead className='px-4 py-2 text-center text-xs font-normal md:text-right md:text-sm'>
                {/* Actions */}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token, idx) => (
              <TableRow
                key={`user-api-token-${token.id}-${idx}`}
                className='h-14 border-b dark:border-gray-800'
              >
                <TableCell className='px-4 py-2 text-sm text-gray-700 dark:text-gray-400'>
                  {token.name}
                </TableCell>
                <TableCell className='px-4 py-2 text-sm text-gray-700 dark:text-gray-400'>
                  {new Date(token.expiry).toLocaleDateString(locale)}
                </TableCell>
                <TableCell className='px-4 py-2 text-right'>
                  <div className='flex w-full flex-row justify-end gap-2 align-middle'>
                    <ButtonWithTooltip
                      size='icon'
                      variant='secondary'
                      aria-label='Revoke token'
                      icon={<TbTrash size={14} />}
                      tooltip={dict.tokens.revokeToken}
                      onClick={() => revokeToken(token)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ContentWrapper>
  );
}
