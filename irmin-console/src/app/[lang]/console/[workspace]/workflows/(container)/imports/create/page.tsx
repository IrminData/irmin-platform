'use client';

import { useRouter } from 'next/navigation';

import ImportWorkflowsSection from '@/components/workflow/ImportWorkflowsSection';

/**
 * Page to create a new Import Workflow in the workspace
 *
 * Uses {@link ImportWorkflowsSection} to provide UI for new Import Workflow creation with a pre-opened side modal
 *
 * @remarks
 *
 * If the user tries to close the modal, it navigates back to the import workflows page.
 */
export default function ImportWorkflowCreatePage() {
  const router = useRouter();
  return (
    <ImportWorkflowsSection
      sideModalOpen={true}
      onModalClose={() => {
        router.push('../imports');
      }}
    />
  );
}
