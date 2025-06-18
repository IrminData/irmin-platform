import IrminCore from '@/lib/core';

import { Commit } from '@/types/core/Commit';
import { Diff, MergeStrategy } from '@/types/core/Diff';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Interface for merging refs
 */
interface MergeRefsRequest {
  base_ref: string;
  compare_ref: string;
  description?: string;
  strategy?: string;
  squash?: boolean;
  allow_empty?: boolean;
}

/**
 * Diff Service: Merge and Compare API
 *
 * Provides methods to compare repository refs and merge them.
 */
class DiffService {
  private irminCore: IrminCore;

  /**
   * Create a new DiffService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.compareRefs = this.compareRefs.bind(this);
    this.mergeRefs = this.mergeRefs.bind(this);
  }

  /**
   * Compare two refs in a repository and return the differences.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.baseRef - The base ref.
   * @param props.compareRef - The ref to compare.
   * @returns IrminAPIResponse containing a Diff.
   */
  async compareRefs({
    workspace,
    repository,
    baseRef,
    compareRef,
  }: {
    workspace: string;
    repository: string;
    baseRef: string;
    compareRef: string;
  }): Promise<IrminAPIResponse<Diff>> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('base_ref', baseRef);
      urlParams.append('compare_ref', compareRef);
      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/compare?${urlParams.toString()}`,
        { method: 'GET' }
      )) as IrminAPIResponse<Diff>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Error comparing refs');
      throw error;
    }
  }

  /**
   * Merge one ref into another ref in a repository.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.baseRef - The base ref.
   * @param props.compareRef - The ref to merge from.
   * @param props.description - The merge commit description.
   * @param props.mergeStrategy - The merge strategy.
   * @param props.squash - Whether to squash changes.
   * @param props.allowEmpty - Whether to allow an empty merge.
   * @returns IrminAPIResponse containing the merge commit.
   */
  async mergeRefs({
    workspace,
    repository,
    baseRef,
    compareRef,
    description,
    mergeStrategy,
    squash,
    allowEmpty,
  }: {
    workspace: string;
    repository: string;
    baseRef: string;
    compareRef: string;
    description: string;
    mergeStrategy: MergeStrategy;
    squash: boolean;
    allowEmpty: boolean;
  }): Promise<IrminAPIResponse<Commit>> {
    try {
      const requestBody: MergeRefsRequest = {
        base_ref: baseRef,
        compare_ref: compareRef,
        description,
        strategy: mergeStrategy,
        squash,
        allow_empty: allowEmpty,
      };

      const response = (await this.irminCore.fetchAPI(
        `/v1/workspaces/${workspace}/repositories/${repository}/merge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )) as IrminAPIResponse<Commit>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Error merging refs');
      throw error;
    }
  }
}

export default DiffService;
