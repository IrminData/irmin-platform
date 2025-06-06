import RepositoryPoliciesSection from '@/components/repository/RepositoryPoliciesSection';

import { PolicyResource } from '@/types/core/Policy';

/**
 * Page for the Repository policies
 */
export default async function RepositoryPoliciesPage() {
  return <RepositoryPoliciesSection type={PolicyResource.Repository} />;
}
