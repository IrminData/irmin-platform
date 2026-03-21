'use client';

import { useCallback, useState } from 'react';

import { TbX } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

interface PathEntry {
  id: number;
  value: string;
}

interface MultiplePathsSelectorProps {
  label: string;
  paths: string[] | undefined;
  onPathsChange: (_paths: string[]) => void;
  renderPathSelector: (
    _path: string,
    _onPathChange: (_path: string) => void
  ) => React.ReactNode;
  addButtonText?: string;
}

const EMPTY_PATHS: string[] = [];

let globalNextId = 0;

/**
 * Builds initial PathEntry array from string paths
 */
function buildEntries(paths: string[]): PathEntry[] {
  return paths.map((value) => ({ id: globalNextId++, value }));
}

export default function MultiplePathsSelector({
  label,
  paths = EMPTY_PATHS,
  onPathsChange,
  renderPathSelector,
  addButtonText,
}: MultiplePathsSelectorProps) {
  const { dict } = useLocale();

  // Internal entries with stable IDs for React keys.
  // We sync from the paths prop only on length changes that don't match
  // our internal state, indicating an external reset.
  const [entries, setEntries] = useState<PathEntry[]>(() =>
    buildEntries(paths)
  );

  // Sync entries when paths prop diverges from internal state.
  // Preserve IDs for positions whose values haven't changed to avoid
  // unnecessary unmount/remount of path selector components.
  const needsSync =
    entries.length !== paths.length ||
    entries.some((e, i) => e.value !== paths[i]);
  if (needsSync) {
    setEntries(
      paths.map((value, i) =>
        i < entries.length
          ? { id: entries[i].id, value }
          : { id: globalNextId++, value }
      )
    );
  }

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

      {entries.map((entry, index) => (
        <div key={entry.id} className='flex items-start gap-2'>
          <div className='flex-1'>
            {renderPathSelector(entry.value, (newPath) =>
              updatePath(index, newPath)
            )}
          </div>
          {entries.length > 1 && (
            <Button
              type='button'
              variant='destructive'
              size='icon'
              icon={<TbX />}
              onClick={() => removePath(index)}
              className='mt-1'
              title={dict.workflow.removePath}
            />
          )}
        </div>
      ))}
    </div>
  );
}
