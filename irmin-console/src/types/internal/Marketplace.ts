/**
 * Marketplace plugin type
 * TODO: Needs to be removed and implemented in the API types
 * @typeParam id - Plugin ID
 * @typeParam name - Plugin name
 * @typeParam provider - Plugin provider
 * @typeParam price - Plugin price
 * @typeParam category - Plugin category
 * @typeParam description - Plugin description
 * @typeParam connected - Plugin connected status
 */
export interface MarketplacePlugin {
  id: number;
  name: string;
  provider: string;
  price: number;
  category: string;
  description?: string;
  connected: boolean;
}

/**
 * Marketplace dataset type
 * TODO: Needs to be removed and implemented in the API types
 * @typeParam id - Dataset ID
 * @typeParam name - Dataset name
 * @typeParam source - Dataset source
 * @typeParam price - Dataset price
 * @typeParam connected - Dataset connected status
 * @typeParam industry - Dataset industry
 * @typeParam description - Dataset description
 */
export interface MarketplaceDataset {
  id: number;
  name: string;
  source: string;
  price: number;
  connected: boolean;
  industry: string;
  description: string;
}
