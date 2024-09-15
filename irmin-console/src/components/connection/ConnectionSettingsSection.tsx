'use client';

import { useCallback, useState } from 'react';

import ReactSelect from 'react-select';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Connection } from '@/types/api/Connection';

/**
 * Connection Settings section component
 *
 * @param props0 - The props
 * @param props0.connection - The connection to view and edit settings for
 */
const ConnectionSettingsSection = ({
  connection,
}: {
  connection: Connection;
}) => {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const {
    workspaces: { currentWorkspace },
    connections: { updateConnection, deleteConnection, reassignConnection },
  } = useWorkspace();

  const [nameField, setNameField] = useState(connection?.name ?? '');
  const [descriptionField, setDescriptionField] = useState(
    connection?.description ?? ''
  );
  const [ownerField, setOwnerField] = useState(connection?.owner ?? null);

  /**
   * Updates the workflow with the new details provided
   * Uses {@link updateConnection} to update the connection details
   * Uses {@link reassignConnection} to change the owner of the connection
   * Shows {@link irminAlert} on success or error
   */
  const handleUpdateConnection = useCallback(async () => {
    try {
      if (ownerField && ownerField?.id !== connection.owner.id) {
        // Change the owner of the connection if it's different
        await reassignConnection(connection.id, ownerField);
        irminAlert('success', dict.connections.settings.connectionOwnerChanged);
      }
      // Update other details
      const name = nameField.trim();
      const description = descriptionField.trim();
      await updateConnection(connection.id, {
        ...connection,
        name: name,
        description: description,
      });
      irminAlert('success', dict.connections.settings.connectionUpdated);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.connections.settings.errorUpdatingConnection
      );
    }
  }, [
    connection,
    updateConnection,
    reassignConnection,
    nameField,
    descriptionField,
    ownerField,
    irminAlert,
    dict,
  ]);

  /**
   * Deletes the workflow after confirming with the user
   * Uses {@link deleteWorkflow} to delete the workflow
   * Shows {@link irminAlert} on success or error
   */
  const handleDeleteConnection = useCallback(() => {
    try {
      irminConfirm(
        'warning',
        dict.connections.settings.areYouSureYouWantToDelete,
        (confirmed) => {
          if (confirmed) {
            deleteConnection(connection.id);
            irminAlert('success', dict.connections.settings.connectionUpdated);
          }
        }
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.connections.settings.errorUpdatingConnection
      );
    }
  }, [connection, irminConfirm, deleteConnection, irminAlert, dict]);

  let details = {};
  let settings = {};
  try {
    details = JSON.parse(connection.details ?? '{}');
    settings = JSON.parse(connection.settings ?? '{}');
  } catch (error) {
    console.error('Error parsing connection details or settings:', error);
  }

  return (
    <div className='container relative mx-auto my-12 max-w-6xl px-4'>
      <div className='min-h-96 w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-3 py-8 shadow-md dark:bg-irmin_black-600 dark:shadow-black'>
        <div className='mb-8 flex flex-row items-center justify-between px-2'>
          <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
            {dict.connections.settings.title}
          </h2>
        </div>
        <div className='flex flex-col gap-4'>
          <table className='w-full text-sm lg:text-lg'>
            <tbody>
              <tr className='border-b border-gray-200 dark:border-gray-700'>
                <td className='p-3 font-bold'>
                  {dict.connections.settings.connector}
                </td>
                <td className='p-3'>{connection.connector.name}</td>
              </tr>
              {Object.entries(details).map(([key, value]) => (
                <tr
                  key={`details-${key}`}
                  className='border-b border-gray-200 dark:border-gray-700'
                >
                  <td className='p-3 font-bold capitalize'>{key}</td>
                  <td className='p-3'>{`${value}`}</td>
                </tr>
              ))}
              {Object.entries(settings).map(([key, value]) => (
                <tr
                  key={`settings-${key}`}
                  className='border-b border-gray-200 dark:border-gray-700'
                >
                  <td className='p-3 font-bold capitalize'>{key}</td>
                  <td className='p-3'>{`${value}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <label className='mb-2 block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
              {dict.connections.settings.name}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='h-11 w-full'
              type='text'
              name='name'
              defaultValue={nameField}
              onChange={(e) => setNameField(e.target.value)}
            />
          </div>
          <div>
            <label className='mb-2 block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
              {dict.connections.settings.description}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='w-full'
              type='text'
              name='name'
              defaultValue={descriptionField}
              onChange={(e) => setDescriptionField(e.target.value)}
              longtext={{
                rows: 3,
              }}
            />
          </div>
          <div>
            <label className='mb-2 block text-xs text-gray-400 md:text-sm dark:text-gray-600'>
              {dict.connections.settings.owner}
            </label>
            <ReactSelect
              value={ownerField}
              onChange={(newValue) => {
                if (!newValue) return;
                setOwnerField(newValue);
              }}
              options={currentWorkspace?.users ?? []}
              getOptionLabel={(option) => option.email}
              className='react-select-container'
              classNamePrefix='react-select'
            />
          </div>
          <Button
            className='h-11 w-full'
            type='submit'
            size='sm'
            colorScheme='primary'
            variant='solid'
            onClick={handleUpdateConnection}
          >
            {dict.connections.settings.saveChanges}
          </Button>
          <div className='mt-8'>
            <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
              {dict.connections.settings.dangerZone}
            </p>
            <p className='mt-2 text-xs text-gray-700 md:text-base dark:text-gray-200'>
              {dict.connections.settings.deletionNote}
            </p>
            <Button
              className='mt-4 dark:bg-gray-800 dark:text-white'
              size='sm'
              colorScheme='secondary'
              variant='outline'
              onClick={handleDeleteConnection}
            >
              {dict.connections.settings.delete}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionSettingsSection;
