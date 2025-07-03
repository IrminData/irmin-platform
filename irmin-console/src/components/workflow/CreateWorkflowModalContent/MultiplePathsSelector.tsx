'use client';

import { useCallback } from 'react';

import { TbX } from 'react-icons/tb';

import Button from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

interface MultiplePathsSelectorProps {
  label: string;
  paths: string[] | undefined;
  onPathsChange: (paths: string[]) => void;
  renderPathSelector: (
    path: string,
    onPathChange: (path: string) => void
  ) => React.ReactNode;
  addButtonText?: string;
}

export default function MultiplePathsSelector({
  label,
  paths = [],
  onPathsChange,
  renderPathSelector,
  addButtonText,
}: MultiplePathsSelectorProps) {
  const { dict } = useLocale();

  const addPath = useCallback(() => {
    onPathsChange([...paths, '']);
  }, [onPathsChange, paths]);

  const removePath = useCallback(
    (index: number) => {
      onPathsChange(paths.filter((_, i) => i !== index));
    },
    [onPathsChange, paths]
  );

  const updatePath = useCallback(
    (index: number, newPath: string) => {
      onPathsChange(paths.map((p, i) => (i === index ? newPath : p)));
    },
    [onPathsChange, paths]
  );

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <Label>{label}</Label>
        <Button type='button' variant='secondary' size='sm' onClick={addPath}>
          {addButtonText || `+ ${dict.workflow.addPath}`}
        </Button>
      </div>

      {(!paths || paths.length === 0) && (
        <div className='flex gap-2'>
          <div className='flex-1'>
            {renderPathSelector('', (path) => onPathsChange([path]))}
          </div>
        </div>
      )}

      {paths?.map((path, index) => (
        <div key={index} className='flex items-start gap-2'>
          <div className='flex-1'>
            {renderPathSelector(path, (newPath) => updatePath(index, newPath))}
          </div>
          {paths && paths.length > 1 && (
            <Button
              type='button'
              variant='destructive'
              size='icon'
              icon={<TbX />}
              onClick={() => removePath(index)}
              className='mt-1'
              title={dict.workflow.removePath}
            ></Button>
          )}
        </div>
      ))}
    </div>
  );
}
