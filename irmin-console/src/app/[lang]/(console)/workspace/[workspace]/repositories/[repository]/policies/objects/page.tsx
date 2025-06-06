import RepositoryPoliciesSection from '@/components/repository/RepositoryPoliciesSection';

import { PolicyResource } from '@/types/core/Policy';

/**
 * Page for the Repository objects policies
 */
export default async function RepositoryObjectsPoliciesPage() {
  return <RepositoryPoliciesSection type={PolicyResource.RepositoryObject} />;
}
