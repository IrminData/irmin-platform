'use client';

import { useRouter } from 'next/navigation';

import ImportWorkflowsSection from '@/components/workflow/ImportWorkflowsSection';

/**
 * Import Workflows page in the workspace
 *
 * Uses {@link ImportWorkflowsSection} to provide UI to list import workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default function ImportWorkflowsPage() {
  const router = useRouter();
  return (
    <ImportWorkflowsSection
      sideModalOpen={false}
      onModalOpen={() => {
        router.push('imports/create');
      }}
      onModalClose={() => {}}
    />
  );
}
