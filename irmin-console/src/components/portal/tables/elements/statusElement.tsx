import { WorkflowStatus } from '@/types/api/Workflow';

/**
 * Status element
 *
 * @remarks
 *
 * This component is used to display a status element in a table.
 * It can handle both access status and run status of workflows and datasets.
 */
export default function StatusElement({
  accessStatus,
  runStatus,
  statusLabel,
}: {
  accessStatus?: 'private' | 'public' | 'connected';
  runStatus?: WorkflowStatus;
  statusLabel: string;
}) {
  if (accessStatus) {
    switch (accessStatus) {
      case 'private':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_teal-400 px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'public':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_teal px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'connected':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_teal-600 px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      default:
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_green px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
    }
  } else if (runStatus) {
    switch (runStatus) {
      case 'error':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_teal-400 px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'complete':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_teal px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'running':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_teal-600 px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'paused':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-gray-400 px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'pending':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-gray-400 px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'initiating':
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-gray-400 px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      default:
        return (
          <div
            className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_green px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
          >
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
    }
  } else {
    return (
      <div
        className={`flex h-full max-h-8 max-w-32 items-center justify-center rounded-full bg-irmin_teal px-2 py-1 text-center text-white shadow-sm lg:w-32 lg:max-w-full`}
      >
        {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
      </div>
    );
  }
}
