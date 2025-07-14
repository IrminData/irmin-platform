'use client';

import { useCallback, useState } from 'react';

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

import { useLocale } from '@/context/LocaleContext';

interface FormValues {
  branchName: string;
  fromBranch: string;
}

/**
 * Modal content to create a new branch.
 *
 * @param props - The props
 * @param props.branches - The list of existing branches to create the new branch from
 * @param props.createBranch - Callback to create a new branch
 */
export default function CreateBranchModalContent({
  branches,
  createBranch,
}: {
  branches: string[];
  createBranch: (branchName: string, fromBranch: string) => Promise<void>;
}) {
  const { dict } = useLocale();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      branchName: '',
      fromBranch: 'main',
    },
  });

  const [loading, setLoading] = useState(false);
  const onSubmit = useCallback(
    async (data: FormValues) => {
      setLoading(true);
      try {
        await createBranch(data.branchName, data.fromBranch);
      } catch (error) {
        console.error('Failed to create branch', error);
      } finally {
        setLoading(false);
      }
    },
    [createBranch]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-4 pb-8'
    >
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.branches.newBranchName}</Label>
        <Controller
          name='branchName'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Input {...field} disabled={loading} />
              {errors.branchName && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.branchName.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.repository.branches.fromBranch}</Label>
        <Controller
          name='fromBranch'
          control={control}
          rules={{ required: dict.common.fieldRequired }}
          render={({ field }) => (
            <>
              <Select
                disabled={loading}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder={dict.repository.branches.branches}>
                    {field.value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fromBranch && (
                <p className='mt-1 text-xs text-red-600'>
                  {errors.fromBranch.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <Button
        variant='default'
        className='w-full'
        type='submit'
        loading={loading}
      >
        {dict.repository.branches.createBranch}
      </Button>
    </form>
  );
}
