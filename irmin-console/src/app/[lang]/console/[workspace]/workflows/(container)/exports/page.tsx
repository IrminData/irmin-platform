'use client';

import { useRouter } from 'next/navigation';

import ExportWorkflowsSection from '@/components/workflow/ExportWorkflowsSection';

/**
 * Export Workflows page in the workspace
 *
 * Uses {@link ExportWorkflowsSection} to provide UI to list export workflows
 *
 * @remarks
 *
 * The creation side modal is not closed by default and when the user
 * clicks on the create button, it navigates to the create page, where
 * the side modal is pre-opened.
 */
export default function ExportWorkflowsPage() {
  const router = useRouter();
  return (
    <ExportWorkflowsSection
      sideModalOpen={false}
      onModalOpen={() => {
        router.push('exports/create');
      }}
      onModalClose={() => {}}
    />
  );
}
