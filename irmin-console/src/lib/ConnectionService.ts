import {
  ConnectorAPIResponse,
  ConnectionSetupAPIResponse,
} from '@/types/Connector';
const api_base = process.env.NEXT_PUBLIC_API_URL;

class ConnectionService {
  private static instance: ConnectionService;

  private constructor() {}

  // Get the singleton instance of the ConnectionService class
  public static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  /**
   * Fetch data from the API with credentials
   * @param {string} url - The URL to fetch data from
   * @param {RequestInit} options - The fetch options
   * @returns {Promise<ConnectorAPIResponse>} A promise that resolves to a ConnectorAPIResponse object
   * */
  private async fetchWithCredentials(
    url: string,
    options: RequestInit
  ): Promise<ConnectorAPIResponse> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include credentials with every request
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

  /**
   * Fetch all connectors
   * @returns {Promise<ConnectorAPIResponse>} A promise that resolves to a ConnectorAPIResponse object
   * */
  async fetchAllConnectors(): Promise<ConnectorAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/connectors`,
        {
          method: 'GET',
        }
      );
      return response;
    } catch (error) {
      console.error('Fetch connectors error:', error);
      throw error;
    }
  }

  async fetchNewConnectionDetails(
    workspaceSlug: string,
    connectorID: number
  ): Promise<ConnectionSetupAPIResponse> {
    try {
      const response = await this.fetchWithCredentials(
        `${api_base}/v1/workspaces/${workspaceSlug}/connections/new/details?connector=${connectorID}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response;
    } catch (error) {
      console.error('Fetch connector details error:', error);
      throw error;
    }
  }
}

export default ConnectionService;
