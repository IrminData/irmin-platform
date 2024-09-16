'use client';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Connection } from '@/types/api/Connection';

import WorkflowList from '@/components/workflow/WorkflowList';

/**
 * Connection Settings section component
 *
 * @param props0 - The props
 * @param props0.connection - The connection to view
 */
const ConnectionSection = ({ connection }: { connection: Connection }) => {
  const { dict } = useLocale();

  const {
    workflows: { imports, exports },
  } = useWorkspace();

  const loading = imports.isLoading || exports.isLoading;
  const relatedWorkflows = [
    ...imports.imports.filter(
      (item) => item.workflowable.connection.id === connection.id
    ),
    ...exports.exports.filter(
      (item) => item.workflowable.connection.id === connection.id
    ),
  ];

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
      <h2 className='mb-4 px-4 font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
        {dict.connections.configuration}
      </h2>
      <table className='mx-4 mb-12 w-full max-w-lg text-sm lg:text-lg'>
        <tbody>
          <tr className='border-b border-gray-200 dark:border-gray-700'>
            <td className='p-2 font-bold'>
              {dict.connections.settings.connector}
            </td>
            <td className='p-2'>{connection.connector.name}</td>
          </tr>
          {Object.entries(details).map(([key, value]) => (
            <tr
              key={`details-${key}`}
              className='border-b border-gray-200 dark:border-gray-700'
            >
              <td className='p-2 font-bold capitalize'>{key}</td>
              <td className='p-2'>{`${value}`}</td>
            </tr>
          ))}
          {Object.entries(settings).map(([key, value]) => (
            <tr
              key={`settings-${key}`}
              className='border-b border-gray-200 dark:border-gray-700'
            >
              <td className='p-2 font-bold capitalize'>{key}</td>
              <td className='p-2'>{`${value}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className='mb-0 px-4 font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
        {dict.connections.workflows}
      </h2>
      <WorkflowList workflows={relatedWorkflows} loading={loading} />
    </div>
  );
};

export default ConnectionSection;
