import type IrminCore from '@/lib/core';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { SearchFilters, SearchResponse } from '@/types/core/Search';

/**
 * Search API service
 *
 * Responsible for all search-related API calls.
 */
class SearchService {
  private irminCore: IrminCore;

  /**
   * Create a new SearchService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.search = this.search.bind(this);
  }

  /**
   * Perform a workspace-wide search using the provided filters.
   *
   * @param props - The parameters.
   * @param props.workspace - The workspace slug.
   * @param props.params - The search filters to apply.
   * @returns IrminAPIResponse containing the search results.
   */
  async search({
    workspace,
    params,
  }: {
    workspace: string;
    params: SearchFilters;
  }): Promise<IrminAPIResponse<SearchResponse>> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      if (params.query) {
        queryParams.append('q', params.query);
      }
      if (params.types && params.types.length > 0) {
        queryParams.append('types', params.types.join(','));
      }
      if (params.tags && params.tags.length > 0) {
        queryParams.append('tags', params.tags.join(','));
      }
      if (params.owner_id) {
        queryParams.append('owner_id', params.owner_id);
      }
      if (params.date_from) {
        queryParams.append('date_from', params.date_from);
      }
      if (params.date_to) {
        queryParams.append('date_to', params.date_to);
      }
      if (params.limit && params.limit > 0) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.offset && params.offset > 0) {
        queryParams.append('offset', params.offset.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = `/v1/workspaces/${workspace}/search${queryString ? `?${queryString}` : ''}`;

      const response = await this.irminCore.fetchAPI(endpoint, {
        method: 'GET',
      });
      return response as IrminAPIResponse<SearchResponse>;
    } catch (error) {
      console.error((error as Error).message, 'Search error');
      throw error;
    }
  }
}

export default SearchService;
