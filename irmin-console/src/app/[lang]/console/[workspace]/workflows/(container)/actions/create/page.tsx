'use client';

import { useRouter } from 'next/navigation';

import ActionWorkflowsSection from '@/components/workflow/ActionWorkflowsSection';

/**
 * Page to create a new Action Workflow in the workspace
 *
 * Uses {@link ActionWorkflowsSection} to provide UI for new Action Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the action workflows page.
 */
export default function ActionWorkflowCreatePage() {
  const router = useRouter();
  return (
    <ActionWorkflowsSection
      sideModalOpen={true}
      onModalClose={() => {
        router.push('../actions');
      }}
    />
  );
}
