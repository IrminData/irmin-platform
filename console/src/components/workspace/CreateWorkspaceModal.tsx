'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaceActions } from '@/hooks/api';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  closeModal: () => void;
}

/**
 * Modal for creating a new workspace
 */
export default function CreateWorkspaceModal({
  isOpen,
  closeModal,
}: CreateWorkspaceModalProps) {
  const { dict } = useLocale();
  const { createMutation } = useWorkspaceActions();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    resetForm();
    closeModal();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      });
      resetForm();
      closeModal();
    } catch (error) {
      // Error is handled by the mutation
      console.error('Failed to create workspace', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='sm:max-w-[500px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {dict.workspaceSwitcher.createNewWorkspace}
            </DialogTitle>
            <DialogDescription>
              {dict.workspaceSwitcher.createNewWorkspaceDescription}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='workspace-name'>
                {dict.workspace.workspaceName}
              </Label>
              <Input
                id='workspace-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={dict.workspace.workspaceName}
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='workspace-description'>
                {dict.workspace.workspaceDescription} (
                {dict.common.optional.toLowerCase()})
              </Label>
              <Input
                id='workspace-description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={dict.workspace.workspaceDescription}
                maxLength={255}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              {dict.common.cancel}
            </Button>
            <Button
              type='submit'
              variant='gradient'
              disabled={!name.trim() || createMutation.isPending}
              loading={createMutation.isPending}
            >
              {dict.workspaceSwitcher.createNewWorkspace}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
