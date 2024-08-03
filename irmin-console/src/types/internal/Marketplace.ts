/**
 * Marketplace plugin type
 * @todo Needs to be removed and implemented in the API types
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
 * Marketplace dataRepo type
 * @todo Needs to be removed and implemented in the API types
 * @typeParam id - DataRepo ID
 * @typeParam name - DataRepo name
 * @typeParam source - DataRepo source
 * @typeParam price - DataRepo price
 * @typeParam connected - DataRepo connected status
 * @typeParam industry - DataRepo industry
 * @typeParam description - DataRepo description
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
