'use client';

import { TbFile, TbPhoto, TbTextCaption } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import { formatFileSizeForUI } from '@/utils/formatFileSizeForUI';
import { formatTimestamp } from '@/utils/formatTimestamp';

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
      return <TbPhoto className='size-6 text-success' />;
    if (ct.startsWith('text/'))
      return <TbTextCaption className='size-6 text-chart-3' />;
    return <TbFile className='size-6 text-muted-foreground' />;
  };

  return (
    <div
      className={`
        rounded-[2px] border border-border bg-popover/10 p-2
        ${isFocused ? `ring-2 ring-accent` : ''}
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
            <h3 className={`truncate font-medium text-foreground`}>
              {item.name}
            </h3>
            {item.last_modified && (
              <span className={`text-xs text-muted-foreground`}>
                {dict.common.lastModified}:{' '}
                {formatTimestamp(item.last_modified, locale)}
              </span>
            )}
          </div>
          <p className={`truncate text-sm text-muted-foreground`}>
            {item.path}
          </p>
          {item.description && (
            <p className={`mt-1 text-sm text-muted-foreground`}>
              {item.description}
            </p>
          )}
          <div
            className={`
              mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground
            `}
          >
            <span>
              {dict.repository.objects.type}: {dict.repository.objects.binary}
            </span>
            <span>
              {dict.common.size}: {formatFileSizeForUI(item.size)}
            </span>
            {item.content_type && (
              <span>
                {dict.repository.objects.mime}: {item.content_type}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
