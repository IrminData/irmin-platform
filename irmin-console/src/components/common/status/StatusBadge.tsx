import { WorkflowStatus } from '@/types/api/Workflow';

/**
 * Status element
 *
 * @remarks
 *
 * This component is used to display a status label with a background color.
 * It can handle both Access status and Run status of Workflows and Repositories.
 */
export default function StatusBadge({
  accessStatus,
  runStatus,
  statusLabel,
}: {
  accessStatus?: 'private' | 'public' | 'connected';
  runStatus?: WorkflowStatus;
  statusLabel: string;
}) {
  const baseStyles = `flex h-full max-h-8 w-24 items-center justify-center rounded-full shadow-sm px-2 py-1 text-center text-white text-sm`;
  if (accessStatus) {
    switch (accessStatus) {
      case 'private':
        return (
          <div className={`bg-irmin_teal-400 ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'public':
        return (
          <div className={`bg-irmin_teal ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'connected':
        return (
          <div className={`bg-irmin_teal-600 ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      default:
        return (
          <div className={`bg-irmin_green ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
    }
  } else if (runStatus) {
    switch (runStatus) {
      case 'error':
        return (
          <div className={`bg-irmin_teal-400 ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'complete':
        return (
          <div className={`bg-irmin_teal ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'running':
        return (
          <div className={`bg-irmin_teal-600 ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'paused':
        return (
          <div className={`bg-gray-400 ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'pending':
        return (
          <div className={`bg-gray-400 ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      case 'initiating':
        return (
          <div className={`bg-gray-400 ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
      default:
        return (
          <div className={`bg-irmin_green ${baseStyles}`}>
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </div>
        );
    }
  } else {
    return (
      <div className={`bg-irmin_teal ${baseStyles}`}>
        {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
      </div>
    );
  }
}
