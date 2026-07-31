'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  TbCheck,
  TbCopy,
  TbPencil,
  TbPlus,
  TbRefresh,
  TbTrash,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { useConnectionSubscriptions } from '@/hooks/api';

import type {
  ConnectionSubscription,
  ConnectionSubscriptionWithToken,
  CreateConnectionSubscriptionRequest,
  UpdateConnectionSubscriptionRequest,
} from '@/types/core/ConnectionSubscription';

/**
 * Subscription management section for connections
 */
const ConnectionSubscriptionsSection = () => {
  const { dict } = useLocale();
  const { connectionID, connectionQuery } = useConnectionContext();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [newSubscription, setNewSubscription] =
    useState<ConnectionSubscriptionWithToken | null>(null);
  const [editingSubscription, setEditingSubscription] =
    useState<ConnectionSubscription | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [regeneratingSubscriptionId, setRegeneratingSubscriptionId] = useState<
    string | null
  >(null);

  // Form state for creating subscriptions
  const [formData, setFormData] = useState<CreateConnectionSubscriptionRequest>(
    {
      name: '',
      description: '',
      filter_paths: [],
      event_types: [],
    }
  );

  // Form state for editing subscriptions
  const [editFormData, setEditFormData] =
    useState<UpdateConnectionSubscriptionRequest>({});

  // Check if connector supports patch_event capability
  const supportsPatchEvent = useMemo(() => {
    return connectionQuery.data?.data?.connector?.capabilities?.includes(
      'patch_event'
    );
  }, [connectionQuery.data?.data?.connector?.capabilities]);

  // Use the connection subscriptions hook
  const {
    subscriptionsQuery,
    createSubscriptionMutation,
    updateSubscriptionMutation,
    deleteSubscriptionMutation,
    regenerateTokenMutation,
  } = useConnectionSubscriptions(connectionID, supportsPatchEvent ?? false);

  // Destructure mutate functions for useCallback dependencies
  const { mutate: createSubscription } = createSubscriptionMutation;
  const { mutate: updateSubscription } = updateSubscriptionMutation;
  const { mutate: deleteSubscription } = deleteSubscriptionMutation;
  const { mutate: regenerateToken } = regenerateTokenMutation;

  const handleCopyToClipboard = useCallback((key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((currentKey) => (currentKey === key ? null : currentKey));
    }, 2000);
  }, []);

  const handleCreateSubscription = useCallback(() => {
    createSubscription(formData, {
      onSuccess: (response) => {
        setIsCreateModalOpen(false);
        if (response.data) {
          setNewSubscription(response.data);
          setIsTokenModalOpen(true);
        }
        setFormData({
          name: '',
          description: '',
          filter_paths: [],
          event_types: [],
        });
      },
    });
  }, [createSubscription, formData]);

  const handleOpenEditModal = useCallback(
    (subscription: ConnectionSubscription) => {
      setEditingSubscription(subscription);
      setEditFormData({
        name: subscription.name,
        description: subscription.description,
        filter_paths: subscription.filter_paths,
        event_types: subscription.event_types,
        is_active: subscription.is_active,
      });
      setIsEditModalOpen(true);
    },
    []
  );

  const handleUpdateSubscription = useCallback(() => {
    if (!editingSubscription) return;
    updateSubscription(
      { subscriptionID: editingSubscription.id, data: editFormData },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setEditingSubscription(null);
          setEditFormData({});
        },
      }
    );
  }, [updateSubscription, editingSubscription, editFormData]);

  const handleDeleteSubscription = useCallback(
    (subscriptionId: string) => {
      deleteSubscription(subscriptionId);
    },
    [deleteSubscription]
  );

  const handleRegenerateToken = useCallback(
    (subscriptionId: string) => {
      setRegeneratingSubscriptionId(subscriptionId);
      regenerateToken(subscriptionId, {
        onSuccess: (response) => {
          setRegeneratingSubscriptionId(null);
          if (response.data) {
            setNewSubscription(response.data);
            setIsTokenModalOpen(true);
          }
        },
        onError: () => {
          setRegeneratingSubscriptionId(null);
        },
      });
    },
    [regenerateToken]
  );

  // Don't render if connector doesn't support patch_event
  if (!supportsPatchEvent) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>{dict.subscriptions.title}</CardTitle>
          <Button
            size='sm'
            onClick={() => setIsCreateModalOpen(true)}
            className='gap-2'
          >
            <TbPlus className='size-4' />
            {dict.subscriptions.create}
          </Button>
        </CardHeader>
        <CardContent>
          {subscriptionsQuery.isLoading ? (
            <div className='py-4 text-center text-muted-foreground'>
              {dict.common.loading}
            </div>
          ) : subscriptionsQuery.data?.data?.length === 0 ? (
            <div className='py-4 text-center text-muted-foreground'>
              {dict.subscriptions.noSubscriptions}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.common.name}</TableHead>
                  <TableHead>{dict.subscriptions.eventTypes}</TableHead>
                  <TableHead>{dict.subscriptions.filterPaths}</TableHead>
                  <TableHead>{dict.subscriptions.status}</TableHead>
                  <TableHead className='text-right'>
                    {dict.common.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionsQuery.data?.data?.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className='font-medium'>
                      {subscription.name}
                    </TableCell>
                    <TableCell>
                      {subscription.event_types?.length
                        ? subscription.event_types.join(', ')
                        : dict.subscriptions.allEvents}
                    </TableCell>
                    <TableCell>
                      {subscription.filter_paths?.length
                        ? subscription.filter_paths.join(', ')
                        : dict.subscriptions.allPaths}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          subscription.is_active ? 'default' : 'secondary'
                        }
                      >
                        {subscription.is_active
                          ? dict.subscriptions.active
                          : dict.subscriptions.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() =>
                            handleCopyToClipboard(
                              `url-${subscription.id}`,
                              subscription.webhook_url || ''
                            )
                          }
                          title={
                            copiedKey === `url-${subscription.id}`
                              ? dict.common.copied
                              : dict.subscriptions.copyWebhookUrl
                          }
                          aria-label={dict.subscriptions.copyWebhookUrl}
                        >
                          {copiedKey === `url-${subscription.id}` ? (
                            <TbCheck className='size-4 text-green-500' />
                          ) : (
                            <TbCopy className='size-4' />
                          )}
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleOpenEditModal(subscription)}
                          title={dict.common.edit}
                          aria-label={dict.common.edit}
                        >
                          <TbPencil className='size-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleRegenerateToken(subscription.id)}
                          disabled={regeneratingSubscriptionId !== null}
                          title={dict.subscriptions.regenerateToken}
                          aria-label={dict.subscriptions.regenerateToken}
                        >
                          <TbRefresh
                            className={`
                              size-4
                              ${
                                regeneratingSubscriptionId === subscription.id
                                  ? `animate-spin`
                                  : ''
                              }
                            `}
                          />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className={`
                            text-destructive
                            hover:text-destructive
                          `}
                          onClick={() =>
                            handleDeleteSubscription(subscription.id)
                          }
                          title={dict.common.delete}
                        >
                          <TbTrash className='size-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Subscription Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.subscriptions.createTitle}</DialogTitle>
            <DialogDescription>
              {dict.subscriptions.createDescription}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='subscription-name'>{dict.common.name}</Label>
              <Input
                id='subscription-name'
                placeholder={dict.subscriptions.namePlaceholder}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='subscription-description'>
                {dict.common.description}
              </Label>
              <Input
                id='subscription-description'
                placeholder={dict.subscriptions.descriptionPlaceholder}
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='subscription-event-types'>
                {dict.subscriptions.eventTypes}
              </Label>
              <Select
                value={formData.event_types?.join(',') || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setFormData({ ...formData, event_types: [] });
                  } else {
                    setFormData({
                      ...formData,
                      event_types: value.split(',') as (
                        | 'insert'
                        | 'update'
                        | 'delete'
                        | 'upsert'
                      )[],
                    });
                  }
                }}
              >
                <SelectTrigger id='subscription-event-types'>
                  <SelectValue
                    placeholder={dict.subscriptions.selectEventTypes}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>
                    {dict.subscriptions.allEvents}
                  </SelectItem>
                  <SelectItem value='insert'>insert</SelectItem>
                  <SelectItem value='update'>update</SelectItem>
                  <SelectItem value='delete'>delete</SelectItem>
                  <SelectItem value='upsert'>upsert</SelectItem>
                  <SelectItem value='insert,update'>insert, update</SelectItem>
                  <SelectItem value='insert,update,delete'>
                    insert, update, delete
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='subscription-filter-paths'>
                {dict.subscriptions.filterPaths}
              </Label>
              <Input
                id='subscription-filter-paths'
                placeholder={dict.subscriptions.filterPathsPlaceholder}
                value={formData.filter_paths?.join(', ') || ''}
                onChange={(e) => {
                  const paths = e.target.value
                    .split(',')
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  setFormData({ ...formData, filter_paths: paths });
                }}
              />
              <p className='text-xs text-muted-foreground'>
                {dict.subscriptions.filterPathsHelp}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsCreateModalOpen(false)}
            >
              {dict.common.cancel}
            </Button>
            <Button
              onClick={handleCreateSubscription}
              loading={createSubscriptionMutation.isPending}
              disabled={!formData.name}
            >
              {dict.subscriptions.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.subscriptions.editTitle}</DialogTitle>
            <DialogDescription>
              {dict.subscriptions.editDescription}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='edit-subscription-name'>{dict.common.name}</Label>
              <Input
                id='edit-subscription-name'
                placeholder={dict.subscriptions.namePlaceholder}
                value={editFormData.name ?? ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='edit-subscription-description'>
                {dict.common.description}
              </Label>
              <Input
                id='edit-subscription-description'
                placeholder={dict.subscriptions.descriptionPlaceholder}
                value={editFormData.description ?? ''}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='edit-subscription-event-types'>
                {dict.subscriptions.eventTypes}
              </Label>
              <Select
                value={editFormData.event_types?.join(',') || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setEditFormData({ ...editFormData, event_types: [] });
                  } else {
                    setEditFormData({
                      ...editFormData,
                      event_types: value.split(',') as (
                        | 'insert'
                        | 'update'
                        | 'delete'
                        | 'upsert'
                      )[],
                    });
                  }
                }}
              >
                <SelectTrigger id='edit-subscription-event-types'>
                  <SelectValue
                    placeholder={dict.subscriptions.selectEventTypes}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>
                    {dict.subscriptions.allEvents}
                  </SelectItem>
                  <SelectItem value='insert'>insert</SelectItem>
                  <SelectItem value='update'>update</SelectItem>
                  <SelectItem value='delete'>delete</SelectItem>
                  <SelectItem value='upsert'>upsert</SelectItem>
                  <SelectItem value='insert,update'>insert, update</SelectItem>
                  <SelectItem value='insert,update,delete'>
                    insert, update, delete
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='edit-subscription-filter-paths'>
                {dict.subscriptions.filterPaths}
              </Label>
              <Input
                id='edit-subscription-filter-paths'
                placeholder={dict.subscriptions.filterPathsPlaceholder}
                value={editFormData.filter_paths?.join(', ') ?? ''}
                onChange={(e) => {
                  const paths = e.target.value
                    .split(',')
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  setEditFormData({ ...editFormData, filter_paths: paths });
                }}
              />
              <p className='text-xs text-muted-foreground'>
                {dict.subscriptions.filterPathsHelp}
              </p>
            </div>
            <div className='flex items-center justify-between gap-4'>
              <div className='flex flex-col gap-1'>
                <Label htmlFor='edit-subscription-active'>
                  {dict.subscriptions.status}
                </Label>
                <p className='text-xs text-muted-foreground'>
                  {dict.subscriptions.activeHelp}
                </p>
              </div>
              <Switch
                id='edit-subscription-active'
                checked={editFormData.is_active ?? true}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingSubscription(null);
                setEditFormData({});
              }}
            >
              {dict.common.cancel}
            </Button>
            <Button
              onClick={handleUpdateSubscription}
              loading={updateSubscriptionMutation.isPending}
              disabled={!editFormData.name}
            >
              {dict.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Display Modal */}
      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.subscriptions.webhookCredentials}</DialogTitle>
            <DialogDescription>
              {dict.subscriptions.webhookCredentialsDescription}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            {/* Auto-configuration notice */}
            <div
              className={`
                rounded-md border border-green-200 bg-green-50 p-3
                dark:border-green-800 dark:bg-green-950
              `}
            >
              <p
                className={`
                  text-sm text-green-800
                  dark:text-green-200
                `}
              >
                {dict.subscriptions.autoConfigureNotice}
              </p>
            </div>
            {/* Manual webhook notice */}
            <div
              className={`
                rounded-md border border-amber-200 bg-amber-50 p-3
                dark:border-amber-800 dark:bg-amber-950
              `}
            >
              <p
                className={`
                  text-sm text-amber-800
                  dark:text-amber-200
                `}
              >
                {dict.subscriptions.manualWebhookNotice}
              </p>
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.subscriptions.webhookUrl}</Label>
              <div className='flex gap-2'>
                <Input
                  value={newSubscription?.webhook_url || ''}
                  readOnly
                  className='font-mono text-sm'
                />
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() =>
                    handleCopyToClipboard(
                      'modal-url',
                      newSubscription?.webhook_url || ''
                    )
                  }
                  title={
                    copiedKey === 'modal-url'
                      ? dict.common.copied
                      : dict.common.copy
                  }
                >
                  {copiedKey === 'modal-url' ? (
                    <TbCheck className='size-4 text-green-500' />
                  ) : (
                    <TbCopy className='size-4' />
                  )}
                </Button>
              </div>
            </div>
            {newSubscription?.webhook_token && (
              <div className='flex flex-col gap-2'>
                <Label>{dict.subscriptions.webhookToken}</Label>
                <div className='flex gap-2'>
                  <Input
                    value={newSubscription.webhook_token}
                    readOnly
                    type='password'
                    className='font-mono text-sm'
                  />
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() =>
                      handleCopyToClipboard(
                        'modal-token',
                        newSubscription.webhook_token || ''
                      )
                    }
                    title={
                      copiedKey === 'modal-token'
                        ? dict.common.copied
                        : dict.common.copy
                    }
                  >
                    {copiedKey === 'modal-token' ? (
                      <TbCheck className='size-4 text-green-500' />
                    ) : (
                      <TbCopy className='size-4' />
                    )}
                  </Button>
                </div>
                <p className='text-xs text-destructive'>
                  {dict.subscriptions.tokenWarning}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsTokenModalOpen(false)}>
              {dict.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConnectionSubscriptionsSection;
