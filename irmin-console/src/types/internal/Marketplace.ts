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
 * Marketplace repository type
 * @todo Needs to be removed and implemented in the API types
 * @typeParam id - Repository ID
 * @typeParam name - Repository name
 * @typeParam source - Repository source
 * @typeParam price - Repository price
 * @typeParam connected - Repository connected status
 * @typeParam industry - Repository industry
 * @typeParam description - Repository description
 */
export interface MarketplaceRepository {
  id: number;
  name: string;
  source: string;
  price: number;
  connected: boolean;
  industry: string;
  description: string;
}
