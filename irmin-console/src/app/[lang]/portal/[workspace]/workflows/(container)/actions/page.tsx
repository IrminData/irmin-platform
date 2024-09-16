'use client';

import { useRouter } from 'next/navigation';

import ActionWorkflowsSection from '@/components/workflow/ActionWorkflowsSection';

/**
 * Action Workflows page in the workspace
 *
 * Uses {@link ActionWorkflowsSection} to provide UI to list action workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default function ActionWorkflowsPage() {
  const router = useRouter();
  return (
    <ActionWorkflowsSection
      sideModalOpen={false}
      onModalOpen={() => {
        router.push('actions/create');
      }}
      onModalClose={() => {}}
    />
  );
}
