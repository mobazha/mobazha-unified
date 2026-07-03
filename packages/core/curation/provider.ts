import { getCurrentMarketplaceConfig } from '../services/api/marketplace';
import type { CurationConfig } from './types';
import { mapMarketplaceConfigToCuration } from './types';

export interface CurationProvider {
  getConfig(): Promise<CurationConfig>;
}

export class StaticCurationProvider implements CurationProvider {
  constructor(private readonly config: CurationConfig) {}

  async getConfig(): Promise<CurationConfig> {
    return this.config;
  }
}

export class ApiCurationProvider implements CurationProvider {
  constructor(private readonly load = getCurrentMarketplaceConfig) {}

  async getConfig(): Promise<CurationConfig> {
    const raw = await this.load();
    return mapMarketplaceConfigToCuration(raw);
  }
}
