import { Workspace, WorkspaceAPIResponse } from '@/types/Workspace';

const api_base = process.env.NEXT_PUBLIC_API_URL;

class WorkspaceService {
  private static instance: WorkspaceService;

  private constructor() {}

  public static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  /*
   * Fetch data from the API with credentials
   * @param {string} url - The URL to fetch data from
   * @param {RequestInit} options - The fetch options
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   */
  private async fetchWithCredentials(
    url: string,
    options: RequestInit
  ): Promise<WorkspaceAPIResponse> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Accept-Language': navigator.language ?? 'en',
        Referer: window.location.origin,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }

    return response.json();
  }

  /*
   * Fetch all workspaces
   * @returns {Promise<Workspace[]>} A promise that resolves to an array of Workspace objects
   */
  async getWorkspaces(): Promise<Workspace[]> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.data || typeof response.data === 'object') return [];
      return response.data;
    } catch (error) {
      console.error('Fetch workspaces error:', error);
      throw error;
    }
  }

  /*
   * Fetch a workspace by its slug
   * @param {string} workspaceSlug - The slug of the workspace to fetch
   * @returns {Promise<Workspace | null>} A promise that resolves to a Workspace object or null
   * if the workspace is not found
   */
  async getWorkspace(workspaceSlug: string): Promise<Workspace | null> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.data && !Array.isArray(response.data)) return response.data;
      return null;
    } catch (error) {
      console.error('Fetch workspace error:', error);
      throw error;
    }
  }

  /*
   * Create a new workspace
   * @param {string} name - The name of the workspace
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   */
  async createWorkspace(name: string): Promise<WorkspaceAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('name', name);

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Create workspace error:', error);
      throw error;
    }
  }

  /*
   * Update a workspace
   * @param {string} workspaceSlug - The slug of the workspace to update
   * @param {Workspace} workspace - The workspace object with updated values
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   */
  async updateWorkspace(
    workspaceSlug: string,
    workspace: Workspace
  ): Promise<WorkspaceAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('name', workspace.name);

      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}`,
        {
          method: 'PATCH',
          body: formData,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response;
    } catch (error) {
      console.error('Update workspace error:', error);
      throw error;
    }
  }

  /*
   * Delete a workspace
   * @param {string} workspaceSlug - The slug of the workspace to delete
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   */
  async deleteWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}`,
        {
          method: 'DELETE',
        }
      );

      return response;
    } catch (error) {
      console.error('Delete workspace error:', error);
      throw error;
    }
  }

  /*
   * Switch to a workspace
   * @param {string} workspaceSlug - The slug of the workspace to switch to
   * @returns {Promise<WorkspaceAPIResponse>} A promise that resolves to a WorkspaceAPIResponse object
   * */
  async switchWorkspace(workspaceSlug: string): Promise<WorkspaceAPIResponse> {
    try {
      const formData = new FormData();
      formData.append('workspace', workspaceSlug);
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/switch`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Switch workspace error:', error);
      throw error;
    }
  }
}

export default WorkspaceService;
