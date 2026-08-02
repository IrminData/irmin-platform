'use client';

import { useCallback, useState } from 'react';

import { TbCheck, TbCopy } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

import { useLocale } from '@/context/LocaleContext';

import type { ConnectionFieldValues } from '@/types/core/Connection';

interface ConnectionConfigTableProps {
  /** Title for the configuration section */
  title: string;
  /** Configuration data as key-value pairs */
  data: ConnectionFieldValues;
}

const MAX_DISPLAY_LENGTH = 80;

/**
 * Component to display connection configuration in a table format
 * with copy functionality and value truncation.
 */
export default function ConnectionConfigTable({
  title,
  data,
}: ConnectionConfigTableProps) {
  const { dict } = useLocale();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = useCallback(async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((currentKey) => (currentKey === key ? null : currentKey));
    }, 2000);
  }, []);

  // Filter out empty values
  const filteredEntries = Object.entries(data).filter(([_, value]) => {
    return value !== null && value !== undefined && value !== '';
  });

  if (filteredEntries.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-2'>
      <h3>{title}</h3>
      <div className='rounded-lg border border-card bg-background'>
        <Table>
          <TableBody>
            {filteredEntries.map(([key, value]) => {
              const isSecret = value === 'SECRET';
              const displayValue = isSecret ? '********' : value;
              const shouldTruncate =
                !isSecret && displayValue.length > MAX_DISPLAY_LENGTH;
              const truncatedValue = shouldTruncate
                ? `${displayValue.substring(0, MAX_DISPLAY_LENGTH)}...`
                : displayValue;
              const isCopied = copiedKey === key;

              return (
                <TableRow key={key}>
                  <TableCell className='w-1/3 font-medium text-muted-foreground'>
                    {key}
                  </TableCell>
                  <TableCell className='font-mono text-sm'>
                    {truncatedValue}
                  </TableCell>
                  <TableCell className='w-16 text-right'>
                    {isSecret ? (
                      <Button
                        variant='ghost'
                        size='icon'
                        disabled
                        title={dict.connections.config.cannotCopySecret}
                      >
                        <TbCopy size={16} className='opacity-30' />
                      </Button>
                    ) : (
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleCopy(key, value)}
                        title={isCopied ? dict.common.copied : dict.common.copy}
                      >
                        {isCopied ? (
                          <TbCheck size={16} className='text-green-500' />
                        ) : (
                          <TbCopy size={16} />
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
