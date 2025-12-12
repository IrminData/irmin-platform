/* eslint-disable import-x/no-unused-modules */
'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';

import { useScripts } from '@/hooks/api/useScripts';
import { useBaseUrl } from '@/hooks/utils';

import type { StoredScript } from '@/types/core/Script';

interface ScriptSelectorProps {
  currentSelectedScriptId: string | null;
  onSelectScript: (scriptId: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * ScriptSelector Component
 *
 * Allows users to select a stored script from a dropdown list.
 */
export default function ScriptSelector({
  currentSelectedScriptId,
  onSelectScript,
  className,
  disabled = false,
}: ScriptSelectorProps) {
  const { dict } = useLocale();
  const { scriptsQuery } = useScripts();
  const [searchTerm, setSearchTerm] = useState('');

  const scriptsUrl = useBaseUrl({
    pathname: '/scripts',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const scripts = scriptsQuery.data?.data ?? [];

  const filteredScripts = scripts.filter((script: StoredScript) =>
    script.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedScript = scripts.find(
    (script: StoredScript) => script.id === currentSelectedScriptId
  );

  return (
    <div
      className={`
        flex flex-col gap-2
        ${className ?? ''}
      `}
    >
      <Select
        value={currentSelectedScriptId || undefined}
        onValueChange={onSelectScript}
        disabled={disabled || scriptsQuery.isLoading}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder={dict.scripts.selectScript} />
        </SelectTrigger>
        <SelectContent>
          <div className='p-2'>
            <Input
              placeholder={dict.list.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='mb-2'
            />
          </div>
          {scriptsQuery.isLoading ? (
            <SelectItem value='loading' disabled>
              {dict.list.loading}
            </SelectItem>
          ) : filteredScripts.length === 0 ? (
            <SelectItem value='no-scripts' disabled>
              {dict.list.noItems}
            </SelectItem>
          ) : (
            filteredScripts.map((script: StoredScript) => (
              <SelectItem key={script.id} value={script.id}>
                {script.name} {script.language && `(${script.language})`}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedScript && (
        <div className='text-sm text-muted-foreground'>
          <div>
            <strong>{dict.scripts.owner}:</strong>{' '}
            {selectedScript.owner.first_name} {selectedScript.owner.last_name}
          </div>
          {selectedScript.tags && selectedScript.tags.length > 0 && (
            <div>
              <strong>{dict.list.tags}:</strong>{' '}
              {selectedScript.tags.map((tag) => tag.name).join(', ')}
            </div>
          )}
        </div>
      )}

      {!scriptsQuery.isLoading && scripts.length === 0 && (
        <Button
          variant='secondary'
          className='w-full'
          onClick={() => window.open(`${scriptsUrl}?create`, '_blank')}
          disabled={disabled}
        >
          {dict.scripts.createScript}
        </Button>
      )}
    </div>
  );
}
