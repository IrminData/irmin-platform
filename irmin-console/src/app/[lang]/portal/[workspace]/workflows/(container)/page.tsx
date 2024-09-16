'use client';

import { useRouter } from 'next/navigation';

import WorkflowsSection from '@/components/workflow/WorkflowsSection';

/**
 * Workflows page in the workspace
 *
 * Uses {@link WorkflowsSection} to provide UI to list workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default function WorkflowsPage() {
  const router = useRouter();
  return (
    <WorkflowsSection
      sideModalOpen={false}
      onModalOpen={() => {
        router.push('workflows/create');
      }}
      onModalClose={() => {}}
    />
  );
}
