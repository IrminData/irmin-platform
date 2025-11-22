import type { Tag } from '@/types/core/Tag';

/**
 * Repository wizard data state
 */
export interface RepositoryWizardData {
  name: string;
  description: string;
  default_branch: string;
  tags?: Tag[];
}
