'use client';

import { useCallback } from 'react';

import { TbTrash } from 'react-icons/tb';

import Button, { ButtonWithTooltip } from '@/components/ui/button';
import ContentWrapper from '@/components/ui/ContentWrapper';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useSystemTokens } from '@/hooks/useSystemTokens';

import { SystemToken } from '@/types/core/SystemToken';

import APITokenDisplay from './APITokenDisplay';
import CreateTokenModalContent from './CreateTokenModalContent';

/**
 * User tokens section
 *
 * Displays the user's API tokens, allows to create new ones and revoke existing ones.
 *
 * @param props - The component props.
 * @param props.initialTokens - The initial tokens to display.
 */
export default function TokensSection({
  initialTokens,
}: {
  initialTokens: SystemToken[];
}) {
  const { dict, locale } = useLocale();
  const { irminModal } = usePopup();
  const { tokens, createdToken, createToken, revokeToken } = useSystemTokens({
    initialTokens,
  });

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
    <ContentWrapper wrapperClassName='max-w-6xl py-4'>
      <div className='flex flex-row items-center justify-end px-2'>
        <Button size='sm' variant='default' onClick={handleCreateToken}>
          {dict.tokens.createAPIToken}
        </Button>
      </div>
      {createdToken && createToken.length > 0 && (
        <div className='pb-8 pt-4'>
          <APITokenDisplay token={createdToken} />
        </div>
      )}
      <table className='min-w-full'>
        <thead>
          <tr className='border-b dark:border-gray-800'>
            <th className='px-4 py-2 text-left text-xs font-normal md:text-sm'>
              {dict.common.description}
            </th>
            <th className='hidden px-2 py-2 text-left text-sm font-normal md:table-cell'>
              {dict.tokens.expiresAt}
            </th>
            <th className='px-4 py-2 text-center text-xs font-normal md:text-right md:text-sm'>
              {/* Actions */}
            </th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, idx) => (
            <tr
              key={`user-api-token-${token.id}-${idx}`}
              className='h-14 border-b dark:border-gray-800'
            >
              <td className='px-4 py-2 text-sm text-gray-700 dark:text-gray-400'>
                {token.name}
              </td>
              <td className='px-4 py-2 text-sm text-gray-700 dark:text-gray-400'>
                {new Date(token.expiry).toLocaleDateString(locale)}
              </td>
              <td className='px-4 py-2 text-right'>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ContentWrapper>
  );
}
