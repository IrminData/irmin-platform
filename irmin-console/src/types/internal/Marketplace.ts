export interface MarketplacePlugin {
  id: number;
  name: string;
  provider: string;
  price: number;
  category: string;
  description?: string;
  connected: boolean;
}

export interface MarketplaceDataset {
  id: number;
  name: string;
  source: string;
  price: number;
  connected: boolean;
  industry: string;
  description: string;
}
