'use client';

import { memo, useEffect, useState } from 'react';

import { TbCode, TbFileText } from 'react-icons/tb';

import MDXViewer from '@/components/documentation/MDXViewer';
import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Component to display markdown content with a toggle between rendered and raw source views.
 *
 * @param props - The props
 * @param props.blob - The Blob containing markdown content
 */
const MarkdownViewer = ({ blob }: { blob: Blob }) => {
  const { dict } = useLocale();
  const [content, setContent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'source'>('rendered');

  useEffect(() => {
    let isCurrent = true;

    const loadContent = async () => {
      try {
        const text = await blob.text();
        if (isCurrent) {
          setContent(text);
        }
      } catch {
        if (isCurrent) {
          setContent('');
        }
      }
    };

    void loadContent();

    return () => {
      isCurrent = false;
    };
  }, [blob]);

  if (content === null) return null;

  return (
    <div className='relative w-full overflow-hidden'>
      <div className='absolute top-2 right-2 z-10'>
        <Button
          variant='outline'
          size='sm'
          onClick={() =>
            setViewMode(viewMode === 'rendered' ? 'source' : 'rendered')
          }
        >
          {viewMode === 'rendered' ? (
            <>
              <TbCode className='mr-1.5 size-3.5' />
              {dict.repository.objects.viewSource}
            </>
          ) : (
            <>
              <TbFileText className='mr-1.5 size-3.5' />
              {dict.repository.objects.viewRendered}
            </>
          )}
        </Button>
      </div>

      {viewMode === 'rendered' ? (
        <div className='overflow-hidden p-4'>
          <MDXViewer content={content} />
        </div>
      ) : (
        <pre
          className={`
            overflow-x-auto rounded-lg bg-muted/30 p-4 font-mono text-xs
            break-all whitespace-pre-wrap text-muted-foreground
          `}
        >
          {content}
        </pre>
      )}
    </div>
  );
};

export default memo(MarkdownViewer);
