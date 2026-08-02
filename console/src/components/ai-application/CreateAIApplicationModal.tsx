'use client';

import { useState } from 'react';

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
import { Textarea } from '@/components/ui/textarea';

import { useLocale } from '@/context/LocaleContext';

import { useAIApplications } from '@/hooks/api';

interface CreateAIApplicationModalProps {
  isOpen: boolean;
  closeModal: () => void;
}

/**
 * Modal for creating a new AI Application
 */
export default function CreateAIApplicationModal({
  isOpen,
  closeModal,
}: CreateAIApplicationModalProps) {
  const { dict } = useLocale();
  const { createAIApplicationMutation } = useAIApplications();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    closeModal();
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      await createAIApplicationMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        tools: {
          query_enabled: true,
          schema_enabled: true,
          list_objects_enabled: true,
          get_content_enabled: true,
          vector_search_enabled: false,
          docs_enabled: false,
        },
      });
      resetForm();
      closeModal();
    } catch (error) {
      // Error is handled by the mutation
      console.error('Failed to create AI Application', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{dict.aiApplication.createAIApplication}</DialogTitle>
          <DialogDescription>
            {
              dict.consoleNavigation.staticSearchItems.description
                .createAIApplication
            }
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>{dict.common.name}</Label>
            <Input
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Customer Analytics App'
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='description'>
              {dict.common.description} ({dict.common.optional.toLowerCase()})
            </Label>
            <Textarea
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='AI application for analyzing customer data...'
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleClose}>
            {dict.common.cancel}
          </Button>
          <Button
            variant='gradient'
            onClick={handleCreate}
            disabled={!name.trim() || createAIApplicationMutation.isPending}
          >
            {createAIApplicationMutation.isPending
              ? `${dict.common.create}...`
              : dict.aiApplication.createAIApplication}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
