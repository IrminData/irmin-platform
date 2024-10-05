import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Diff } from '@/types/core/Diff';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { diff } from '@/types/examples/core/diff';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

/**
 * Comparison API response interface
 */
export interface ComparisonAPIResponse extends IrminAPIResponse {
  data: Diff;
}

/**
 * Diff Service: Merge and Compare API
 *
 * Responsible for merging and comparing repository branches and refs.
 */
class DiffService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.compareRefs = this.compareRefs.bind(this);
    this.mergeRefs = this.mergeRefs.bind(this);
  }

  /**
   * Compare two refs in a repository and return the differences
   *
   * To get uncommited changes, use the latest commit as the base ref and the current branch as the compare ref
   *
   * @param repository - The repository refs are in
   * @param baseRef - The base ref to compare (branch, tag, commit)
   * @param compareRef - The ref to compare against (branch, tag, commit)
   */
  async compareRefs(
    repository: string,
    baseRef: string,
    compareRef: string
  ): Promise<ComparisonAPIResponse> {
    if (isOfflineMode)
      return fake(
        diff({
          repository,
          base: baseRef,
          compare: compareRef,
        })
      ) as ComparisonAPIResponse;
    try {
      // Construct the query parameters from the props
      const urlParams = new URLSearchParams();
      urlParams.append('base_ref', baseRef);
      urlParams.append('compare_ref', compareRef);
      const response = (await this.irminCore.fetch(
        `/v1/repositories/${repository}/compare?${urlParams.toString()}`,
        {
          method: 'GET',
        }
      )) as ComparisonAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Error comparing refs');
      if (isDevelopment)
        return fake(
          diff({
            repository,
            base: baseRef,
            compare: compareRef,
          })
        ) as ComparisonAPIResponse;
      throw error;
    }
  }

  /**
   * Merge one ref in to another
   *
   * @param repository - The repository refs are in
   * @param baseRef - The ref to merge into (branch, tag, commit)
   * @param compareRef - The ref to merge (branch, tag, commit)
   * @param description - The commit message
   * @param mergeStrategy - The merge strategy (default, source-wins, dest-wins)
   */
  async mergeRefs(
    repository: string,
    baseRef: string,
    compareRef: string,
    description: string,
    mergeStrategy: string
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return fake() as IrminAPIResponse;
    try {
      const formData = new FormData();

      formData.append('base_ref', baseRef);
      formData.append('compare_ref', compareRef);
      formData.append('description', description);
      formData.append('strategy', mergeStrategy);

      const response = await this.irminCore.fetch(
        `/v1/repositories/${repository}/merge`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Error merging refs');
      if (isDevelopment) return fake() as IrminAPIResponse;
      throw error;
    }
  }
}

export default DiffService;
