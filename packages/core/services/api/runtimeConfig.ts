import { NODE_API } from '../../config/apiPaths';
import { mergeRuntimeConfig, type RuntimeConfig } from '../../config/runtimeConfig';
import { publicGet } from './helpers';

/** Refresh backend features and capabilities after the initial script bootstrap. */
export async function refreshRuntimeConfig(): Promise<RuntimeConfig> {
  const snapshot = await publicGet<RuntimeConfig>(NODE_API.RUNTIME_CONFIG);
  return mergeRuntimeConfig(snapshot);
}
