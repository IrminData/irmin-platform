import RepositoryPoliciesSection from '@/components/repository/RepositoryPoliciesSection';

import { PolicyResource } from '@/types/core/Policy';

/**
 * Page for the Repository tags policies
 */
export default async function RepositoryTagsPoliciesPage() {
  return <RepositoryPoliciesSection type={PolicyResource.RepositoryTag} />;
}
