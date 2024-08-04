import { defaultLocale, Locale } from '@/dictionaries';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

class IrminAPI {
  private static instance: IrminAPI;
  private locale: Locale;
  private token: string;

  private constructor() {
    this.locale = defaultLocale;
    this.token = '';
  }

  public static getInstance(): IrminAPI {
    if (!IrminAPI.instance) {
      IrminAPI.instance = new IrminAPI();
    }
    return IrminAPI.instance;
  }

  public setProps(locale: Locale, apiToken: string): void {
    this.locale = locale;
    this.token = apiToken;
  }

  public async fetch(
    url: string,
    options: RequestInit
  ): Promise<IrminAPIResponse> {
    const api_base = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev';
    const next_base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

    // Use the token if it is set
    if (this.token && this.token.length > 0) {
      options.headers = {
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      };
    }

    // Fetch the Irmin API
    const response = await fetch(`${api_base}${url}`, {
      ...options,
      credentials: 'include', // Include credentials with every request
      headers: {
        Accept: 'application/json',
        'Accept-Language': this.locale, // Irmin API returns localized messages based on the Accept-Language header
        Referer: next_base,
        ...options.headers,
      },
    });

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }

    // Return the response as JSON
    return response.json();
  }
}

export default IrminAPI;
