'use client';

import { useCallback } from 'react';

import ObjectViewer from '@/components/repository/objects/ObjectViewer';
import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import {
  convertToText,
  downloadContent,
  getContentType,
} from '@/utils/content';

import { ChangeItem } from '@/types/core/Diff';
import { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';

import TextDiff from './TextDiff';

/**
 * Component to display the difference between two unknown contents
 *
 * @param props - The props
 * @param props.item - The diff item to display
 * @param props.baseContent - The base content to compare
 * @param props.compareContent - The content to compare against the base
 */
const ContentDiff = ({
  item,
  baseContent,
  compareContent,
}: {
  item: ChangeItem;
  baseContent: IrminAPIBinaryResponse;
  compareContent: IrminAPIBinaryResponse;
}) => {
  const { dict } = useLocale();

  const baseText = convertToText(baseContent);
  const compareText = convertToText(compareContent);

  const baseContentType = getContentType(baseContent);
  const compareContentType = getContentType(compareContent);

  const handleDownload = useCallback(
    (content: Blob | string, contentType: string) => {
      downloadContent(content, contentType, item.object.name);
    },
    [item]
  );

  if (baseText && compareText) {
    return (
      <div className='flex flex-col'>
        <div className='flex flex-row items-center gap-2'>
          <div className='flex w-1/2 flex-row items-center gap-2 p-2'>
            <p className='text-sm'>
              {`${dict.repository.compare.baseContent} (${getContentType(baseContent)})`}
            </p>
            <Button
              variant='secondary'
              size='sm'
              className='ml-auto'
              onClick={() => handleDownload(baseText, baseContentType)}
            >
              {dict.repository.compare.download}
            </Button>
          </div>
          <div className='flex w-1/2 flex-row items-center gap-2 p-2'>
            <p className='text-sm'>
              {`${dict.repository.compare.comparedContent} (${getContentType(compareContent)})`}
            </p>
            <Button
              variant='secondary'
              size='sm'
              className='ml-auto'
              onClick={() => handleDownload(compareText, compareContentType)}
            >
              {dict.repository.compare.download}
            </Button>
          </div>
        </div>
        <TextDiff base={baseText} compare={compareText} />
      </div>
    );
  }

  if (baseContent instanceof Blob || compareContent instanceof Blob) {
    return (
      <div className='flex flex-col gap-2 lg:flex-row'>
        <div className='flex max-h-96 w-full flex-col lg:w-1/2'>
          <div className='flex w-full flex-row items-center gap-2 p-2'>
            <p className='text-sm'>
              {`${dict.repository.compare.baseContent} (${getContentType(baseContent)})`}
            </p>
            <Button
              variant='secondary'
              size='sm'
              className='ml-auto'
              onClick={() =>
                handleDownload(baseContent as Blob, baseContentType)
              }
            >
              {dict.repository.compare.download}
            </Button>
          </div>
          <div className='max-w-full overflow-scroll text-xs'>
            <ObjectViewer object={item.object} objectContent={baseContent} />
          </div>
        </div>
        <div className='flex max-h-96 w-full flex-col lg:w-1/2'>
          <div className='flex w-full flex-row items-center gap-2 p-2'>
            <p className='text-sm'>
              {`${dict.repository.compare.comparedContent} (${getContentType(compareContent)})`}
            </p>
            <Button
              variant='secondary'
              size='sm'
              className='ml-auto'
              onClick={() =>
                handleDownload(compareContent as Blob, compareContentType)
              }
            >
              {dict.repository.compare.download}
            </Button>
          </div>
          <div className='max-w-full overflow-scroll text-xs'>
            <ObjectViewer object={item.object} objectContent={compareContent} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <p className='mx-auto mb-2 max-w-lg text-center text-lg text-gray-600 lg:text-2xl dark:text-gray-300'>
      {dict.repository.compare.unsupportedContentType}
    </p>
  );
};

export default ContentDiff;
