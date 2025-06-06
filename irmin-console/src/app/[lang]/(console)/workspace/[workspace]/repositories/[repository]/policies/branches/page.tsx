import RepositoryPoliciesSection from '@/components/repository/RepositoryPoliciesSection';

import { PolicyResource } from '@/types/core/Policy';

/**
 * Page for the Repository branches policies
 */
export default async function RepositoryBranchesPoliciesPage() {
  return <RepositoryPoliciesSection type={PolicyResource.RepositoryBranch} />;
}
