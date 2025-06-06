import RepositoryPoliciesSection from '@/components/repository/RepositoryPoliciesSection';

import { PolicyResource } from '@/types/core/Policy';

/**
 * Page for the Repository commits policies
 */
export default async function RepositoryCommitsPoliciesPage() {
  return <RepositoryPoliciesSection type={PolicyResource.RepositoryCommit} />;
}
