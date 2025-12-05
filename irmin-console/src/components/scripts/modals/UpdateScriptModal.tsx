'use client';

import { useCallback, useState } from 'react';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useLocale } from '@/context/LocaleContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { StoredScript } from '@/types/core/Script';
import type { User } from '@/types/core/User';

type FormData = {
  name: string;
  description: string;
  owner_id: string;
};

interface UpdateScriptModalProps {
  script: StoredScript;
  updateScriptMutation: UseMutationResult<
    IrminAPIResponse<StoredScript>,
    Error,
    { scriptId: string; name?: string; description?: string }
  >;
  transferScriptMutation: UseMutationResult<
    IrminAPIResponse<StoredScript>,
    Error,
    { scriptId: string; newOwnerId: string }
  >;
  usersQuery: UseQueryResult<IrminAPIResponse<User[]>, Error>;
  onClose: () => void;
  onSuccess?: (updatedScript: StoredScript) => void;
}

/**
 * Modal for updating script metadata.
 * Allows the user to:
 * - Rename the script
 * - Edit the description
 * - Transfer ownership
 */
export default function UpdateScriptModal({
  script,
  updateScriptMutation,
  transferScriptMutation,
  usersQuery,
  onClose,
  onSuccess,
}: UpdateScriptModalProps) {
  const { dict } = useLocale();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: script.name,
      description: script.description || '',
      owner_id: script.owner.id,
    },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        setError('');
        setLoading(true);

        // Update script metadata
        const updateResult = await updateScriptMutation.mutateAsync({
          scriptId: script.id,
          name: data.name,
          description: data.description,
        });

        // Transfer ownership if changed
        let finalScript = updateResult.data;
        if (data.owner_id !== script.owner.id) {
          const transferResult = await transferScriptMutation.mutateAsync({
            scriptId: script.id,
            newOwnerId: data.owner_id,
          });
          finalScript = transferResult.data;
        }

        // Close modal and call success callback with updated script
        onClose();
        if (finalScript) {
          onSuccess?.(finalScript);
        }
      } catch (error) {
        console.error(error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [
      script.id,
      script.owner.id,
      updateScriptMutation,
      transferScriptMutation,
      onClose,
      onSuccess,
    ]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-6'
      id='update-script-modal'
    >
      <div className='flex flex-col gap-2'>
        <Label htmlFor='script-name'>{dict.common?.name ?? 'Name'}</Label>
        <Controller
          name='name'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <Input
              id='script-name'
              type='text'
              disabled={loading}
              placeholder={dict.scripts?.scriptName ?? 'Script name'}
              {...field}
            />
          )}
        />
        {errors.name && (
          <p className='mt-1 text-xs text-red-600'>{errors.name.message}</p>
        )}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='script-description'>
          {dict.common?.description ?? 'Description'}
        </Label>
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <Textarea
              id='script-description'
              disabled={loading}
              placeholder={
                dict.scripts?.scriptDescription ??
                'Describe what this script does...'
              }
              rows={3}
              {...field}
            />
          )}
        />
        {errors.description && (
          <p className='mt-1 text-xs text-red-600'>
            {errors.description.message}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='script-owner'>{dict.common?.owner ?? 'Owner'}</Label>
        <Controller
          name='owner_id'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => {
            const selectedUser = usersQuery.data?.data?.find(
              (user) => user.id === field.value
            );
            const displayName = selectedUser
              ? `${selectedUser.first_name} ${selectedUser.last_name}`
              : `${script.owner.first_name} ${script.owner.last_name}`;

            return (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={loading || usersQuery.isLoading}
              >
                <SelectTrigger id='script-owner'>
                  <SelectValue>{displayName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {usersQuery.data?.data?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
        {errors.owner_id && (
          <p className='mt-1 text-xs text-red-600'>{errors.owner_id.message}</p>
        )}
      </div>

      {error && <div className='text-destructive'>{error}</div>}

      <Button
        variant='default'
        size='sm'
        className='w-full'
        type='submit'
        disabled={loading}
      >
        {loading ? dict.common.loading : dict.common.saveChanges}
      </Button>
    </form>
  );
}
