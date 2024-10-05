import RepositorySection from '@/components/repository/RepositorySection';

import { QueryProvider } from '@/context/QueryContext';

/**
 * Page for the Repository viewer
 *
 * Uses {@link RepositorySection} to display the Repository viewer
 */
export default function RepositoryPage() {
  return (
    <QueryProvider>
      <RepositorySection />
    </QueryProvider>
  );
}
