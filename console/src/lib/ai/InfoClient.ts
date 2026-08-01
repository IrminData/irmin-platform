import {
  AIModelsResponseSchema,
  AIUserInfoResponseSchema,
  AIWorkspaceInfoResponseSchema,
} from '@/types/ai/responses';

import { BaseClient } from './BaseClient';

export class InfoClient extends BaseClient {
  async getUserInfo() {
    const response = await fetch(`${this.baseUrl}/api/info/user`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response, AIUserInfoResponseSchema);
  }

  async getWorkspaceInfo() {
    const response = await fetch(`${this.baseUrl}/api/info/workspace`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response, AIWorkspaceInfoResponseSchema);
  }

  async listModels() {
    const response = await fetch(`${this.baseUrl}/api/info/models`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response, AIModelsResponseSchema);
  }
}
