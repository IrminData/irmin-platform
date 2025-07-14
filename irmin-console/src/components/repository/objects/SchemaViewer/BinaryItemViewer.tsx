'use client';

import { MdImage, MdInsertDriveFile, MdTextFields } from 'react-icons/md';

import { useLocale } from '@/context/LocaleContext';

import { formatFileSizeForUI } from '@/utils/formatFileSizeForUI';

import type { ObjectSchema } from '@/types/core/ObjectSchema';

/**
 * Component to visualise a binary schema object
 */
export function BinaryItemViewer({
  item,
  isFocused = false,
}: {
  item: ObjectSchema;
  isFocused?: boolean;
}) {
  const { dict, locale } = useLocale();

  if (item.type !== 'binary') return <></>;

  /** Select icon based on MIME type */
  const getIcon = () => {
    const ct = item.content_type ?? '';
    if (ct.startsWith('image/'))
      return <MdImage className='size-6 text-green-500' />;
    if (ct.startsWith('text/'))
      return <MdTextFields className='size-6 text-orange-500' />;
    return <MdInsertDriveFile className='size-6 text-gray-500' />;
  };

  return (
    <div
      className={`
        rounded-md border bg-popover/10 p-2
        dark:border-gray-800
        ${
          isFocused
            ? `
              ring-2 ring-blue-500
              dark:ring-blue-400
            `
            : ''
        }
      `}
    >
      <div className='flex items-start gap-3'>
        {getIcon()}
        <div className='min-w-0 grow'>
          <div
            className={`
              flex flex-col justify-between gap-2
              sm:flex-row sm:items-center
            `}
          >
            <h3
              className={`
                truncate font-medium text-gray-900
                dark:text-gray-100
              `}
            >
              {item.name}
            </h3>
            {item.last_modified && (
              <span
                className={`
                  text-xs text-gray-500
                  dark:text-gray-400
                `}
              >
                {dict.common.lastModified}:{' '}
                {new Date(item.last_modified).toLocaleDateString(locale)}
              </span>
            )}
          </div>
          <p
            className={`
              truncate text-sm text-gray-500
              dark:text-gray-400
            `}
          >
            {item.path}
          </p>
          {item.description && (
            <p
              className={`
                mt-1 text-sm text-gray-600
                dark:text-gray-300
              `}
            >
              {item.description}
            </p>
          )}
          <div
            className={`
              mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500
              dark:text-gray-400
            `}
          >
            <span>
              {dict.repository.objects.type}: {dict.repository.objects.binary}
            </span>
            <span>
              {dict.common.size}: {formatFileSizeForUI(item.size)}
            </span>
            {item.content_type && <span>MIME: {item.content_type}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
